import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AssemblyFamily } from './assembly-formula-parser.service';

// A formula returned to the client, with its total DERIVED from current
// shared part prices (never a stored figure - that's what makes a part-price
// edit ripple into every formula that uses the part).
export interface FormulaLineView {
  partId: number;
  name: string;
  unitCost: number;
  quantity: number;
  lineTotal: number;
  hadPriceConflict: boolean;
}
export interface FormulaView {
  id: number;
  family: AssemblyFamily;
  label: string;
  productCodes: string[];
  sourceFile: string | null;
  lines: FormulaLineView[];
  totalCost: number;
  updatedAt: Date;
}

@Injectable()
export class AssemblyFormulasService {
  constructor(private prisma: PrismaService) {}

  async listParts(organizationId: number, family?: AssemblyFamily) {
    const parts = await this.prisma.assemblyPart.findMany({
      where: { organizationId, ...(family ? { family } : {}) },
      orderBy: [{ family: 'asc' }, { name: 'asc' }],
    });
    return parts.map(p => ({
      id: p.id,
      family: p.family,
      name: p.name,
      unitCost: Number(p.unitCost),
      hadPriceConflict: p.hadPriceConflict,
      conflictNote: p.conflictNote,
      updatedAt: p.updatedAt,
    }));
  }

  async listFormulas(organizationId: number, family?: AssemblyFamily): Promise<FormulaView[]> {
    const formulas = await this.prisma.assemblyFormula.findMany({
      where: { organizationId, ...(family ? { family } : {}) },
      orderBy: [{ family: 'asc' }, { label: 'asc' }],
      include: { lines: { include: { part: true } } },
    });
    return formulas.map(f => this.toView(f));
  }

  async getFormula(organizationId: number, id: number): Promise<FormulaView> {
    const f = await this.prisma.assemblyFormula.findFirst({
      where: { id, organizationId },
      include: { lines: { include: { part: true } } },
    });
    if (!f) throw new NotFoundException('Assembly formula not found');
    return this.toView(f);
  }

  // Update a single shared part's price - this is the "change one thing"
  // action; every formula using this part recomputes its total on next read.
  async updatePartCost(organizationId: number, partId: number, unitCost: number) {
    const part = await this.prisma.assemblyPart.findFirst({ where: { id: partId, organizationId } });
    if (!part) throw new NotFoundException('Part not found');
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new BadRequestException('unitCost must be a non-negative number');
    }
    const updated = await this.prisma.assemblyPart.update({
      where: { id: partId },
      // Editing the price is how the user resolves a flagged conflict, so
      // clear the flag on an explicit manual set.
      data: { unitCost, hadPriceConflict: false, conflictNote: null },
    });
    return {
      id: updated.id,
      name: updated.name,
      family: updated.family,
      unitCost: Number(updated.unitCost),
      hadPriceConflict: updated.hadPriceConflict,
    };
  }

  private toView(f: any): FormulaView {
    const lines: FormulaLineView[] = f.lines.map((l: any) => {
      const unitCost = Number(l.part.unitCost);
      const quantity = Number(l.quantity);
      return {
        partId: l.partId,
        name: l.part.name,
        unitCost,
        quantity,
        lineTotal: unitCost * quantity,
        hadPriceConflict: l.part.hadPriceConflict,
      };
    });
    return {
      id: f.id,
      family: f.family,
      label: f.label,
      productCodes: f.productCodes,
      sourceFile: f.sourceFile,
      lines,
      totalCost: lines.reduce((sum, l) => sum + l.lineTotal, 0),
      updatedAt: f.updatedAt,
    };
  }
}
