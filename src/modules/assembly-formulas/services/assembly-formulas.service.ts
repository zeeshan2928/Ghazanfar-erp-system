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
  description: string | null;
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

  // Rename a model, or note what it is. The labels came straight off the source
  // spreadsheets ("1764 PC+1760 PC+2225 (7025CC)"), which describe the file, not
  // the product - only the user knows what the thing is actually called.
  async updateFormula(
    organizationId: number,
    id: number,
    dto: { label?: string; description?: string },
  ) {
    const existing = await this.prisma.assemblyFormula.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Assembly formula not found');

    const data: { label?: string; description?: string | null } = {};

    if (dto.label !== undefined) {
      const label = dto.label.trim();
      if (!label) throw new BadRequestException('Model name cannot be empty');
      // The label is the formula's identity (@@unique on org+label), so a clash
      // has to be refused rather than left to surface as a raw Prisma error.
      const clash = await this.prisma.assemblyFormula.findFirst({
        where: { organizationId, label, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new BadRequestException(`Another model is already called "${label}"`);
      data.label = label;
    }

    if (dto.description !== undefined) {
      const description = dto.description.trim();
      data.description = description.length > 0 ? description : null;
    }

    const updated = await this.prisma.assemblyFormula.update({
      where: { id },
      data,
      include: { lines: { include: { part: true } } },
    });
    return this.toView(updated);
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
      description: f.description ?? null,
      productCodes: f.productCodes,
      sourceFile: f.sourceFile,
      lines,
      totalCost: lines.reduce((sum, l) => sum + l.lineTotal, 0),
      updatedAt: f.updatedAt,
    };
  }
}
