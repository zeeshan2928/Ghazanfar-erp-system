import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { SalesAnalysisParserService, ParsedSaleLine } from './sales-analysis-parser.service';
import { ProfitResolutionService } from './profit-resolution.service';

export interface ConflictSample {
  billNumber: string;
  lineSequence: number;
  reason: string;
}

@Injectable()
export class SalesAnalysisService {
  constructor(
    private prisma: PrismaService,
    private parser: SalesAnalysisParserService,
    private profitResolution: ProfitResolutionService,
  ) {}

  async ingestUpload(organizationId: number, uploadedBy: number, file: Express.Multer.File) {
    const parsed = this.parser.parse(file.buffer, file.originalname);

    const distinctBillNumbers = [...new Set(parsed.lines.map(l => l.billNumber))];

    const [existingRecords, existingUploads] = await Promise.all([
      this.prisma.salesAnalysisRecord.findMany({
        where: { organizationId, billNumber: { in: distinctBillNumbers } },
        select: {
          billNumber: true,
          lineSequence: true,
          itemRaw: true,
          quantity: true,
          soldPrice: true,
          transactionDate: true,
        },
      }),
      this.prisma.salesAnalysisUpload.findMany({
        where: { organizationId },
        select: { id: true, fileName: true, reportStartDate: true, reportEndDate: true },
      }),
    ]);

    const existingByKey = new Map(
      existingRecords.map(r => [`${r.billNumber}::${r.lineSequence}`, r]),
    );

    const toInsert: ParsedSaleLine[] = [];
    const conflicts: ConflictSample[] = [];
    let duplicateCount = 0;

    for (const line of parsed.lines) {
      const key = `${line.billNumber}::${line.lineSequence}`;
      const existing = existingByKey.get(key);

      if (existing) {
        // Tolerance of 0.01 (not 0.001) is deliberate - confirmed on the
        // purchase-analysis side that re-parsing the same .xlsx file can
        // yield a price like 13587.475 vs 13587.48 on a second read (Excel's
        // displayed-text rounding isn't perfectly stable between reads). A
        // tighter tolerance flags identical rows as false conflicts.
        const sameContent =
          existing.itemRaw === line.itemRaw &&
          Math.abs(Number(existing.quantity) - line.quantity) < 0.01 &&
          Math.abs(Number(existing.soldPrice) - line.soldPrice) < 0.01 &&
          existing.transactionDate.getTime() === line.transactionDate.getTime();

        if (sameContent) {
          duplicateCount++;
        } else {
          conflicts.push({
            billNumber: line.billNumber,
            lineSequence: line.lineSequence,
            reason: `Already have "${existing.itemRaw}" x${existing.quantity} @ ${existing.soldPrice} for this bill/line, new file has "${line.itemRaw}" x${line.quantity} @ ${line.soldPrice} - not applied, needs manual review`,
          });
        }
        continue;
      }

      toInsert.push(line);
    }

    const upload = await this.prisma.salesAnalysisUpload.create({
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
      await this.prisma.salesAnalysisRecord.createMany({
        data: toInsert.map(line => ({
          organizationId,
          uploadId: upload.id,
          billNumber: line.billNumber,
          lineSequence: line.lineSequence,
          transactionDate: line.transactionDate,
          accountName: line.accountName,
          customerName: line.customerName,
          salesmanName: line.salesmanName,
          itemRaw: line.itemRaw,
          productCode: line.productCode,
          quantity: line.quantity,
          soldPrice: line.soldPrice,
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
    return this.prisma.salesAnalysisUpload.findMany({
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

  // Profit for all three views below is resolved by cross-referencing the
  // matching Purchase Analysis upload (see ProfitResolutionService) - this
  // tool never reads this app's own Product catalog for cost data.

  async getSalesmenPerformance(organizationId: number, from: Date, to: Date) {
    const rows = (await this.profitResolution.getSalesmenWithProfit(organizationId, from, to)).sort(
      (a, b) => (b.totalProfit ?? -1) - (a.totalProfit ?? -1),
    );
    return { period: { from, to }, salesmen: rows };
  }

  async getProductsPerformance(organizationId: number, from: Date, to: Date) {
    const rows = (await this.profitResolution.getProductsWithProfit(organizationId, from, to)).sort(
      (a, b) => (b.totalProfit ?? b.totalRevenue) - (a.totalProfit ?? a.totalRevenue),
    );
    return { period: { from, to }, products: rows };
  }

  async getCustomersPerformance(organizationId: number, from: Date, to: Date) {
    const rows = (await this.profitResolution.getCustomersWithProfit(organizationId, from, to)).sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );
    return { period: { from, to }, customers: rows };
  }
}
