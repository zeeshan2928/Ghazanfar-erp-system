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
  category: string | null;
  brand: string | null;
  transactionCount: number;
  unitsSold: number;
  totalRevenue: number;
  avgSalePrice: number;
  // Currently saved mapping, if any. This is the user's confirmed truth and
  // always wins over anything assessed below.
  formulaId: number | null;
  manualCost: number | null;
  resolvedCost: number | null;
  // --- The cost WE assess, for the user to verify against ---
  // Two independent estimates are offered rather than one, because they
  // cross-check each other: a BOM cost is what the parts physically add up to,
  // a peer cost is what comparable products in the same category actually earn.
  // When they agree, the number is trustworthy; when they diverge, that
  // divergence is itself the signal the user needs to see.
  bomCost: number | null;
  bomLabel: string | null;
  peerCost: number | null;
  peerNote: string | null;
  assessedCost: number | null;
  assessedBasis: 'BOM' | 'CATEGORY_BRAND_PEER' | 'CATEGORY_PEER' | null;
  assessedNote: string | null;
  assessedConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  // Profit implied by the cost in force (verified if set, else assessed).
  // This is what the list is ranked by, so the biggest money sits at the top.
  estimatedProfit: number | null;
  estimatedMarginPercent: number | null;
  // Ranked BOM formulas that plausibly build this item.
  suggestions: { formulaId: number; label: string; family: string; cost: number; score: number }[];
}

interface PeerMargin {
  level: 'CATEGORY_BRAND' | 'CATEGORY' | 'ALL';
  category: string | null;
  brand: string | null;
  n: number;
  medianMargin: number;
}

// A BOM formula may only be used as a product's assessed cost if it matched on
// something that actually identifies the model - its product code (+10) or a
// model number like 7020/7025 (+3 each) - not merely on the word "blender",
// which the family bonus alone (+4) would grant. Without this floor, the 7020
// blender formula (cost 1,817) was being proposed as the cost of a "Desi
// Commercial Blender" selling at 7,000, and of an Anex HAND blender - products
// those formulas plainly do not build.
const MIN_BOM_SCORE_TO_COST = 7;

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

  // What comparable products in the same category actually earn, measured from
  // items whose cost IS known. This turns "we have no idea what this costs" into
  // a defensible number: a juicer whose peers run a 4.7% median margin and sells
  // for 3,501 very likely cost about 3,337. Medians (not means) so one mispriced
  // outlier cannot drag a whole category.
  private async getPeerMargins(organizationId: number): Promise<PeerMargin[]> {
    const rows = await this.prisma.$queryRaw<
      { level: string; category: string | null; brand: string | null; n: number; medianMargin: number }[]
    >`
      WITH resolved AS (
        SELECT s.category, s.brand, s."itemKey", s.quantity, s."lineAmount",
               COALESCE(prior.cost, later.cost) AS cost
        FROM "SalesAnalysisRecord" s
        LEFT JOIN LATERAL (
          SELECT pr."purchasePrice" AS cost FROM "PurchaseAnalysisRecord" pr
          WHERE pr."organizationId" = s."organizationId" AND pr."itemKey" = s."itemKey"
            AND pr."purchasePrice" > 0 AND pr."transactionDate" <= s."transactionDate"
          ORDER BY pr."transactionDate" DESC LIMIT 1
        ) prior ON true
        LEFT JOIN LATERAL (
          SELECT pr."purchasePrice" AS cost FROM "PurchaseAnalysisRecord" pr
          WHERE pr."organizationId" = s."organizationId" AND pr."itemKey" = s."itemKey"
            AND pr."purchasePrice" > 0
          ORDER BY pr."transactionDate" ASC LIMIT 1
        ) later ON true
        WHERE s."organizationId" = ${organizationId}
      ),
      per_item AS (
        SELECT category, brand, "itemKey",
               SUM("lineAmount") AS rev,
               SUM(cost * quantity) AS cogs
        FROM resolved
        WHERE cost IS NOT NULL AND "lineAmount" > 0
        GROUP BY category, brand, "itemKey"
        HAVING SUM("lineAmount") > 0
      )
      SELECT 'CATEGORY_BRAND' AS level, category, brand, COUNT(*)::int AS n,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY (rev - cogs) / rev)::float8 AS "medianMargin"
      FROM per_item GROUP BY category, brand
      UNION ALL
      SELECT 'CATEGORY' AS level, category, NULL AS brand, COUNT(*)::int AS n,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY (rev - cogs) / rev)::float8 AS "medianMargin"
      FROM per_item GROUP BY category
      UNION ALL
      -- Last-resort baseline for thin categories (e.g. Fan Heater has too few
      -- costed items to have a median of its own). Weak, but a defensible
      -- number beats leaving the product with no cost at all.
      SELECT 'ALL' AS level, NULL AS category, NULL AS brand, COUNT(*)::int AS n,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY (rev - cogs) / rev)::float8 AS "medianMargin"
      FROM per_item
    `;
    return rows.map(r => ({
      level: r.level as 'CATEGORY_BRAND' | 'CATEGORY',
      category: r.category,
      brand: r.brand,
      n: Number(r.n),
      medianMargin: Number(r.medianMargin),
    }));
  }

  // Items whose cost cannot come from the purchase file: either the purchase
  // file has them only at price 0 (assembled), or it doesn't have them at all.
  // These are precisely the items whose profit is otherwise unknowable - so each
  // gets an assessed cost, shown alongside for the user to verify or overrule.
  async getCandidates(
    organizationId: number,
    limit = 200,
  ): Promise<{
    candidates: AssembledCandidate[];
    totalCandidates: number;
    verifiedCount: number;
    unverifiedRevenue: number;
  }> {
    const [items, formulas, existing, peers] = await Promise.all([
      this.prisma.$queryRaw<
        {
          itemKey: string;
          itemName: string;
          category: string | null;
          brand: string | null;
          n: number;
          units: number;
          revenue: number;
          avgPrice: number;
        }[]
      >`
        SELECT s."itemKey",
               MIN(s."itemRaw")            AS "itemName",
               MIN(s.category)             AS category,
               MIN(s.brand)                AS brand,
               COUNT(*)::int               AS n,
               SUM(s.quantity)::float8     AS units,
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
      this.getPeerMargins(organizationId),
    ]);

    const byKey = new Map(existing.map(e => [e.itemKey, e]));
    const formulaCost = new Map(formulas.map(f => [f.id, f.cost]));

    const catBrand = new Map(
      peers.filter(p => p.level === 'CATEGORY_BRAND').map(p => [`${p.category}||${p.brand}`, p]),
    );
    const cat = new Map(peers.filter(p => p.level === 'CATEGORY').map(p => [String(p.category), p]));
    const all = peers.find(p => p.level === 'ALL');

    const candidates: AssembledCandidate[] = items.map(it => {
      const saved = byKey.get(it.itemKey);
      const manualCost = saved?.manualCost != null ? Number(saved.manualCost) : null;
      const formulaId = saved?.formulaId ?? null;
      const resolvedCost = manualCost ?? (formulaId != null ? formulaCost.get(formulaId) ?? null : null);

      const avgSalePrice = Math.round(Number(it.avgPrice));
      const units = Number(it.units);
      const revenue = Number(it.revenue);

      const suggestions = formulas
        .map(f => ({ formulaId: f.id, label: f.label, family: f.family, cost: f.cost, score: this.score(it.itemName, f) }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // --- estimate 1: what the parts add up to ---
      // Prefer the best-scoring formula that could actually be this product: one
      // costing MORE than the item sells for cannot be the formula that builds
      // it, so fall to the next-best rather than asserting a loss-making build.
      const credible = suggestions.find(s => avgSalePrice > 0 && s.cost < avgSalePrice);
      const best = credible ?? suggestions[0];
      const bomCost = best ? Math.round(best.cost) : null;
      const bomLabel = best ? best.label : null;

      // --- estimate 2: what comparable products earn ---
      // A negative median margin would imply a cost above the selling price;
      // that is a broken peer group, not a real cost, so such a group is not used.
      const cb = catBrand.get(`${it.category}||${it.brand}`);
      const c = cat.get(String(it.category));
      let peerCost: number | null = null;
      let peerNote: string | null = null;
      let peerBasis: 'CATEGORY_BRAND_PEER' | 'CATEGORY_PEER' | null = null;
      const usable = (p: PeerMargin | undefined, minN: number) =>
        p && p.n >= minN && p.medianMargin > 0 && p.medianMargin < 0.9;

      if (usable(cb, 5) && avgSalePrice > 0) {
        peerCost = Math.round(avgSalePrice * (1 - cb!.medianMargin));
        peerNote = `${(cb!.medianMargin * 100).toFixed(1)}% median margin of ${cb!.n} costed ${it.brand} ${it.category} items`;
        peerBasis = 'CATEGORY_BRAND_PEER';
      } else if (usable(c, 3) && avgSalePrice > 0) {
        peerCost = Math.round(avgSalePrice * (1 - c!.medianMargin));
        peerNote = `${(c!.medianMargin * 100).toFixed(1)}% median margin of ${c!.n} costed ${it.category} items`;
        peerBasis = 'CATEGORY_PEER';
      } else if (usable(all, 10) && avgSalePrice > 0) {
        peerCost = Math.round(avgSalePrice * (1 - all!.medianMargin));
        peerNote = `no costed peers in ${it.category} — fell back to the ${(all!.medianMargin * 100).toFixed(1)}% median margin across all ${all!.n} costed products`;
        peerBasis = 'CATEGORY_PEER';
      }

      // --- pick the headline assessment ---
      // A BOM cost is real physics (parts), so it leads - but only when the
      // formula genuinely identifies this model (MIN_BOM_SCORE_TO_COST) and
      // costs less than the item sells for. Otherwise the formula is not what
      // builds this product, and the peer estimate is the honest answer.
      let assessedCost: number | null = null;
      let assessedBasis: AssembledCandidate['assessedBasis'] = null;
      let assessedNote: string | null = null;
      let assessedConfidence: AssembledCandidate['assessedConfidence'] = null;

      const bomIdentifiesModel = best != null && best.score >= MIN_BOM_SCORE_TO_COST;
      const bomCredible = bomCost != null && avgSalePrice > 0 && bomCost < avgSalePrice;

      if (bomIdentifiesModel && bomCredible) {
        assessedCost = bomCost;
        assessedBasis = 'BOM';
        assessedNote = `BOM formula "${bomLabel}" — parts total ${bomCost!.toLocaleString()}`;
        // Confidence rises when the two independent estimates corroborate.
        const agrees = peerCost != null && Math.abs(bomCost! - peerCost) <= 0.1 * peerCost;
        assessedConfidence = best!.score >= 10 || agrees ? 'HIGH' : 'MEDIUM';
      } else if (peerCost != null) {
        assessedCost = peerCost;
        assessedBasis = peerBasis;
        const why =
          bomCost != null && !bomIdentifiesModel
            ? `no BOM formula identifies this exact model (the closest, "${bomLabel}", matches only on the product type), so peers used — `
            : bomCost != null && !bomCredible
              ? `BOM "${bomLabel}" (${bomCost.toLocaleString()}) is not below the ${avgSalePrice.toLocaleString()} selling price, so peers used — `
              : '';
        assessedNote = why + peerNote;
        assessedConfidence = peerBasis === 'CATEGORY_BRAND_PEER' ? 'MEDIUM' : 'LOW';
      }

      // Profit implied by the cost actually in force.
      const costInForce = resolvedCost ?? assessedCost;
      const estimatedProfit = costInForce != null ? revenue - costInForce * units : null;
      const estimatedMarginPercent =
        estimatedProfit != null && revenue > 0
          ? Number(((estimatedProfit / revenue) * 100).toFixed(2))
          : null;

      return {
        itemName: it.itemName,
        itemKey: it.itemKey,
        category: it.category,
        brand: it.brand,
        transactionCount: Number(it.n),
        unitsSold: units,
        totalRevenue: revenue,
        avgSalePrice,
        formulaId,
        manualCost,
        resolvedCost,
        bomCost,
        bomLabel,
        peerCost,
        peerNote,
        assessedCost,
        assessedBasis,
        assessedNote,
        assessedConfidence,
        estimatedProfit,
        estimatedMarginPercent,
        suggestions,
      };
    });

    // Biggest money first: the user's time is best spent verifying the costs
    // that move the most profit, not the longest list.
    candidates.sort((a, b) => (b.estimatedProfit ?? -Infinity) - (a.estimatedProfit ?? -Infinity));

    return {
      candidates: candidates.slice(0, limit),
      totalCandidates: candidates.length,
      verifiedCount: candidates.filter(c => c.resolvedCost != null).length,
      unverifiedRevenue: candidates.filter(c => c.resolvedCost == null).reduce((s, c) => s + c.totalRevenue, 0),
    };
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
