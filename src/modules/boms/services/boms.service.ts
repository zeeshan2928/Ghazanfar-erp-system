import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { BomSearchDto, CreateBomDto, UpdateBomDto } from '../dto/bom.dto';

// Hard backstop against a cycle that somehow evaded save-time detection (e.g.
// data edited directly in the DB). Real recipes are a handful of levels deep;
// this only ever fires on a bug, and fails loudly instead of hanging the
// server on a self-referencing graph.
const MAX_BOM_DEPTH = 10;

export interface BomLineView {
  id: number;
  slotName: string;
  componentProductId: number;
  componentName: string;
  componentCode: string;
  quantity: number;
  unitCost: number;
  lineCost: number;
  alternates: { productId: number; name: string; code: string }[];
}

export interface BomView {
  id: number;
  organizationId: number;
  productId: number;
  productName: string;
  productCode: string;
  name: string;
  version: number;
  outputQuantity: number;
  isActive: boolean;
  notes: string | null;
  lines: BomLineView[];
  totalCost: number;
  costPerUnit: number;
  updatedAt: Date;
}

@Injectable()
export class BomsService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
  ) {}

  // ---------------------------------------------------------------------
  // CREATE — a product may only have one active recipe at a time. Adding a
  // second recipe for a product that already has one is almost always a
  // mistake (the user wanted a new VERSION of the existing recipe, not a
  // second independent one) - so this rejects it and points at the right call.
  // ---------------------------------------------------------------------
  async create(organizationId: number, userId: number, dto: CreateBomDto): Promise<BomView> {
    await this.assertProductExists(organizationId, dto.productId);
    await this.assertComponentsExist(organizationId, dto.lines);

    const existingActive = await this.prisma.bom.findFirst({
      where: { organizationId, productId: dto.productId, isActive: true },
      select: { id: true },
    });
    if (existingActive) {
      throw new BadRequestException(
        `This product already has an active recipe (id ${existingActive.id}). ` +
          `Use POST /boms/${existingActive.id}/new-version to change it instead of creating a second one.`,
      );
    }

    await this.assertNoCycle(organizationId, dto.productId, dto.lines);

    const bom = await this.transactionService.run(async tx => {
      const created = await tx.bom.create({
        data: {
          organizationId,
          productId: dto.productId,
          name: dto.name,
          version: 1,
          outputQuantity: dto.outputQuantity ?? 1,
          notes: dto.notes,
          isActive: true,
        },
      });

      await this.writeLines(tx, created.id, dto.lines);
      return created;
    });

    return this.getById(organizationId, bom.id);
  }

  // ---------------------------------------------------------------------
  // IN-PLACE EDIT — replaces this Bom row's lines. Does NOT bump version.
  // Use new-version first if past batches must keep the old recipe.
  // ---------------------------------------------------------------------
  async update(organizationId: number, id: number, dto: UpdateBomDto): Promise<BomView> {
    const existing = await this.mustFind(organizationId, id);

    if (dto.lines) {
      await this.assertComponentsExist(organizationId, dto.lines);
      await this.assertNoCycle(organizationId, existing.productId, dto.lines, id);
    }

    await this.transactionService.run(async tx => {
      await tx.bom.update({
        where: { id },
        data: {
          name: dto.name,
          outputQuantity: dto.outputQuantity,
          notes: dto.notes,
        },
      });

      if (dto.lines) {
        await tx.bomLine.deleteMany({ where: { bomId: id } });
        await this.writeLines(tx, id, dto.lines);
      }
    });

    return this.getById(organizationId, id);
  }

  // ---------------------------------------------------------------------
  // NEW VERSION — deep-clones the active recipe's lines into a fresh Bom row
  // at version+1, deactivates the source. Manufacturing orders (Phase 2) pin
  // a bomId, so anything already built against the old version keeps its
  // exact recipe and cost forever - only new builds see the new version.
  // ---------------------------------------------------------------------
  async createNewVersion(organizationId: number, id: number, userId: number): Promise<BomView> {
    const source = await this.prisma.bom.findFirst({
      where: { id, organizationId },
      include: { lines: { include: { alternates: true } } },
    });
    if (!source) throw new NotFoundException('Recipe not found');
    if (!source.isActive) {
      throw new BadRequestException('Only the active version can be used as the base for a new version');
    }

    const maxVersion = await this.prisma.bom.aggregate({
      where: { organizationId, productId: source.productId },
      _max: { version: true },
    });
    const nextVersion = (maxVersion._max.version ?? source.version) + 1;

    const created = await this.transactionService.run(async tx => {
      await tx.bom.update({ where: { id: source.id }, data: { isActive: false } });

      const clone = await tx.bom.create({
        data: {
          organizationId,
          productId: source.productId,
          name: source.name,
          version: nextVersion,
          outputQuantity: source.outputQuantity,
          notes: source.notes,
          isActive: true,
        },
      });

      for (const line of source.lines) {
        const newLine = await tx.bomLine.create({
          data: {
            bomId: clone.id,
            sequence: line.sequence,
            slotName: line.slotName,
            componentProductId: line.componentProductId,
            quantity: line.quantity,
          },
        });
        if (line.alternates.length) {
          await tx.bomLineAlternate.createMany({
            data: line.alternates.map(a => ({ bomLineId: newLine.id, productId: a.productId })),
          });
        }
      }

      return clone;
    });

    return this.getById(organizationId, created.id);
  }

  // Soft-disable only - the deletion policy here is explicit: nothing is ever
  // hard-deleted without direct permission. A deactivated recipe still exists
  // for history/audit; it just stops being the one Phase 2 builds against.
  async deactivate(organizationId: number, id: number): Promise<void> {
    await this.mustFind(organizationId, id);
    await this.prisma.bom.update({ where: { id }, data: { isActive: false } });
  }

  async getById(organizationId: number, id: number): Promise<BomView> {
    const bom = await this.prisma.bom.findFirst({
      where: { id, organizationId },
      include: {
        product: { select: { name: true, code: true } },
        lines: {
          orderBy: { sequence: 'asc' },
          include: {
            component: { select: { name: true, code: true, cost_price: true, productType: true } },
            alternates: { include: { product: { select: { name: true, code: true } } } },
          },
        },
      },
    });
    if (!bom) throw new NotFoundException('Recipe not found');

    return this.toView(organizationId, bom);
  }

  async getActiveForProduct(organizationId: number, productId: number): Promise<BomView | null> {
    const bom = await this.prisma.bom.findFirst({
      where: { organizationId, productId, isActive: true },
      select: { id: true },
    });
    if (!bom) return null;
    return this.getById(organizationId, bom.id);
  }

  async search(organizationId: number, dto: BomSearchDto) {
    const skip = dto.skip ?? 0;
    const take = dto.take ?? 20;

    const where: Prisma.BomWhereInput = {
      organizationId,
      ...(dto.productId ? { productId: dto.productId } : {}),
      ...(dto.search
        ? {
            OR: [
              { name: { contains: dto.search, mode: 'insensitive' } },
              { product: { name: { contains: dto.search, mode: 'insensitive' } } },
              { product: { code: { contains: dto.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.bom.findMany({
        where,
        skip,
        take,
        orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
        include: { product: { select: { name: true, code: true } } },
      }),
      this.prisma.bom.count({ where }),
    ]);

    return {
      data: rows.map(b => ({
        id: b.id,
        productId: b.productId,
        productName: b.product.name,
        productCode: b.product.code,
        name: b.name,
        version: b.version,
        isActive: b.isActive,
        updatedAt: b.updatedAt,
      })),
      total,
      skip,
      take,
    };
  }

  // "Which products use this part?" - the direct answer to "the motor price
  // went up, what does it affect?" Scoped to ACTIVE recipes only - that is
  // current exposure, not history.
  async whereUsed(organizationId: number, componentProductId: number) {
    const [asComponent, asAlternate] = await Promise.all([
      this.prisma.bomLine.findMany({
        where: { componentProductId, bom: { organizationId, isActive: true } },
        include: { bom: { include: { product: { select: { name: true, code: true } } } } },
      }),
      this.prisma.bomLineAlternate.findMany({
        where: { productId: componentProductId, bomLine: { bom: { organizationId, isActive: true } } },
        include: {
          bomLine: { include: { bom: { include: { product: { select: { name: true, code: true } } } } } },
        },
      }),
    ]);

    const results: { bomId: number; productId: number; productName: string; productCode: string; bomName: string; slotName: string; role: 'chosen' | 'alternate' }[] = [];

    for (const line of asComponent) {
      results.push({
        bomId: line.bomId,
        productId: line.bom.productId,
        productName: line.bom.product.name,
        productCode: line.bom.product.code,
        bomName: line.bom.name,
        slotName: line.slotName,
        role: 'chosen',
      });
    }
    for (const alt of asAlternate) {
      const line = alt.bomLine;
      results.push({
        bomId: line.bomId,
        productId: line.bom.productId,
        productName: line.bom.product.name,
        productCode: line.bom.product.code,
        bomName: line.bom.name,
        slotName: line.slotName,
        role: 'alternate',
      });
    }

    return results;
  }

  // ---------------------------------------------------------------------
  // COST ROLL-UP — recursive, with two independent safety nets against a
  // cycle: `visited` tracks the current ANCESTOR PATH (a fresh copy per
  // branch, so the same part re-used in two different branches is fine -
  // only a true revisit within one path is a cycle), and `memo` caches
  // finished results across branches for reuse (cost is path-independent
  // once a branch is proven cycle-free, so memoizing after the fact is safe).
  // ---------------------------------------------------------------------
  async getCost(
    organizationId: number,
    productId: number,
    memo: Map<number, number> = new Map(),
    visited: Set<number> = new Set(),
  ): Promise<number> {
    if (memo.has(productId)) return memo.get(productId)!;

    if (visited.has(productId)) {
      throw new BadRequestException(
        `Cycle detected while costing product ${productId} - this should have been rejected at save time`,
      );
    }
    if (visited.size >= MAX_BOM_DEPTH) {
      throw new BadRequestException(
        `Recipe depth exceeded ${MAX_BOM_DEPTH} levels while costing product ${productId} - possible undetected cycle`,
      );
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
      select: { cost_price: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const bom = await this.prisma.bom.findFirst({
      where: { organizationId, productId, isActive: true },
      include: { lines: true },
    });

    // No recipe -> this is a leaf (RAW_MATERIAL, SERVICE, or a FINISHED_GOOD
    // you buy as-is). Its own cost_price IS the cost. This is also the escape
    // hatch that makes an ASSEMBLED_GOOD with no recipe yet just cost 0
    // rather than error - useful mid-setup, before every recipe exists.
    if (!bom || bom.lines.length === 0) {
      const cost = Number(product.cost_price);
      memo.set(productId, cost);
      return cost;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(productId);

    let total = 0;
    for (const line of bom.lines) {
      const unitCost = await this.getCost(organizationId, line.componentProductId, memo, nextVisited);
      total += Number(line.quantity) * unitCost;
    }

    const perUnit = total / Number(bom.outputQuantity);
    memo.set(productId, perUnit);
    return perUnit;
  }

  // ---------------------------------------------------------------------
  // internals
  // ---------------------------------------------------------------------

  private async mustFind(organizationId: number, id: number) {
    const bom = await this.prisma.bom.findFirst({ where: { id, organizationId } });
    if (!bom) throw new NotFoundException('Recipe not found');
    return bom;
  }

  private async assertProductExists(organizationId: number, productId: number) {
    const exists = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Product ${productId} not found`);
  }

  // Every component (and every alternate) named in a recipe must be a real
  // product. Never auto-create one here - a wrong or typo'd link would
  // deduct the wrong part from stock forever once Phase 2 exists.
  private async assertComponentsExist(
    organizationId: number,
    lines: { componentProductId: number; alternates?: { productId: number }[] }[],
  ) {
    const ids = new Set<number>();
    for (const line of lines) {
      ids.add(line.componentProductId);
      for (const alt of line.alternates ?? []) ids.add(alt.productId);
    }

    const found = await this.prisma.product.findMany({
      where: { organizationId, id: { in: Array.from(ids) } },
      select: { id: true },
    });
    const foundIds = new Set(found.map(f => f.id));
    const missing = Array.from(ids).filter(id => !foundIds.has(id));
    if (missing.length) {
      throw new BadRequestException(`These product IDs do not exist: ${missing.join(', ')}`);
    }
  }

  private async writeLines(
    tx: Prisma.TransactionClient,
    bomId: number,
    lines: CreateBomDto['lines'],
  ) {
    let sequence = 0;
    for (const line of lines) {
      const created = await tx.bomLine.create({
        data: {
          bomId,
          sequence: sequence++,
          slotName: line.slotName,
          componentProductId: line.componentProductId,
          quantity: line.quantity,
        },
      });
      if (line.alternates?.length) {
        await tx.bomLineAlternate.createMany({
          data: line.alternates.map(a => ({ bomLineId: created.id, productId: a.productId })),
        });
      }
    }
  }

  // Builds the graph of every ACTIVE recipe's edges (product -> component/
  // alternate), overlays the proposed edges for the recipe being saved, then
  // checks whether the recipe's own output product can reach itself. Only
  // this one node's edges changed, so checking reachability from it alone is
  // sufficient - nothing else in the graph moved.
  private async assertNoCycle(
    organizationId: number,
    outputProductId: number,
    lines: { componentProductId: number; alternates?: { productId: number }[] }[],
    excludeBomId?: number,
  ) {
    const activeBoms = await this.prisma.bom.findMany({
      where: { organizationId, isActive: true, ...(excludeBomId ? { id: { not: excludeBomId } } : {}) },
      select: {
        productId: true,
        lines: { select: { componentProductId: true, alternates: { select: { productId: true } } } },
      },
    });

    const graph = new Map<number, Set<number>>();
    for (const bom of activeBoms) {
      const set = graph.get(bom.productId) ?? new Set<number>();
      for (const line of bom.lines) {
        set.add(line.componentProductId);
        for (const alt of line.alternates) set.add(alt.productId);
      }
      graph.set(bom.productId, set);
    }

    const proposed = new Set<number>();
    for (const line of lines) {
      proposed.add(line.componentProductId);
      for (const alt of line.alternates ?? []) proposed.add(alt.productId);
    }
    graph.set(outputProductId, proposed);

    const cyclePath = this.findPathBackToStart(graph, outputProductId);
    if (cyclePath) {
      const names = await this.prisma.product.findMany({
        where: { id: { in: cyclePath } },
        select: { id: true, name: true },
      });
      const nameOf = new Map(names.map(n => [n.id, n.name]));
      const readable = cyclePath.map(id => nameOf.get(id) ?? `#${id}`).join(' -> ');
      throw new BadRequestException(
        `This recipe would create a loop and can't be saved: ${readable}. ` +
          `A recipe can never (even indirectly) contain the product it makes.`,
      );
    }
  }

  private findPathBackToStart(graph: Map<number, Set<number>>, start: number): number[] | null {
    const dfs = (node: number, path: number[], onPath: Set<number>): number[] | null => {
      if (path.length > MAX_BOM_DEPTH) return null;
      const neighbors = graph.get(node);
      if (!neighbors) return null;

      for (const next of neighbors) {
        if (next === start) return [...path, next];
        if (onPath.has(next)) continue; // a cycle elsewhere, unrelated to `start` - not our concern here
        onPath.add(next);
        const found = dfs(next, [...path, next], onPath);
        onPath.delete(next);
        if (found) return found;
      }
      return null;
    };

    return dfs(start, [start], new Set([start]));
  }

  private async toView(organizationId: number, bom: any): Promise<BomView> {
    const memo = new Map<number, number>();
    const lines: BomLineView[] = [];
    let totalCost = 0;

    for (const line of bom.lines) {
      const unitCost = await this.getCost(organizationId, line.componentProductId, memo);
      const quantity = Number(line.quantity);
      const lineCost = quantity * unitCost;
      totalCost += lineCost;

      lines.push({
        id: line.id,
        slotName: line.slotName,
        componentProductId: line.componentProductId,
        componentName: line.component.name,
        componentCode: line.component.code,
        quantity,
        unitCost,
        lineCost,
        alternates: line.alternates.map((a: any) => ({
          productId: a.productId,
          name: a.product.name,
          code: a.product.code,
        })),
      });
    }

    const outputQuantity = Number(bom.outputQuantity);

    return {
      id: bom.id,
      organizationId,
      productId: bom.productId,
      productName: bom.product.name,
      productCode: bom.product.code,
      name: bom.name,
      version: bom.version,
      outputQuantity,
      isActive: bom.isActive,
      notes: bom.notes,
      lines,
      totalCost,
      costPerUnit: totalCost / outputQuantity,
      updatedAt: bom.updatedAt,
    };
  }
}
