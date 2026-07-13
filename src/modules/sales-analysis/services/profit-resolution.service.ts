import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

// This is the ONLY place sales data and purchase data are ever cross-referenced
// in this analysis suite - never against this app's own Product/Vendor tables.
//
// The join key is `itemKey`: the normalized FULL item name, present in both
// uploaded datasets. It is emphatically NOT `productCode` (the leading number),
// which is a shelf/category code shared by dozens of unrelated products - code
// "176" alone spans 48 purchase items priced Rs 2,175 to Rs 41,800, plus an
// iron. Joining on it costed a Rs 4,359 juicer at Rs 41,800 and produced the
// nonsense 60%/100% margins this replaced.
//
// Cost for a sale is resolved in strict priority:
//   1. the most recent purchase of the SAME item at a real price (> 0), dated
//      at-or-before the sale - what was actually paid at the time;
//   2. else the earliest known purchase of that item at a real price, even if
//      it postdates the sale (better than nothing, and honest);
//   3. else, for a model we ASSEMBLE rather than buy, the BOM cost the user
//      mapped to it (derived live from the shared parts catalog);
//   4. else NULL - cost genuinely unknown.
//
// A purchase price of 0 is NOT a cost. It means "no cost information" (the
// item is assembled, or the row is a data gap). Treating it as zero is what
// manufactured the 100% margins. Unknown cost stays NULL and is reported as
// unmatched - never silently folded in as zero profit or 100% margin.
//
// `excludeItems` are item names classified as PART (components supplied to
// vendors) - excluded here so all genuine-sales/profit views drop them.
function resolvedLinesCTE(organizationId: number, from: Date, to: Date, excludeItems: string[] = []) {
  const exclude =
    excludeItems.length > 0
      ? Prisma.sql`AND s."itemRaw" <> ALL(${excludeItems})`
      : Prisma.empty;
  return Prisma.sql`
    WITH bom AS (
      SELECT
        aic."itemKey",
        COALESCE(
          aic."manualCost",
          (SELECT SUM(l.quantity * ap."unitCost")
             FROM "AssemblyFormulaLine" l
             JOIN "AssemblyPart" ap ON ap.id = l."partId"
            WHERE l."formulaId" = aic."formulaId")
        ) AS cost
      FROM "AssembledItemCost" aic
      WHERE aic."organizationId" = ${organizationId}
    ),
    resolved AS (
      SELECT
        s."salesmanName",
        s."accountName",
        s."customerName",
        s."itemRaw" AS "productKey",
        s."productCode",
        s.quantity,
        s."lineAmount",
        COALESCE(prior.cost, later.cost, bom.cost) AS "resolvedCost",
        CASE
          WHEN prior.cost IS NOT NULL OR later.cost IS NOT NULL THEN 'PURCHASE'
          WHEN bom.cost IS NOT NULL                             THEN 'BOM'
          ELSE 'UNKNOWN'
        END AS "costSource"
      FROM "SalesAnalysisRecord" s
      LEFT JOIN LATERAL (
        SELECT pr."purchasePrice" AS cost
        FROM "PurchaseAnalysisRecord" pr
        WHERE pr."organizationId" = s."organizationId"
          AND pr."itemKey" = s."itemKey"
          AND pr."purchasePrice" > 0
          AND pr."transactionDate" <= s."transactionDate"
        ORDER BY pr."transactionDate" DESC
        LIMIT 1
      ) prior ON true
      LEFT JOIN LATERAL (
        SELECT pr."purchasePrice" AS cost
        FROM "PurchaseAnalysisRecord" pr
        WHERE pr."organizationId" = s."organizationId"
          AND pr."itemKey" = s."itemKey"
          AND pr."purchasePrice" > 0
        ORDER BY pr."transactionDate" ASC
        LIMIT 1
      ) later ON true
      LEFT JOIN bom ON bom."itemKey" = s."itemKey"
      WHERE s."organizationId" = ${organizationId}
        AND s."transactionDate" BETWEEN ${from} AND ${to}
        ${exclude}
    )
  `;
}

// Profit is summed ONLY over lines whose cost is known, while revenue counts
// every line - so a caller dividing profit by revenue would understate margin
// on a partially-costed product. Each row therefore also reports the revenue
// its profit was actually computed against (`costedRevenue`), which is the
// correct denominator for a margin, plus how much revenue has no cost at all.
const PROFIT_COLUMNS = Prisma.sql`
  SUM("lineAmount")::float8 AS "totalRevenue",
  SUM(quantity)::float8 AS "totalQuantity",
  COUNT(*)::int AS "transactionCount",
  COALESCE(SUM("lineAmount") FILTER (WHERE "resolvedCost" IS NOT NULL), 0)::float8 AS "costedRevenue",
  COALESCE(SUM("lineAmount" - ("resolvedCost" * quantity)) FILTER (WHERE "resolvedCost" IS NOT NULL), 0)::float8 AS "totalProfit",
  COUNT(*) FILTER (WHERE "resolvedCost" IS NOT NULL)::int AS "matchedCount"
`;

interface GroupedProfitRow {
  label: string;
  totalRevenue: number;
  totalQuantity: number;
  transactionCount: number;
  costedRevenue: number;
  totalProfit: number;
  matchedCount: number;
}

// Shape every grouped row the same way. `totalProfit` is null - never 0 - when
// nothing in the group has a known cost, so the UI can say "cost unknown"
// instead of implying a 100% margin. `marginPercent` is measured against the
// revenue the profit was actually computed from.
function shapeRow(r: GroupedProfitRow) {
  const totalRevenue = Number(r.totalRevenue);
  const costedRevenue = Number(r.costedRevenue);
  const matched = Number(r.matchedCount);
  const totalProfit = matched > 0 ? Number(r.totalProfit) : null;
  return {
    totalRevenue,
    totalQuantity: Number(r.totalQuantity),
    transactionCount: Number(r.transactionCount),
    totalProfit,
    costedRevenue,
    uncostedRevenue: totalRevenue - costedRevenue,
    marginPercent:
      totalProfit !== null && costedRevenue > 0
        ? Number(((totalProfit / costedRevenue) * 100).toFixed(2))
        : null,
  };
}

@Injectable()
export class ProfitResolutionService {
  constructor(private prisma: PrismaService) {}

  async getSalesmenWithProfit(organizationId: number, from: Date, to: Date, excludeItems: string[] = []) {
    const rows = await this.prisma.$queryRaw<GroupedProfitRow[]>`
      ${resolvedLinesCTE(organizationId, from, to, excludeItems)}
      SELECT COALESCE("salesmanName", 'Not available in uploaded report(s)') AS label, ${PROFIT_COLUMNS}
      FROM resolved
      GROUP BY label
    `;
    return rows.map(r => ({ salesmanName: r.label, ...shapeRow(r) }));
  }

  // Grouped by the real item name. It used to group by productCode, which
  // merged every product sharing a shelf code into one bogus row (all 25
  // different "176 ..." juicers became a single product called "176").
  async getProductsWithProfit(organizationId: number, from: Date, to: Date, excludeItems: string[] = []) {
    const rows = await this.prisma.$queryRaw<GroupedProfitRow[]>`
      ${resolvedLinesCTE(organizationId, from, to, excludeItems)}
      SELECT "productKey" AS label, ${PROFIT_COLUMNS}
      FROM resolved
      GROUP BY "productKey"
    `;
    return rows.map(r => ({ productLabel: r.label, ...shapeRow(r) }));
  }

  async getCustomersWithProfit(organizationId: number, from: Date, to: Date, excludeItems: string[] = []) {
    const rows = await this.prisma.$queryRaw<GroupedProfitRow[]>`
      ${resolvedLinesCTE(organizationId, from, to, excludeItems)}
      SELECT COALESCE("customerName", "accountName", 'Unknown') AS label, ${PROFIT_COLUMNS}
      FROM resolved
      GROUP BY label
    `;
    return rows.map(r => ({ customerLabel: r.label, ...shapeRow(r) }));
  }

  // Powers the Gross-Profit-only P&L. Gross profit is computed strictly over
  // the revenue whose cost is known; revenue with no cost is reported
  // separately (and split by reason) rather than being treated as pure profit.
  async getGrossProfitSummary(organizationId: number, from: Date, to: Date, excludeItems: string[] = []) {
    const rows = await this.prisma.$queryRaw<
      {
        totalRevenue: number;
        costedRevenue: number;
        totalCogs: number;
        purchaseCostedRevenue: number;
        bomCostedRevenue: number;
      }[]
    >`
      ${resolvedLinesCTE(organizationId, from, to, excludeItems)}
      SELECT
        SUM("lineAmount")::float8 AS "totalRevenue",
        COALESCE(SUM("lineAmount") FILTER (WHERE "resolvedCost" IS NOT NULL), 0)::float8 AS "costedRevenue",
        COALESCE(SUM("resolvedCost" * quantity) FILTER (WHERE "resolvedCost" IS NOT NULL), 0)::float8 AS "totalCogs",
        COALESCE(SUM("lineAmount") FILTER (WHERE "costSource" = 'PURCHASE'), 0)::float8 AS "purchaseCostedRevenue",
        COALESCE(SUM("lineAmount") FILTER (WHERE "costSource" = 'BOM'), 0)::float8 AS "bomCostedRevenue"
      FROM resolved
    `;
    const row = rows[0];
    const totalRevenue = Number(row?.totalRevenue || 0);
    const costedRevenue = Number(row?.costedRevenue || 0);
    const cogs = Number(row?.totalCogs || 0);
    const uncostedRevenue = totalRevenue - costedRevenue;

    return {
      period: { from, to },
      totalRevenue,
      cogs,
      grossProfit: costedRevenue - cogs,
      grossMarginPercent:
        costedRevenue > 0 ? Number((((costedRevenue - cogs) / costedRevenue) * 100).toFixed(2)) : 0,
      // What the gross profit above was actually measured on, and what it wasn't.
      costedRevenue,
      revenueCostedFromPurchases: Number(row?.purchaseCostedRevenue || 0),
      revenueCostedFromBom: Number(row?.bomCostedRevenue || 0),
      uncostedRevenue,
      uncostedRevenuePercent:
        totalRevenue > 0 ? Number(((uncostedRevenue / totalRevenue) * 100).toFixed(2)) : 0,
    };
  }
}
