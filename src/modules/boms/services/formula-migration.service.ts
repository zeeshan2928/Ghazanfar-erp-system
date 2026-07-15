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
        })),
      };
    });
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
