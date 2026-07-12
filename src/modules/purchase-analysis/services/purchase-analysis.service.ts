import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AdaptiveImportService } from '@common/adaptive-import/adaptive-import.service';
import { ImportTemplateService } from '@common/adaptive-import/import-template.service';
import { CanonicalRow, ColumnMapping, Structure } from '@common/adaptive-import/adaptive-import.types';

export interface PurchaseConflictSample {
  billNumber: string;
  lineSequence: number;
  reason: string;
}

const INSERT_CHUNK = 5000;

@Injectable()
export class PurchaseAnalysisService {
  constructor(
    private prisma: PrismaService,
    private engine: AdaptiveImportService,
    private templates: ImportTemplateService,
  ) {}

  async analyzeUpload(organizationId: number, file: Express.Multer.File) {
    const detected = this.engine.analyze(file.buffer, 'PURCHASE');
    const template = await this.templates.findMatching(organizationId, 'PURCHASE', detected.signature);
    if (template) {
      const resolved = this.templates.resolveTemplateMapping(
        template.mapping as Record<string, string>,
        detected.columns,
      );
      return this.engine.analyze(file.buffer, 'PURCHASE', resolved, template.structure as Structure);
    }
    return detected;
  }

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
    const existing = await this.prisma.purchaseAnalysisRecord.findMany({
      where: { organizationId, billNumber: { in: distinctBillNumbers } },
      select: { billNumber: true, lineSequence: true, itemRaw: true, quantity: true, purchasePrice: true, transactionDate: true },
    });
    const existingByKey = new Map(existing.map(r => [`${r.billNumber}::${r.lineSequence}`, r]));

    const toInsert: CanonicalRow[] = [];
    const conflicts: PurchaseConflictSample[] = [];
    let duplicateCount = 0;

    for (const line of dated) {
      const key = `${line.billNumber}::${line.lineSequence}`;
      const prev = existingByKey.get(key);
      if (prev) {
        const same =
          prev.itemRaw === line.itemRaw &&
          Math.abs(Number(prev.quantity) - line.quantity) < 0.01 &&
          Math.abs(Number(prev.purchasePrice) - line.unitPrice) < 0.01 &&
          prev.transactionDate.getTime() === (line.transactionDate as Date).getTime();
        if (same) duplicateCount++;
        else
          conflicts.push({
            billNumber: line.billNumber,
            lineSequence: line.lineSequence,
            reason: `Already have "${prev.itemRaw}" x${prev.quantity} @ ${prev.purchasePrice}; new file has "${line.itemRaw}" x${line.quantity} @ ${line.unitPrice} - not applied, needs review`,
          });
        continue;
      }
      toInsert.push(line);
    }

    const times = dated.map(r => (r.transactionDate as Date).getTime());
    const reportStartDate = times.length ? new Date(Math.min(...times)) : new Date();
    const reportEndDate = times.length ? new Date(Math.max(...times)) : new Date();

    const upload = await this.prisma.purchaseAnalysisUpload.create({
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
      await this.prisma.purchaseAnalysisRecord.createMany({
        data: chunk.map(line => ({
          organizationId,
          uploadId: upload.id,
          billNumber: line.billNumber,
          lineSequence: line.lineSequence,
          transactionDate: line.transactionDate as Date,
          vendorName: line.vendorName,
          itemRaw: line.itemRaw,
          productCode: line.productCode,
          quantity: line.quantity,
          purchasePrice: line.unitPrice,
          lineAmount: line.lineAmount,
        })),
      });
    }

    const columns = this.engine.buildColumns(sheet, headerRowIndex);
    await this.templates.saveTemplate(
      organizationId,
      'PURCHASE',
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
    return this.prisma.purchaseAnalysisUpload.findMany({
      where: { organizationId },
      orderBy: { reportStartDate: 'asc' },
      select: {
        id: true,
        fileName: true,
        reportStartDate: true,
        reportEndDate: true,
        rowCount: true,
        duplicateCount: true,
        conflictCount: true,
        createdAt: true,
      },
    });
  }

  async getVendorsPerformance(organizationId: number, from: Date, to: Date) {
    const groups = await this.prisma.purchaseAnalysisRecord.groupBy({
      by: ['vendorName'],
      where: { organizationId, transactionDate: { gte: from, lte: to } },
      _sum: { lineAmount: true, quantity: true },
      _count: { _all: true },
    });

    const rows = groups
      .map(g => ({
        vendorName: g.vendorName ?? 'Unknown',
        totalSpend: Number(g._sum.lineAmount || 0),
        totalQuantity: Number(g._sum.quantity || 0),
        transactionCount: g._count._all,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);

    return { period: { from, to }, vendors: rows };
  }

  async getProductsPerformance(organizationId: number, from: Date, to: Date) {
    const groups = await this.prisma.$queryRaw<
      { label: string; totalSpend: number; totalQuantity: number; transactionCount: number; avgPrice: number }[]
    >`
      SELECT COALESCE("productCode", "itemRaw") AS label,
             SUM("lineAmount")::float8 AS "totalSpend",
             SUM(quantity)::float8 AS "totalQuantity",
             COUNT(*)::int AS "transactionCount",
             (SUM("lineAmount") / NULLIF(SUM(quantity), 0))::float8 AS "avgPrice"
      FROM "PurchaseAnalysisRecord"
      WHERE "organizationId" = ${organizationId} AND "transactionDate" BETWEEN ${from} AND ${to}
      GROUP BY label
      ORDER BY "totalSpend" DESC
    `;

    return {
      period: { from, to },
      products: groups.map(g => ({
        productLabel: g.label,
        totalSpend: Number(g.totalSpend),
        totalQuantity: Number(g.totalQuantity),
        transactionCount: Number(g.transactionCount),
        avgPrice: g.avgPrice !== null ? Number(g.avgPrice) : null,
      })),
    };
  }
}
