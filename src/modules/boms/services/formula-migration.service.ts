import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BomsService, BomView } from './boms.service';
import { CreateBomDto } from '../dto/bom.dto';

// Migrates the LEGACY AssemblyFormula/AssemblyFormulaLine/AssemblyPart data
// (31 formulas, hardcoded to JUICER|BLENDER) into the new generic Bom system.
//
// This never touches the legacy tables - they keep serving the existing
// Assembly Cost Workbench and sales-analysis profit queries untouched. This
// service only READS them, and WRITES into the new Bom tables via the
// already-verified BomsService.create() (so cycle detection and validation
// are never duplicated).
//
// NEVER automatic. A formula's `label` and `productCodes` are BOM
// identifiers, not reliable product keys (per product_code_is_a_shelf_code -
// a shelf code like "176" spans ~48 unrelated products) - so the output
// product and every component must be a human-confirmed choice. This service
// only SUGGESTS candidates by normalized word overlap, to speed up the
// person doing the confirming; it never picks for them.

interface Candidate {
  productId: number;
  code: string;
  name: string;
  score: number;
}

export interface PendingFormulaLine {
  formulaLineId: number;
  partId: number;
  partName: string;
  quantity: number;
  unitCost: number;
  candidates: Candidate[];
  // The product whose name EXACTLY matches this part's, if any. This is the
  // only auto-link the migration trusts without a human - an exact match
  // cannot be the "wrong part". null means "no exact match; a dedicated
  // raw-material product will be CREATED for this part on migrate".
  suggestedComponent: { productId: number; code: string; name: string } | null;
}

export interface MigrationReportRow {
  formulaId: number;
  label: string;
  bomId: number | null;
  outputProductChosen: { productId: number; name: string; code: string } | null;
  // How strong the name match to the chosen output was (word-overlap count).
  // Low = worth a human double-check; surfaced so a weak best-guess is visible.
  outputScore: number | null;
  partsCreated: { partName: string; productId: number; code: string }[];
  skippedReason: string | null;
}

export interface PendingFormula {
  formulaId: number;
  label: string;
  family: string;
  productCodes: string[];
  sourceFile: string | null;
  outputCandidates: Candidate[];
  lines: PendingFormulaLine[];
}

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}

@Injectable()
export class FormulaMigrationService {
  constructor(
    private prisma: PrismaService,
    private bomsService: BomsService,
  ) {}

  // A formula counts as already-migrated if an ACTIVE Bom exists whose name
  // equals the formula's label - migrateOne() below always names the created
  // Bom after the source formula's label specifically so this check works,
  // without needing any new field on the legacy AssemblyFormula table.
  private async getMigratedLabels(organizationId: number): Promise<Set<string>> {
    const boms = await this.prisma.bom.findMany({
      where: { organizationId, isActive: true },
      select: { name: true },
    });
    return new Set(boms.map(b => b.name));
  }

  private scoreCandidates(query: string, products: { id: number; code: string; name: string }[], limit = 5): Candidate[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scored = products
      .map(p => {
        const nameTokens = new Set(tokenize(p.name));
        const score = queryTokens.filter(t => nameTokens.has(t)).length;
        return { productId: p.id, code: p.code, name: p.name, score };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }

  async listPending(organizationId: number): Promise<PendingFormula[]> {
    const [formulas, migratedLabels, products] = await Promise.all([
      this.prisma.assemblyFormula.findMany({
        where: { organizationId },
        include: { lines: { include: { part: true } } },
        orderBy: { label: 'asc' },
      }),
      this.getMigratedLabels(organizationId),
      this.prisma.product.findMany({
        where: { organizationId, isActive: true },
        select: { id: true, code: true, name: true },
      }),
    ]);

    const pending = formulas.filter(f => !migratedLabels.has(f.label));

    // Exact (case-insensitive) name -> product, for the trusted auto-link.
    const byExactName = new Map<string, { productId: number; code: string; name: string }>();
    for (const p of products) byExactName.set(p.name.trim().toLowerCase(), { productId: p.id, code: p.code, name: p.name });

    return pending.map(formula => {
      const outputQuery = [formula.label, ...formula.productCodes].join(' ');
      return {
        formulaId: formula.id,
        label: formula.label,
        family: formula.family,
        productCodes: formula.productCodes,
        sourceFile: formula.sourceFile,
        outputCandidates: this.scoreCandidates(outputQuery, products),
        lines: formula.lines.map(line => ({
          formulaLineId: line.id,
          partId: line.partId,
          partName: line.part.name,
          quantity: Number(line.quantity),
          unitCost: Number(line.part.unitCost),
          candidates: this.scoreCandidates(line.part.name, products),
          suggestedComponent: byExactName.get(line.part.name.trim().toLowerCase()) ?? null,
        })),
      };
    });
  }

  // Turn a legacy AssemblyPart into a real Product to link a recipe line to.
  // The ONLY safe auto-behaviour: reuse a product ONLY on an exact
  // (case-insensitive) name match; otherwise CREATE a dedicated RAW_MATERIAL
  // product that is a faithful copy of the part. A created product can never
  // be the "wrong part" (worst case a harmless duplicate); a fuzzy auto-link
  // to an existing product could deduct the wrong thing from stock forever -
  // which is exactly why migrateOne() never guesses. cost_price is Decimal:
  // pass a string, never a JS number (see the Product model comment).
  async findOrCreateComponentForPart(
    organizationId: number,
    part: { id: number; name: string; unitCost: unknown },
  ): Promise<{ productId: number; created: boolean; name: string; code: string }> {
    const existing = await this.prisma.product.findFirst({
      where: { organizationId, name: { equals: part.name, mode: 'insensitive' } },
      select: { id: true, name: true, code: true },
    });
    if (existing) {
      return { productId: existing.id, created: false, name: existing.name, code: existing.code };
    }

    // Product.code is globally @unique - derive a stable, traceable code from
    // the part id and only bump it in the (near-impossible) event of a clash
    // with a real shelf code.
    let code = `LEGACY-PART-${part.id}`;
    for (let attempt = 1; await this.prisma.product.findUnique({ where: { code }, select: { id: true } }); attempt++) {
      code = `LEGACY-PART-${part.id}-${attempt}`;
    }

    const created = await this.prisma.product.create({
      data: {
        organizationId,
        code,
        name: part.name,
        description: 'Created from legacy assembly part during recipe migration',
        cost_price: String(part.unitCost),
        productType: 'RAW_MATERIAL',
      },
      select: { id: true, name: true, code: true },
    });
    return { productId: created.id, created: true, name: created.name, code: created.code };
  }

  // Like migrateOne, but any line the caller did not explicitly map is
  // resolved through findOrCreateComponentForPart - so the mapping is ALWAYS
  // complete and the migration can always finish. The output product is still
  // the caller's decision (shelf-code ambiguity lives there - never guessed
  // here). Returns the created Bom plus the list of products it had to create.
  async migrateAssisted(
    organizationId: number,
    userId: number,
    formulaId: number,
    outputProductId: number,
    overrides: { formulaLineId: number; componentProductId: number }[] = [],
  ): Promise<{ bom: BomView; partsCreated: { partName: string; productId: number; code: string }[] }> {
    const formula = await this.prisma.assemblyFormula.findFirst({
      where: { id: formulaId, organizationId },
      include: { lines: { include: { part: true } } },
    });
    if (!formula) throw new NotFoundException('Formula not found');

    // Pre-check BEFORE creating any component products: if this output already
    // has an active recipe (a sibling formula got there first, or this one was
    // already migrated), bail now. Otherwise we'd create faithful part-products
    // and then throw inside migrateOne, leaving orphan products behind - and
    // making a re-run non-idempotent.
    const existingForOutput = await this.prisma.bom.findFirst({
      where: { organizationId, productId: outputProductId, isActive: true },
      select: { id: true },
    });
    if (existingForOutput) {
      throw new BadRequestException(
        `The chosen product already has an active recipe (Bom #${existingForOutput.id}). ` +
          `Migrate this formula to a different product, or edit that recipe instead.`,
      );
    }

    const overrideByLine = new Map(overrides.map(o => [o.formulaLineId, o.componentProductId]));
    const lineMappings: { formulaLineId: number; componentProductId: number }[] = [];
    const partsCreated: { partName: string; productId: number; code: string }[] = [];

    for (const line of formula.lines) {
      const override = overrideByLine.get(line.id);
      if (override) {
        lineMappings.push({ formulaLineId: line.id, componentProductId: override });
        continue;
      }
      const resolved = await this.findOrCreateComponentForPart(organizationId, line.part);
      lineMappings.push({ formulaLineId: line.id, componentProductId: resolved.productId });
      if (resolved.created) {
        partsCreated.push({ partName: line.part.name, productId: resolved.productId, code: resolved.code });
      }
    }

    const bom = await this.migrateOne(organizationId, userId, formulaId, outputProductId, lineMappings);
    return { bom, partsCreated };
  }

  // Best-guess bulk migration: for every pending formula, take its top output
  // candidate and let migrateAssisted create/link every component. This is the
  // "get them all in, review afterwards" path - it never blocks on an
  // unmappable line. It SKIPS (never crashes on) a formula with no output
  // candidate or whose chosen output already has an active recipe, reporting
  // why so nothing fails silently.
  async runAll(organizationId: number, userId: number): Promise<MigrationReportRow[]> {
    const pending = await this.listPending(organizationId);
    const report: MigrationReportRow[] = [];

    // One product can hold only one active recipe. Several legacy formulas
    // best-match the SAME product (e.g. many "White Body" variants top-match
    // "1760 White Body..."). So track which output products are already spoken
    // for - both those with a pre-existing recipe and those picked earlier in
    // this same pass - and walk each formula DOWN its candidate list to the
    // first still-free product, rather than colliding and skipping.
    const used = new Set<number>();
    const existing = await this.prisma.bom.findMany({
      where: { organizationId, isActive: true },
      select: { productId: true },
    });
    for (const b of existing) used.add(b.productId);

    for (const formula of pending) {
      const base: MigrationReportRow = {
        formulaId: formula.formulaId,
        label: formula.label,
        bomId: null,
        outputProductChosen: null,
        outputScore: null,
        partsCreated: [],
        skippedReason: null,
      };

      const chosen = formula.outputCandidates.find(c => !used.has(c.productId));
      if (!chosen) {
        report.push({
          ...base,
          skippedReason:
            'Every matching product already has a recipe - migrate this one by hand to a different product.',
        });
        continue;
      }

      try {
        const { bom, partsCreated } = await this.migrateAssisted(
          organizationId,
          userId,
          formula.formulaId,
          chosen.productId,
        );
        used.add(chosen.productId);
        report.push({
          ...base,
          bomId: bom.id,
          outputProductChosen: { productId: chosen.productId, name: chosen.name, code: chosen.code },
          outputScore: chosen.score,
          partsCreated,
        });
      } catch (e: any) {
        report.push({ ...base, skippedReason: e?.message ?? 'Migration failed for this formula.' });
      }
    }

    return report;
  }

  async migrateOne(
    organizationId: number,
    userId: number,
    formulaId: number,
    outputProductId: number,
    lineMappings: { formulaLineId: number; componentProductId: number }[],
  ): Promise<BomView> {
    const formula = await this.prisma.assemblyFormula.findFirst({
      where: { id: formulaId, organizationId },
      include: { lines: { include: { part: true } } },
    });
    if (!formula) throw new NotFoundException('Formula not found');

    const alreadyMigrated = await this.prisma.bom.findFirst({
      where: { organizationId, name: formula.label, isActive: true },
      select: { id: true },
    });
    if (alreadyMigrated) {
      throw new BadRequestException(`"${formula.label}" was already migrated (Bom #${alreadyMigrated.id})`);
    }

    // Every line must be mapped - a partial migration would silently produce
    // a recipe missing a component, which is worse than not migrating it.
    const mappingByLineId = new Map(lineMappings.map(m => [m.formulaLineId, m.componentProductId]));
    const missing = formula.lines.filter(l => !mappingByLineId.has(l.id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing a component mapping for ${missing.length} line(s) of "${formula.label}" - every part must be mapped before migrating.`,
      );
    }

    const dto: CreateBomDto = {
      productId: outputProductId,
      // Keep the source label as the Bom name - this is also how
      // getMigratedLabels() recognizes this formula as done on a future call.
      name: formula.label,
      notes: formula.sourceFile ? `Migrated from legacy formula (source: ${formula.sourceFile})` : 'Migrated from legacy assembly formula',
      lines: formula.lines.map(line => ({
        // The legacy data has no slot concept - the part's own name IS the
        // slot label, e.g. slotName="Motor 7025 Copper". The user can rename
        // slots later via a normal edit if they want generic slots instead.
        slotName: line.part.name,
        componentProductId: mappingByLineId.get(line.id)!,
        quantity: Number(line.quantity),
      })),
    };

    return this.bomsService.create(organizationId, userId, dto);
  }
}
