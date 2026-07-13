import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { normalizeItemKey } from '@common/adaptive-import/item-key';

// Cost for the models we ASSEMBLE rather than buy.
//
// Such an item has no real purchase price to cost against - it appears in the
// purchase file only at price 0, because we never bought it, we built it. That
// is exactly the gap the BOM files fill: map the sold item to the formula that
// builds it, and its cost is derived live from the shared parts catalog (so
// re-pricing one part re-costs every model that uses it).
//
// The mapping is SUGGESTED, never auto-applied. BOM labels name model families
// ("White Body 7025 Copper") while sales names carry brand prefixes ("1818
// White Body 3in1 7025 Copper Philips"), so only the user can say which formula
// truly builds which product - same confirm-before-applying rule as Parts
// Review.

export interface AssembledCandidate {
  itemName: string;
  itemKey: string;
  transactionCount: number;
  totalRevenue: number;
  avgSalePrice: number;
  // Currently saved mapping, if any.
  formulaId: number | null;
  manualCost: number | null;
  resolvedCost: number | null;
  // Ranked BOM formulas that plausibly build this item.
  suggestions: { formulaId: number; label: string; family: string; cost: number; score: number }[];
}

export interface FormulaRow {
  id: number;
  label: string;
  family: string;
  productCodes: string[];
  cost: number;
}

@Injectable()
export class AssembledCostService {
  constructor(private prisma: PrismaService) {}

  // Every BOM formula with its cost derived from current shared part prices.
  async getFormulas(organizationId: number): Promise<FormulaRow[]> {
    const rows = await this.prisma.$queryRaw<
      { id: number; label: string; family: string; productCodes: string[]; cost: number }[]
    >`
      SELECT f.id, f.label, f.family::text AS family, f."productCodes",
             COALESCE(SUM(l.quantity * p."unitCost"), 0)::float8 AS cost
      FROM "AssemblyFormula" f
      LEFT JOIN "AssemblyFormulaLine" l ON l."formulaId" = f.id
      LEFT JOIN "AssemblyPart" p ON p.id = l."partId"
      WHERE f."organizationId" = ${organizationId}
      GROUP BY f.id, f.label, f.family, f."productCodes"
      ORDER BY f.family, f.label
    `;
    return rows.map(r => ({ ...r, cost: Number(r.cost) }));
  }

  // Model descriptors that actually distinguish one variant from another.
  // Bare brand words (Panasonic/Kenwood/National) are deliberately NOT scored -
  // the BOM is brand-agnostic; the same formula builds several brands.
  private static readonly DESCRIPTORS = [
    'copper', 'white', 'black', 'body', 'juicer', 'blender', 'glass', 'jar',
    'golden', 'jali', 'soft', 'classic', 'pure', '3in1', '4in1',
    // model-line prefixes, which the BOM labels use heavily
    // ("HS+MS+9900...", "KW 724+St 543+Mj 599", "GB ST 176")
    'hs', 'ms', 'kw', 'st', 'gb', 'mj', 'nd', 'amm', 'aam', 'pc',
  ];

  private tokens(s: string): Set<string> {
    const n = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    const keep = new Set<string>();
    for (const t of n.split(' ')) {
      if (!t) continue;
      // Model numbers carry the real signal, but they hide inside tokens like
      // "7025cc" / "7020CC" - a bare \d{4} test misses every one of them.
      const model = t.match(/\d{4}/g);
      if (model) for (const m of model) keep.add(m);
      if (AssembledCostService.DESCRIPTORS.includes(t)) keep.add(t);
    }
    return keep;
  }

  private leadingCode(itemName: string): string | null {
    const m = itemName.trim().match(/^(\d+)\b/);
    return m ? m[1] : null;
  }

  private score(itemName: string, f: FormulaRow): number {
    let score = 0;
    const code = this.leadingCode(itemName);
    // A formula that explicitly lists this item's code is a strong signal.
    if (code && f.productCodes.includes(code)) score += 10;

    const isBlender = /blender/i.test(itemName);
    const isJuicer = /juicer/i.test(itemName);
    if (isBlender && f.family === 'BLENDER') score += 4;
    if (isJuicer && f.family === 'JUICER') score += 4;
    // Wrong family is disqualifying, not merely unlikely.
    if (isBlender && f.family === 'JUICER') score -= 10;
    if (isJuicer && f.family === 'BLENDER') score -= 10;

    const a = this.tokens(itemName);
    const b = this.tokens(f.label);
    for (const t of a) if (b.has(t)) score += /^\d{4}$/.test(t) ? 3 : 1;

    // White body and black body are mutually exclusive builds, not shades of
    // the same one - a mismatch here is as wrong as suggesting a blender
    // formula for a juicer.
    const whiteItem = a.has('white');
    const blackItem = a.has('black');
    const whiteFormula = b.has('white');
    const blackFormula = b.has('black');
    if ((whiteItem && blackFormula) || (blackItem && whiteFormula)) score -= 6;

    return score;
  }

  // Items whose cost cannot come from the purchase file: either the purchase
  // file has them only at price 0 (assembled), or it doesn't have them at all.
  // These are precisely the items whose profit is otherwise unknowable.
  async getCandidates(organizationId: number): Promise<{ candidates: AssembledCandidate[]; mappedCount: number }> {
    const [items, formulas, existing] = await Promise.all([
      this.prisma.$queryRaw<
        { itemKey: string; itemName: string; n: number; revenue: number; avgPrice: number }[]
      >`
        SELECT s."itemKey",
               MIN(s."itemRaw")        AS "itemName",
               COUNT(*)::int           AS n,
               SUM(s."lineAmount")::float8 AS revenue,
               AVG(s."soldPrice")::float8  AS "avgPrice"
        FROM "SalesAnalysisRecord" s
        WHERE s."organizationId" = ${organizationId}
          AND s."itemKey" IS NOT NULL
          -- no usable purchase cost anywhere in the purchase file
          AND NOT EXISTS (
            SELECT 1 FROM "PurchaseAnalysisRecord" pr
            WHERE pr."organizationId" = s."organizationId"
              AND pr."itemKey" = s."itemKey"
              AND pr."purchasePrice" > 0
          )
        GROUP BY s."itemKey"
      `,
      this.getFormulas(organizationId),
      this.prisma.assembledItemCost.findMany({ where: { organizationId } }),
    ]);

    const byKey = new Map(existing.map(e => [e.itemKey, e]));
    const formulaCost = new Map(formulas.map(f => [f.id, f.cost]));

    const candidates: AssembledCandidate[] = items.map(it => {
      const saved = byKey.get(it.itemKey);
      const manualCost = saved?.manualCost != null ? Number(saved.manualCost) : null;
      const formulaId = saved?.formulaId ?? null;
      const resolvedCost =
        manualCost ?? (formulaId != null ? formulaCost.get(formulaId) ?? null : null);

      const suggestions = formulas
        .map(f => ({ formulaId: f.id, label: f.label, family: f.family, cost: f.cost, score: this.score(it.itemName, f) }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return {
        itemName: it.itemName,
        itemKey: it.itemKey,
        transactionCount: Number(it.n),
        totalRevenue: Number(it.revenue),
        avgSalePrice: Math.round(Number(it.avgPrice)),
        formulaId,
        manualCost,
        resolvedCost,
        suggestions,
      };
    });

    candidates.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return { candidates, mappedCount: candidates.filter(c => c.resolvedCost != null).length };
  }

  // Save the user's confirmed mapping. A null formulaId AND null manualCost
  // clears the mapping - the item goes back to "cost unknown" rather than
  // being quietly costed at zero.
  async saveMappings(
    organizationId: number,
    items: { itemName: string; formulaId?: number | null; manualCost?: number | null }[],
  ): Promise<{ saved: number }> {
    for (const it of items) {
      const itemKey = normalizeItemKey(it.itemName);
      if (!itemKey) continue;
      const formulaId = it.formulaId ?? null;
      const manualCost = it.manualCost ?? null;

      if (formulaId === null && manualCost === null) {
        await this.prisma.assembledItemCost.deleteMany({ where: { organizationId, itemKey } });
        continue;
      }
      await this.prisma.assembledItemCost.upsert({
        where: { organizationId_itemKey: { organizationId, itemKey } },
        create: { organizationId, itemKey, itemName: it.itemName, formulaId, manualCost },
        update: { itemName: it.itemName, formulaId, manualCost },
      });
    }
    return { saved: items.length };
  }

  // Rows whose stated total contradicts quantity x price - source-file typos
  // that silently distort revenue and margin. One such row (a microwave billed
  // at 20,721,600 instead of 14,400) overstated total sales by Rs 20.7m and
  // produced an impossible 82% margin on that product. Reported, never
  // auto-corrected: the file is the user's record, so they decide.
  async getDataAnomalies(organizationId: number) {
    // The headline count and net effect must come from EVERY anomalous row -
    // deriving them from the truncated list below would report the page size
    // (200) as the row count and omit the rows that pull the other way.
    const [totals, rows] = await Promise.all([
      this.prisma.$queryRaw<{ n: number; net: number }[]>`
        SELECT COUNT(*)::int AS n,
               COALESCE(SUM("lineAmount" - quantity * "soldPrice"), 0)::float8 AS net
        FROM "SalesAnalysisRecord"
        WHERE "organizationId" = ${organizationId}
          AND ABS("lineAmount" - quantity * "soldPrice") > 1000
          AND ABS("lineAmount" - quantity * "soldPrice") > 0.01 * ABS(NULLIF(quantity * "soldPrice", 0))
      `,
      this.prisma.$queryRaw<
        {
          billNumber: string;
          itemRaw: string;
          transactionDate: Date;
          quantity: number;
          soldPrice: number;
          lineAmount: number;
          expected: number;
          difference: number;
        }[]
      >`
        SELECT "billNumber", "itemRaw", "transactionDate",
               quantity::float8            AS quantity,
               "soldPrice"::float8         AS "soldPrice",
               "lineAmount"::float8        AS "lineAmount",
               (quantity * "soldPrice")::float8            AS expected,
               ("lineAmount" - quantity * "soldPrice")::float8 AS difference
        FROM "SalesAnalysisRecord"
        WHERE "organizationId" = ${organizationId}
          AND ABS("lineAmount" - quantity * "soldPrice") > 1000
          AND ABS("lineAmount" - quantity * "soldPrice") > 0.01 * ABS(NULLIF(quantity * "soldPrice", 0))
        ORDER BY ABS("lineAmount" - quantity * "soldPrice") DESC
        LIMIT 200
      `,
    ]);

    const items = rows.map(r => ({
      billNumber: r.billNumber,
      itemName: r.itemRaw,
      transactionDate: r.transactionDate,
      quantity: Number(r.quantity),
      soldPrice: Number(r.soldPrice),
      statedAmount: Number(r.lineAmount),
      expectedAmount: Number(r.expected),
      difference: Number(r.difference),
    }));
    return {
      anomalyCount: Number(totals[0]?.n || 0),
      netOverstatement: Number(totals[0]?.net || 0),
      items,
    };
  }
}
