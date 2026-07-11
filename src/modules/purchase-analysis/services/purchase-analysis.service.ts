import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { PurchaseAnalysisParserService, ParsedPurchaseLine } from './purchase-analysis-parser.service';

export interface PurchaseConflictSample {
  billNumber: string;
  lineSequence: number;
  reason: string;
}

@Injectable()
export class PurchaseAnalysisService {
  constructor(
    private prisma: PrismaService,
    private parser: PurchaseAnalysisParserService,
  ) {}

  async ingestUpload(organizationId: number, uploadedBy: number, file: Express.Multer.File) {
    const parsed = this.parser.parse(file.buffer, file.originalname);

    const distinctBillNumbers = [...new Set(parsed.lines.map(l => l.billNumber))];

    const [existingRecords, existingUploads] = await Promise.all([
      this.prisma.purchaseAnalysisRecord.findMany({
        where: { organizationId, billNumber: { in: distinctBillNumbers } },
        select: {
          billNumber: true,
          lineSequence: true,
          itemRaw: true,
          quantity: true,
          purchasePrice: true,
          transactionDate: true,
        },
      }),
      this.prisma.purchaseAnalysisUpload.findMany({
        where: { organizationId },
        select: { id: true, fileName: true, reportStartDate: true, reportEndDate: true },
      }),
    ]);

    const existingByKey = new Map(
      existingRecords.map(r => [`${r.billNumber}::${r.lineSequence}`, r]),
    );

    const toInsert: ParsedPurchaseLine[] = [];
    const conflicts: PurchaseConflictSample[] = [];
    let duplicateCount = 0;

    for (const line of parsed.lines) {
      const key = `${line.billNumber}::${line.lineSequence}`;
      const existing = existingByKey.get(key);

      if (existing) {
        // Tolerance of 0.01 (not 0.001) is deliberate: re-parsing the exact
        // same .xlsx file can yield a price like 13587.475 vs 13587.48 on a
        // second read - Excel's own displayed-text rounding is not perfectly
        // stable between reads, confirmed by re-uploading a real file
        // unchanged and seeing this exact discrepancy. A tighter tolerance
        // flags identical rows as conflicts.
        const sameContent =
          existing.itemRaw === line.itemRaw &&
          Math.abs(Number(existing.quantity) - line.quantity) < 0.01 &&
          Math.abs(Number(existing.purchasePrice) - line.purchasePrice) < 0.01 &&
          existing.transactionDate.getTime() === line.transactionDate.getTime();

        if (sameContent) {
          duplicateCount++;
        } else {
          conflicts.push({
            billNumber: line.billNumber,
            lineSequence: line.lineSequence,
            reason: `Already have "${existing.itemRaw}" x${existing.quantity} @ ${existing.purchasePrice} for this batch/line, new file has "${line.itemRaw}" x${line.quantity} @ ${line.purchasePrice} - not applied, needs manual review`,
          });
        }
        continue;
      }

      toInsert.push(line);
    }

    const upload = await this.prisma.purchaseAnalysisUpload.create({
      data: {
        organizationId,
        fileName: file.originalname,
        uploadedBy,
        reportStartDate: parsed.reportStartDate,
        reportEndDate: parsed.reportEndDate,
        rowCount: parsed.lines.length,
        duplicateCount,
        conflictCount: conflicts.length,
        status: 'PROCESSED',
      },
    });

    if (toInsert.length > 0) {
      await this.prisma.purchaseAnalysisRecord.createMany({
        data: toInsert.map(line => ({
          organizationId,
          uploadId: upload.id,
          billNumber: line.billNumber,
          lineSequence: line.lineSequence,
          transactionDate: line.transactionDate,
          vendorName: line.vendorName,
          itemRaw: line.itemRaw,
          productCode: line.productCode,
          quantity: line.quantity,
          purchasePrice: line.purchasePrice,
          lineAmount: line.lineAmount,
        })),
      });
    }

    const overlapping = existingUploads.filter(
      u => u.reportStartDate <= parsed.reportEndDate && u.reportEndDate >= parsed.reportStartDate,
    );

    return {
      uploadId: upload.id,
      fileName: file.originalname,
      reportStartDate: parsed.reportStartDate,
      reportEndDate: parsed.reportEndDate,
      rowsParsed: parsed.lines.length,
      newRowsAdded: toInsert.length,
      duplicatesSkipped: duplicateCount,
      conflicts: conflicts.slice(0, 20),
      conflictCount: conflicts.length,
      overlapsExistingUploads: overlapping.map(u => ({
        fileName: u.fileName,
        reportStartDate: u.reportStartDate,
        reportEndDate: u.reportEndDate,
      })),
      parserWarnings: parsed.warnings.slice(0, 50),
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
