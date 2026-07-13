import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ProfitResolutionService } from './profit-resolution.service';
import { PartsClassificationService } from './parts-classification.service';
import { AdaptiveImportService } from '@common/adaptive-import/adaptive-import.service';
import { ImportTemplateService } from '@common/adaptive-import/import-template.service';
import { CanonicalRow, ColumnMapping, Structure } from '@common/adaptive-import/adaptive-import.types';
import { normalizeItemKey } from '@common/adaptive-import/item-key';

export interface ConflictSample {
  billNumber: string;
  lineSequence: number;
  reason: string;
}

const INSERT_CHUNK = 5000;

@Injectable()
export class SalesAnalysisService {
  constructor(
    private prisma: PrismaService,
    private profitResolution: ProfitResolutionService,
    private partsClassification: PartsClassificationService,
    private engine: AdaptiveImportService,
    private templates: ImportTemplateService,
  ) {}

  // Step 1: study the file, propose a column mapping (reusing a remembered
  // layout if one matches), and return a preview - no DB writes.
  async analyzeUpload(organizationId: number, file: Express.Multer.File) {
    const detected = this.engine.analyze(file.buffer, 'SALES');
    const template = await this.templates.findMatching(organizationId, 'SALES', detected.signature);
    if (template) {
      const resolved = this.templates.resolveTemplateMapping(
        template.mapping as Record<string, string>,
        detected.columns,
      );
      return this.engine.analyze(file.buffer, 'SALES', resolved, template.structure as Structure);
    }
    return detected;
  }

  // Step 2: read the file with the user-confirmed mapping, dedupe, insert,
  // and remember the mapping for next time.
  async importUpload(
    organizationId: number,
    uploadedBy: number,
    file: Express.Multer.File,
    headerRowIndex: number,
    mapping: ColumnMapping,
    structure: Structure,
  ) {
    const sheet = this.engine.readSheet(file.buffer);
    const rows = this.engine.readRows(sheet, headerRowIndex, mapping, structure);

    const dated = rows.filter(r => r.transactionDate !== null);
    const skippedNoDate = rows.length - dated.length;

    const distinctBillNumbers = [...new Set(dated.map(r => r.billNumber))];
    const existing = await this.prisma.salesAnalysisRecord.findMany({
      where: { organizationId, billNumber: { in: distinctBillNumbers } },
      select: { billNumber: true, lineSequence: true, itemRaw: true, quantity: true, soldPrice: true, transactionDate: true },
    });
    const existingByKey = new Map(existing.map(r => [`${r.billNumber}::${r.lineSequence}`, r]));

    const toInsert: CanonicalRow[] = [];
    const conflicts: ConflictSample[] = [];
    let duplicateCount = 0;

    for (const line of dated) {
      const key = `${line.billNumber}::${line.lineSequence}`;
      const prev = existingByKey.get(key);
      if (prev) {
        const same =
          prev.itemRaw === line.itemRaw &&
          Math.abs(Number(prev.quantity) - line.quantity) < 0.01 &&
          Math.abs(Number(prev.soldPrice) - line.unitPrice) < 0.01 &&
          prev.transactionDate.getTime() === (line.transactionDate as Date).getTime();
        if (same) duplicateCount++;
        else
          conflicts.push({
            billNumber: line.billNumber,
            lineSequence: line.lineSequence,
            reason: `Already have "${prev.itemRaw}" x${prev.quantity} @ ${prev.soldPrice}; new file has "${line.itemRaw}" x${line.quantity} @ ${line.unitPrice} - not applied, needs review`,
          });
        continue;
      }
      toInsert.push(line);
    }

    const times = dated.map(r => (r.transactionDate as Date).getTime());
    const reportStartDate = times.length ? new Date(Math.min(...times)) : new Date();
    const reportEndDate = times.length ? new Date(Math.max(...times)) : new Date();

    const upload = await this.prisma.salesAnalysisUpload.create({
      data: {
        organizationId,
        fileName: file.originalname,
        uploadedBy,
        reportStartDate,
        reportEndDate,
        rowCount: rows.length,
        duplicateCount,
        conflictCount: conflicts.length,
        status: 'PROCESSED',
      },
    });

    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
      const chunk = toInsert.slice(i, i + INSERT_CHUNK);
      await this.prisma.salesAnalysisRecord.createMany({
        data: chunk.map(line => ({
          organizationId,
          uploadId: upload.id,
          billNumber: line.billNumber,
          lineSequence: line.lineSequence,
          transactionDate: line.transactionDate as Date,
          accountName: line.accountName,
          customerName: line.customerName,
          salesmanName: line.salesmanName,
          itemRaw: line.itemRaw,
          productCode: line.productCode,
          itemKey: normalizeItemKey(line.itemRaw),
          quantity: line.quantity,
          soldPrice: line.unitPrice,
          lineAmount: line.lineAmount,
          category: line.category,
          brand: line.brand,
          warehouseName: line.warehouseName,
          actualPrice: line.actualPrice,
          paymentMethod: line.paymentMethod,
          isReturn: line.isReturn,
        })),
      });
    }

    const columns = this.engine.buildColumns(sheet, headerRowIndex);
    await this.templates.saveTemplate(
      organizationId,
      'SALES',
      this.engine.computeSignature(columns),
      file.originalname,
      structure,
      mapping,
      columns,
    );

    return {
      uploadId: upload.id,
      fileName: file.originalname,
      reportStartDate,
      reportEndDate,
      rowsParsed: rows.length,
      newRowsAdded: toInsert.length,
      duplicatesSkipped: duplicateCount,
      skippedNoDate,
      conflicts: conflicts.slice(0, 20),
      conflictCount: conflicts.length,
    };
  }

  async getUploads(organizationId: number) {
    return this.prisma.salesAnalysisUpload.findMany({
      where: { organizationId },
      orderBy: { reportStartDate: 'asc' },
      select: {
        id: true, fileName: true, reportStartDate: true, reportEndDate: true,
        rowCount: true, duplicateCount: true, conflictCount: true, createdAt: true,
      },
    });
  }

  // Profit is resolved by cross-referencing the matching Purchase Analysis
  // data (ProfitResolutionService); returns net automatically (negative
  // rows); and items the user confirmed as PARTS (vendor-supplied components)
  // are excluded so these are GENUINE-sales views only.
  async getSalesmenPerformance(organizationId: number, from: Date, to: Date) {
    const parts = await this.partsClassification.getPartNames(organizationId);
    const rows = (await this.profitResolution.getSalesmenWithProfit(organizationId, from, to, parts)).sort(
      (a, b) => (b.totalProfit ?? -1) - (a.totalProfit ?? -1),
    );
    return { period: { from, to }, salesmen: rows };
  }

  async getProductsPerformance(organizationId: number, from: Date, to: Date) {
    const parts = await this.partsClassification.getPartNames(organizationId);
    const rows = (await this.profitResolution.getProductsWithProfit(organizationId, from, to, parts)).sort(
      (a, b) => (b.totalProfit ?? b.totalRevenue) - (a.totalProfit ?? a.totalRevenue),
    );
    return { period: { from, to }, products: rows };
  }

  async getCustomersPerformance(organizationId: number, from: Date, to: Date) {
    const parts = await this.partsClassification.getPartNames(organizationId);
    const rows = (await this.profitResolution.getCustomersWithProfit(organizationId, from, to, parts)).sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );
    return { period: { from, to }, customers: rows };
  }

  // Gross-Profit P&L, excluding confirmed parts from genuine sales.
  async getGrossProfitSummary(organizationId: number, from: Date, to: Date) {
    const parts = await this.partsClassification.getPartNames(organizationId);
    return this.profitResolution.getGrossProfitSummary(organizationId, from, to, parts);
  }

  // New dimensions unlocked by the richer file.
  async getCategoryPerformance(organizationId: number, from: Date, to: Date) {
    const parts = await this.partsClassification.getPartNames(organizationId);
    const groups = await this.prisma.salesAnalysisRecord.groupBy({
      by: ['category'],
      where: { organizationId, transactionDate: { gte: from, lte: to }, itemRaw: { notIn: parts } },
      _sum: { lineAmount: true, quantity: true },
      _count: { _all: true },
    });
    return {
      period: { from, to },
      categories: groups
        .map(g => ({
          category: g.category ?? 'Uncategorized',
          totalRevenue: Number(g._sum.lineAmount || 0),
          totalQuantity: Number(g._sum.quantity || 0),
          transactionCount: g._count._all,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue),
    };
  }

  async getBrandPerformance(organizationId: number, from: Date, to: Date) {
    const parts = await this.partsClassification.getPartNames(organizationId);
    const groups = await this.prisma.salesAnalysisRecord.groupBy({
      by: ['brand'],
      where: { organizationId, transactionDate: { gte: from, lte: to }, itemRaw: { notIn: parts } },
      _sum: { lineAmount: true, quantity: true },
      _count: { _all: true },
    });
    return {
      period: { from, to },
      brands: groups
        .map(g => ({
          brand: g.brand ?? 'Unbranded',
          totalRevenue: Number(g._sum.lineAmount || 0),
          totalQuantity: Number(g._sum.quantity || 0),
          transactionCount: g._count._all,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue),
    };
  }

  // Discount = list value (actualPrice*qty) minus what was actually charged.
  async getDiscountSummary(organizationId: number, from: Date, to: Date) {
    const parts = await this.partsClassification.getPartNames(organizationId);
    const exclude = parts.length > 0 ? Prisma.sql`AND "itemRaw" <> ALL(${parts})` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ revenue: number; listValue: number; discount: number; withList: number; total: number }[]>`
      SELECT
        COALESCE(SUM("lineAmount"), 0)::float8 AS revenue,
        COALESCE(SUM(CASE WHEN "actualPrice" IS NOT NULL THEN "actualPrice" * "quantity" ELSE 0 END), 0)::float8 AS "listValue",
        COALESCE(SUM(CASE WHEN "actualPrice" IS NOT NULL THEN ("actualPrice" - "soldPrice") * "quantity" ELSE 0 END), 0)::float8 AS discount,
        COUNT(*) FILTER (WHERE "actualPrice" IS NOT NULL AND "actualPrice" <> "soldPrice")::int AS "withList",
        COUNT(*)::int AS total
      FROM "SalesAnalysisRecord"
      WHERE "organizationId" = ${organizationId} AND "transactionDate" BETWEEN ${from} AND ${to} ${exclude}
    `;
    const r = rows[0] || { revenue: 0, listValue: 0, discount: 0, withList: 0, total: 0 };
    return {
      period: { from, to },
      totalRevenue: Number(r.revenue),
      totalListValue: Number(r.listValue),
      totalDiscount: Number(r.discount),
      discountedLineCount: Number(r.withList),
      totalLineCount: Number(r.total),
    };
  }
}
