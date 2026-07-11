import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AssemblyFormulaParserService, ParsedFormula, AssemblyFamily } from './assembly-formula-parser.service';

export interface ImportResult {
  formulasProcessed: number;
  formulasCreated: number;
  formulasUpdated: number;
  partsCreated: number;
  partsWithPriceConflict: number;
  warnings: string[];
}

@Injectable()
export class AssemblyFormulaImportService {
  constructor(
    private prisma: PrismaService,
    private parser: AssemblyFormulaParserService,
  ) {}

  async importFromBuffer(
    organizationId: number,
    buffer: Buffer,
    fileName: string,
  ): Promise<ImportResult> {
    const parsed = this.parser.parse(buffer, fileName);
    return this.importFormulas(organizationId, parsed.formulas, fileName);
  }

  // Shared by the HTTP upload endpoint and the standalone bulk-import script.
  // `formulas` should already be in the intended precedence order (e.g. the
  // master file's models first, then dedicated per-model files) - for any
  // shared part seen at more than one price, the LAST occurrence wins as the
  // current unitCost and the part is flagged for review.
  async importFormulas(
    organizationId: number,
    formulas: ParsedFormula[],
    sourceFile: string,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      formulasProcessed: 0,
      formulasCreated: 0,
      formulasUpdated: 0,
      partsCreated: 0,
      partsWithPriceConflict: 0,
      warnings: [],
    };
    for (const f of formulas) f.warnings.forEach(w => result.warnings.push(w));

    // ---- Phase 1: build the shared parts catalog ----
    // Aggregate every distinct cost seen per (family, name), preserving the
    // order of appearance so "last wins" is deterministic. Seed each part's
    // history with its existing DB price too, so a later single-file upload
    // still detects a conflict against what's already stored.
    const seen = new Map<string, { family: AssemblyFamily; name: string; costs: number[] }>();
    const keyOf = (family: AssemblyFamily, name: string) => `${family}::${name}`;

    for (const formula of formulas) {
      for (const comp of formula.components) {
        const key = keyOf(formula.family, comp.name);
        if (!seen.has(key)) seen.set(key, { family: formula.family, name: comp.name, costs: [] });
        seen.get(key)!.costs.push(comp.cost);
      }
    }

    const partIdByKey = new Map<string, number>();

    for (const [key, info] of seen) {
      const existing = await this.prisma.assemblyPart.findUnique({
        where: {
          organizationId_family_name: {
            organizationId,
            family: info.family,
            name: info.name,
          },
        },
      });

      // Distinct prices = existing DB price (if any) + all seen this run.
      const allCosts = existing ? [Number(existing.unitCost), ...info.costs] : [...info.costs];
      const distinct = [...new Set(allCosts)];
      const finalCost = info.costs[info.costs.length - 1]; // last occurrence in this import wins
      const hadConflict = distinct.length > 1;
      const conflictNote = hadConflict
        ? `Seen at ${distinct.join(', ')} across sources - currently set to ${finalCost}. Review and confirm the correct current price.`
        : null;

      if (!existing) {
        const created = await this.prisma.assemblyPart.create({
          data: {
            organizationId,
            family: info.family,
            name: info.name,
            unitCost: finalCost,
            hadPriceConflict: hadConflict,
            conflictNote,
          },
        });
        partIdByKey.set(key, created.id);
        result.partsCreated++;
        if (hadConflict) result.partsWithPriceConflict++;
      } else {
        const updated = await this.prisma.assemblyPart.update({
          where: { id: existing.id },
          data: {
            unitCost: finalCost,
            // Sticky: once flagged, stays flagged until the user resolves it
            // via the normal edit path.
            hadPriceConflict: existing.hadPriceConflict || hadConflict,
            conflictNote: hadConflict ? conflictNote : existing.conflictNote,
          },
        });
        partIdByKey.set(key, updated.id);
        if (hadConflict) result.partsWithPriceConflict++;
      }
    }

    // ---- Phase 2: upsert formulas + rebuild their lines ----
    for (const formula of formulas) {
      result.formulasProcessed++;

      const existingFormula = await this.prisma.assemblyFormula.findUnique({
        where: { organizationId_label: { organizationId, label: formula.label } },
      });

      const saved = await this.prisma.assemblyFormula.upsert({
        where: { organizationId_label: { organizationId, label: formula.label } },
        create: {
          organizationId,
          family: formula.family,
          label: formula.label,
          productCodes: formula.productCodes,
          sourceFile,
        },
        update: {
          family: formula.family,
          productCodes: formula.productCodes,
          sourceFile,
        },
      });
      if (existingFormula) result.formulasUpdated++;
      else result.formulasCreated++;

      // Rebuild lines from scratch (idempotent re-import). Merge duplicate
      // part references within one formula into a summed quantity so the
      // (formulaId, partId) unique constraint holds.
      await this.prisma.assemblyFormulaLine.deleteMany({ where: { formulaId: saved.id } });

      const qtyByPartId = new Map<number, number>();
      for (const comp of formula.components) {
        const partId = partIdByKey.get(keyOf(formula.family, comp.name));
        if (partId === undefined) continue;
        qtyByPartId.set(partId, (qtyByPartId.get(partId) || 0) + 1);
      }

      if (qtyByPartId.size > 0) {
        await this.prisma.assemblyFormulaLine.createMany({
          data: [...qtyByPartId.entries()].map(([partId, quantity]) => ({
            formulaId: saved.id,
            partId,
            quantity,
          })),
        });
      }
    }

    return result;
  }
}
