import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

// Effective-dated cost history for a product (a "part"/component in a recipe).
//
// The contract, and why it is safe to add on top of everything already built:
//   - Product.cost_price is NEVER read differently by anyone else. It stays the
//     single "current cost". This service only keeps it in step with the
//     timeline (current cost = the latest entry effective on or before today).
//   - A deliberate price change INSERTS a dated row: the past is preserved, so
//     "what did this cost before 1 March?" is always answerable.
//   - Fixing a typo UPDATES the latest row in place: there was never a wrong
//     value worth keeping, so it must not fork the timeline into a lie.
//   - Manufacturing Orders keep their own frozen per-batch snapshots. Untouched.

// A date is treated at day granularity ("effective from this day"), so re-pricing
// the same part twice in one day replaces rather than piling up rows.
function toDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export interface CostHistoryRow {
  id: number;
  costPrice: number;
  effectiveFrom: Date;
  note: string | null;
  changedBy: string | null;
  isCurrent: boolean;
  createdAt: Date;
}

@Injectable()
export class ProductCostService {
  constructor(private prisma: PrismaService) {}

  private async requireProduct(organizationId: number, productId: number) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
      select: { id: true, name: true, code: true, cost_price: true },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  // The current cost = the latest entry whose effectiveFrom <= now. Future-dated
  // changes do not become "current" until their day arrives.
  private async currentEntry(organizationId: number, productId: number) {
    return this.prisma.productCostHistory.findFirst({
      where: { organizationId, productId, effectiveFrom: { lte: new Date() } },
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
    });
  }

  private async resyncCurrentCostPrice(organizationId: number, productId: number) {
    const cur = await this.currentEntry(organizationId, productId);
    if (cur) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { cost_price: cur.costPrice },
      });
    }
  }

  async getHistory(organizationId: number, productId: number): Promise<CostHistoryRow[]> {
    await this.requireProduct(organizationId, productId);
    const rows = await this.prisma.productCostHistory.findMany({
      where: { organizationId, productId },
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
    });
    const cur = await this.currentEntry(organizationId, productId);
    return rows.map(r => ({
      id: r.id,
      costPrice: Number(r.costPrice),
      effectiveFrom: r.effectiveFrom,
      note: r.note,
      changedBy: r.changedBy,
      isCurrent: cur ? r.id === cur.id : false,
      createdAt: r.createdAt,
    }));
  }

  // A genuine price change effective from a date. Same date as an existing entry
  // replaces it (you are restating that day's price, not adding a second one).
  async changeCost(
    organizationId: number,
    productId: number,
    costPrice: number,
    effectiveFrom: Date,
    note: string | null,
    changedBy: string | null,
  ) {
    await this.requireProduct(organizationId, productId);
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      throw new BadRequestException('cost must be a non-negative number');
    }
    if (isNaN(effectiveFrom.getTime())) throw new BadRequestException('invalid effective date');
    const day = toDay(effectiveFrom);

    const sameDay = await this.prisma.productCostHistory.findFirst({
      where: { organizationId, productId, effectiveFrom: day },
    });
    if (sameDay) {
      await this.prisma.productCostHistory.update({
        where: { id: sameDay.id },
        data: { costPrice, note, changedBy },
      });
    } else {
      await this.prisma.productCostHistory.create({
        data: { organizationId, productId, costPrice, effectiveFrom: day, note, changedBy },
      });
    }
    await this.resyncCurrentCostPrice(organizationId, productId);
    return this.getHistory(organizationId, productId);
  }

  // Fix a mistake in the most recent entry: change its value in place, no new
  // row. Use this when the number was simply wrong, not when the price changed.
  async correctLatest(
    organizationId: number,
    productId: number,
    costPrice: number,
    note: string | null,
    changedBy: string | null,
  ) {
    await this.requireProduct(organizationId, productId);
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      throw new BadRequestException('cost must be a non-negative number');
    }
    const latest = await this.prisma.productCostHistory.findFirst({
      where: { organizationId, productId },
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
    });
    if (!latest) throw new NotFoundException('No cost history to correct');
    await this.prisma.productCostHistory.update({
      where: { id: latest.id },
      data: {
        costPrice,
        note: note ?? latest.note,
        changedBy: changedBy ?? latest.changedBy,
      },
    });
    await this.resyncCurrentCostPrice(organizationId, productId);
    return this.getHistory(organizationId, productId);
  }

  // Remove an entry (e.g. a change entered against the wrong product). The
  // baseline is never left empty: deleting the last remaining row is refused.
  async deleteEntry(organizationId: number, productId: number, entryId: number) {
    await this.requireProduct(organizationId, productId);
    const count = await this.prisma.productCostHistory.count({ where: { organizationId, productId } });
    if (count <= 1) throw new BadRequestException('Cannot delete the only cost entry a product has');
    const entry = await this.prisma.productCostHistory.findFirst({
      where: { id: entryId, organizationId, productId },
    });
    if (!entry) throw new NotFoundException('Cost entry not found');
    await this.prisma.productCostHistory.delete({ where: { id: entryId } });
    await this.resyncCurrentCostPrice(organizationId, productId);
    return this.getHistory(organizationId, productId);
  }

  // The cost of one product on a given date: the latest entry effective on or
  // before it. If the date precedes every entry, the earliest known cost - the
  // best answer available rather than nothing.
  async costAsOf(organizationId: number, productId: number, date: Date): Promise<number | null> {
    const at = await this.prisma.productCostHistory.findFirst({
      where: { organizationId, productId, effectiveFrom: { lte: date } },
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
      select: { costPrice: true },
    });
    if (at) return Number(at.costPrice);
    const earliest = await this.prisma.productCostHistory.findFirst({
      where: { organizationId, productId },
      orderBy: [{ effectiveFrom: 'asc' }, { id: 'asc' }],
      select: { costPrice: true },
    });
    return earliest ? Number(earliest.costPrice) : null;
  }

  // What a recipe cost to build on a given date: each component priced as of that
  // date. This is the payoff - a recipe's historical cost stops drifting with
  // today's prices. Read-only; changes nothing about how live cost is computed.
  async bomCostAsOf(organizationId: number, bomId: number, date: Date) {
    const bom = await this.prisma.bom.findFirst({
      where: { id: bomId, organizationId },
      include: { lines: { include: { component: { select: { id: true, name: true } } } } },
    });
    if (!bom) throw new NotFoundException('Recipe not found');

    const lines = [];
    let total = 0;
    for (const l of bom.lines) {
      const unit = (await this.costAsOf(organizationId, l.componentProductId, date)) ?? 0;
      const qty = Number(l.quantity);
      const lineTotal = unit * qty;
      total += lineTotal;
      lines.push({
        slotName: l.slotName,
        component: l.component.name,
        quantity: qty,
        unitCostAsOf: unit,
        lineTotal,
      });
    }
    return { bomId, asOf: date, totalCost: total, lines };
  }

  // The component catalogue for the cost-history screen: products actually used
  // as recipe components, plus anything typed RAW_MATERIAL, with their current
  // cost and how many times it has changed. (Not all 2500+ products - only the
  // ones whose cost feeds a build.)
  async listComponents(organizationId: number, search?: string) {
    const usedIds = await this.prisma.bomLine.findMany({
      where: { bom: { organizationId } },
      select: { componentProductId: true },
      distinct: ['componentProductId'],
    });
    const idSet = usedIds.map(u => u.componentProductId);

    const products = await this.prisma.product.findMany({
      where: {
        organizationId,
        OR: [{ id: { in: idSet } }, { productType: 'RAW_MATERIAL' }],
      },
      select: { id: true, name: true, code: true, cost_price: true, productType: true },
      orderBy: { name: 'asc' },
    });

    const counts = await this.prisma.productCostHistory.groupBy({
      by: ['productId'],
      where: { organizationId, productId: { in: products.map(p => p.id) } },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map(c => [c.productId, c._count._all]));

    const tokens = (search ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = (p: { name: string; code: string }) =>
      tokens.length === 0 ||
      tokens.every(t => `${p.code} ${p.name}`.toLowerCase().includes(t));

    return products.filter(matches).map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      productType: p.productType,
      currentCost: Number(p.cost_price),
      changeCount: countMap.get(p.id) ?? 0,
    }));
  }
}
