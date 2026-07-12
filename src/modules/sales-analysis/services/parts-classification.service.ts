import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

// Component keywords the parts pre-flagger looks for (word-boundary match),
// drawn from the BOM component vocabulary + the user's own examples. Kept
// deliberately SPECIFIC to avoid flagging genuine appliances: the bare words
// "iron" (clothes irons), "masala" (Masala Grinder), "jali"/"body" (juicer
// bodies), "box" mid-name ("... Box Heater") are all genuine products, so
// they are NOT here. "box" is handled separately, start-anchored (packaging
// boxes begin with "Box ...", whereas "ADS Box Heater" does not).
const PART_KEYWORDS = [
  'handle', 'thermostat', 'thermostate', 'nut', 'washer', 'kaim', 'pech',
  'garari', 'fiber', 'phool', 'thermopore', 'catton', 'gata', 'chori', 'malta',
  'blade jug', 'blade masala', 'body pech', 'iron u', 'iron thermostat',
];

export interface PartCandidate {
  itemName: string;
  transactionCount: number;
  totalRevenue: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  suggestedKind: 'PART' | 'SALE';
  confirmedKind: 'PART' | 'SALE' | null;
}

@Injectable()
export class PartsClassificationService {
  constructor(private prisma: PrismaService) {}

  private norm(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

  // Suggest PART when the item name contains a component keyword as a word, or
  // its normalized name matches a known BOM AssemblyPart name.
  private isSuggestedPart(itemName: string, partNameSet: Set<string>): boolean {
    const n = this.norm(itemName);
    if (partNameSet.has(n)) return true; // exact BOM component name
    if (n === 'box' || n.startsWith('box ')) return true; // packaging boxes (start-anchored)
    return PART_KEYWORDS.some(kw => new RegExp(`(^| )${kw}( |$)`).test(n));
  }

  async getCandidates(organizationId: number): Promise<{ candidates: PartCandidate[]; suggestedPartCount: number }> {
    const [items, assemblyParts, classifications] = await Promise.all([
      this.prisma.$queryRaw<{ itemRaw: string; n: number; revenue: number; avg: number; min: number; max: number }[]>`
        SELECT "itemRaw",
               COUNT(*)::int AS n,
               SUM("lineAmount")::float8 AS revenue,
               AVG("soldPrice")::float8 AS avg,
               MIN("soldPrice")::float8 AS min,
               MAX("soldPrice")::float8 AS max
        FROM "SalesAnalysisRecord"
        WHERE "organizationId" = ${organizationId}
        GROUP BY "itemRaw"
      `,
      this.prisma.assemblyPart.findMany({ where: { organizationId }, select: { name: true } }),
      this.prisma.salesItemClassification.findMany({ where: { organizationId } }),
    ]);

    const partNameSet = new Set(assemblyParts.map(p => this.norm(p.name)));
    const classMap = new Map(classifications.map(c => [c.itemName, c.kind as 'PART' | 'SALE']));

    let suggestedPartCount = 0;
    const candidates: PartCandidate[] = items.map(it => {
      const confirmedKind = classMap.get(it.itemRaw) ?? null;
      const suggestedKind = this.isSuggestedPart(it.itemRaw, partNameSet) ? 'PART' : 'SALE';
      if ((confirmedKind ?? suggestedKind) === 'PART') suggestedPartCount++;
      return {
        itemName: it.itemRaw,
        transactionCount: Number(it.n),
        totalRevenue: Number(it.revenue),
        avgPrice: Math.round(Number(it.avg)),
        minPrice: Number(it.min),
        maxPrice: Number(it.max),
        suggestedKind,
        confirmedKind,
      };
    });

    // Include classified item names that aren't in the current sales data -
    // e.g. products the user added manually to exclude from FUTURE imports.
    // They persist visibly (with zero current stats) so they can be managed.
    const dataItemNames = new Set(items.map(it => it.itemRaw));
    for (const c of classifications) {
      if (dataItemNames.has(c.itemName)) continue;
      const kind = c.kind as 'PART' | 'SALE';
      if (kind === 'PART') suggestedPartCount++;
      candidates.push({
        itemName: c.itemName,
        transactionCount: 0,
        totalRevenue: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        suggestedKind: kind,
        confirmedKind: kind,
      });
    }

    candidates.sort((a, b) => b.transactionCount - a.transactionCount);
    return { candidates, suggestedPartCount };
  }

  async saveClassifications(organizationId: number, items: { itemName: string; kind: 'PART' | 'SALE' }[]): Promise<{ saved: number }> {
    for (const it of items) {
      await this.prisma.salesItemClassification.upsert({
        where: { organizationId_itemName: { organizationId, itemName: it.itemName } },
        create: { organizationId, itemName: it.itemName, kind: it.kind },
        update: { kind: it.kind },
      });
    }
    return { saved: items.length };
  }

  // The confirmed PART item names - callers exclude these from genuine sales.
  async getPartNames(organizationId: number): Promise<string[]> {
    const parts = await this.prisma.salesItemClassification.findMany({
      where: { organizationId, kind: 'PART' },
      select: { itemName: true },
    });
    return parts.map(p => p.itemName);
  }

  // Separate report for the excluded parts: what value of vendor-supplied
  // components sits inside the raw sales data (subtracted from genuine sales).
  async getPartsReport(organizationId: number, from: Date, to: Date) {
    const partNames = await this.getPartNames(organizationId);
    if (partNames.length === 0) {
      return { period: { from, to }, totalPartsValue: 0, totalPartsQuantity: 0, items: [] };
    }
    const rows = await this.prisma.salesAnalysisRecord.groupBy({
      by: ['itemRaw'],
      where: { organizationId, transactionDate: { gte: from, lte: to }, itemRaw: { in: partNames } },
      _sum: { lineAmount: true, quantity: true },
      _count: { _all: true },
    });
    const items = rows
      .map(r => ({
        itemName: r.itemRaw,
        totalValue: Number(r._sum.lineAmount || 0),
        totalQuantity: Number(r._sum.quantity || 0),
        transactionCount: r._count._all,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
    return {
      period: { from, to },
      totalPartsValue: items.reduce((s, i) => s + i.totalValue, 0),
      totalPartsQuantity: items.reduce((s, i) => s + i.totalQuantity, 0),
      items,
    };
  }
}
