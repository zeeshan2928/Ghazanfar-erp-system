import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

// This is the ONLY place sales data and purchase data are ever
// cross-referenced in this analysis suite, and the join key is the shared
// `productCode` string parsed identically by both parsers (the leading
// numeric token off "Item") - never this app's own Product/Vendor tables.
// "Resolved cost" for a sale = the most recent purchase price for the same
// productCode dated at-or-before the sale, so profit reflects what was
// actually paid at the time, not a static catalog figure. Profit is left
// unmatched (not zero) for lines with no purchase data to compare against
// yet - callers must decide how to treat that null, never silently drop it.
// `excludeItems` are item names classified as PART (components supplied to
// vendors) - excluded here so all genuine-sales/profit views drop them.
function resolvedLinesCTE(organizationId: number, from: Date, to: Date, excludeItems: string[] = []) {
  const exclude =
    excludeItems.length > 0
      ? Prisma.sql`AND s."itemRaw" <> ALL(${excludeItems})`
      : Prisma.empty;
  return Prisma.sql`
    WITH resolved AS (
      SELECT
        s."salesmanName",
        s."accountName",
        s."customerName",
        COALESCE(s."productCode", s."itemRaw") AS "productKey",
        s."productCode",
        s.quantity,
        s."lineAmount",
        p."purchasePrice" AS "resolvedCost"
      FROM "SalesAnalysisRecord" s
      LEFT JOIN LATERAL (
        SELECT pr."purchasePrice"
        FROM "PurchaseAnalysisRecord" pr
        WHERE pr."organizationId" = s."organizationId"
          AND pr."productCode" = s."productCode"
          AND pr."transactionDate" <= s."transactionDate"
        ORDER BY pr."transactionDate" DESC
        LIMIT 1
      ) p ON true
      WHERE s."organizationId" = ${organizationId}
        AND s."transactionDate" BETWEEN ${from} AND ${to}
        ${exclude}
    )
  `;
}

interface GroupedProfitRow {
  label: string;
  totalRevenue: number;
  totalQuantity: number;
  transactionCount: number;
  totalProfit: number;
  matchedCount: number;
}

@Injectable()
export class ProfitResolutionService {
  constructor(private prisma: PrismaService) {}

  async getSalesmenWithProfit(organizationId: number, from: Date, to: Date, excludeItems: string[] = []) {
    const rows = await this.prisma.$queryRaw<GroupedProfitRow[]>`
      ${resolvedLinesCTE(organizationId, from, to, excludeItems)}
      SELECT
        COALESCE("salesmanName", 'Not available in uploaded report(s)') AS label,
        SUM("lineAmount")::float8 AS "totalRevenue",
        SUM(quantity)::float8 AS "totalQuantity",
        COUNT(*)::int AS "transactionCount",
        COALESCE(SUM(CASE WHEN "resolvedCost" IS NOT NULL THEN "lineAmount" - ("resolvedCost" * quantity) ELSE 0 END), 0)::float8 AS "totalProfit",
        COUNT(*) FILTER (WHERE "resolvedCost" IS NOT NULL)::int AS "matchedCount"
      FROM resolved
      GROUP BY label
    `;
    return rows.map(r => ({
      salesmanName: r.label,
      totalRevenue: Number(r.totalRevenue),
      totalQuantity: Number(r.totalQuantity),
      transactionCount: Number(r.transactionCount),
      totalProfit: Number(r.matchedCount) > 0 ? Number(r.totalProfit) : null,
    }));
  }

  async getProductsWithProfit(organizationId: number, from: Date, to: Date, excludeItems: string[] = []) {
    const rows = await this.prisma.$queryRaw<GroupedProfitRow[]>`
      ${resolvedLinesCTE(organizationId, from, to, excludeItems)}
      SELECT
        "productKey" AS label,
        SUM("lineAmount")::float8 AS "totalRevenue",
        SUM(quantity)::float8 AS "totalQuantity",
        COUNT(*)::int AS "transactionCount",
        COALESCE(SUM(CASE WHEN "resolvedCost" IS NOT NULL THEN "lineAmount" - ("resolvedCost" * quantity) ELSE 0 END), 0)::float8 AS "totalProfit",
        COUNT(*) FILTER (WHERE "resolvedCost" IS NOT NULL)::int AS "matchedCount"
      FROM resolved
      GROUP BY "productKey"
    `;
    return rows.map(r => ({
      productLabel: r.label,
      totalRevenue: Number(r.totalRevenue),
      totalQuantity: Number(r.totalQuantity),
      transactionCount: Number(r.transactionCount),
      totalProfit: Number(r.matchedCount) > 0 ? Number(r.totalProfit) : null,
    }));
  }

  async getCustomersWithProfit(organizationId: number, from: Date, to: Date, excludeItems: string[] = []) {
    const rows = await this.prisma.$queryRaw<GroupedProfitRow[]>`
      ${resolvedLinesCTE(organizationId, from, to, excludeItems)}
      SELECT
        COALESCE("customerName", "accountName", 'Unknown') AS label,
        SUM("lineAmount")::float8 AS "totalRevenue",
        SUM(quantity)::float8 AS "totalQuantity",
        COUNT(*)::int AS "transactionCount",
        COALESCE(SUM(CASE WHEN "resolvedCost" IS NOT NULL THEN "lineAmount" - ("resolvedCost" * quantity) ELSE 0 END), 0)::float8 AS "totalProfit",
        COUNT(*) FILTER (WHERE "resolvedCost" IS NOT NULL)::int AS "matchedCount"
      FROM resolved
      GROUP BY label
    `;
    return rows.map(r => ({
      customerLabel: r.label,
      totalRevenue: Number(r.totalRevenue),
      totalQuantity: Number(r.totalQuantity),
      transactionCount: Number(r.transactionCount),
      totalProfit: Number(r.matchedCount) > 0 ? Number(r.totalProfit) : null,
    }));
  }

  // Powers the Gross-Profit-only P&L: overall Revenue/COGS/Gross Profit for
  // the period, plus what fraction of revenue has no purchase match yet
  // (so the statement can be honest about an incomplete cost picture
  // instead of silently treating unmatched cost as zero).
  async getGrossProfitSummary(organizationId: number, from: Date, to: Date, excludeItems: string[] = []) {
    const rows = await this.prisma.$queryRaw<
      { totalRevenue: number; matchedRevenue: number; totalCogs: number }[]
    >`
      ${resolvedLinesCTE(organizationId, from, to, excludeItems)}
      SELECT
        SUM("lineAmount")::float8 AS "totalRevenue",
        COALESCE(SUM(CASE WHEN "resolvedCost" IS NOT NULL THEN "lineAmount" ELSE 0 END), 0)::float8 AS "matchedRevenue",
        COALESCE(SUM(CASE WHEN "resolvedCost" IS NOT NULL THEN "resolvedCost" * quantity ELSE 0 END), 0)::float8 AS "totalCogs"
      FROM resolved
    `;
    const row = rows[0] || { totalRevenue: 0, matchedRevenue: 0, totalCogs: 0 };
    const totalRevenue = Number(row.totalRevenue || 0);
    const matchedRevenue = Number(row.matchedRevenue || 0);
    const totalCogs = Number(row.totalCogs || 0);

    return {
      period: { from, to },
      totalRevenue,
      cogs: totalCogs,
      grossProfit: matchedRevenue - totalCogs,
      unmatchedRevenue: totalRevenue - matchedRevenue,
      unmatchedRevenuePercent:
        totalRevenue > 0 ? Number((((totalRevenue - matchedRevenue) / totalRevenue) * 100).toFixed(2)) : 0,
    };
  }
}
