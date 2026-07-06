import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ArAgingSummaryDto, ApAgingSummaryDto, AgingBucketDto, ArApAgingReportDto } from '../dto/aging-summary.dto';

interface AgingData {
  id: number;
  amount: number;
  daysOverdue: number;
  ageingBucket: string;
  asOfDate: Date;
}

@Injectable()
export class ArApAgingService {
  constructor(private prisma: PrismaService) {}

  // Generates AR aging report (customer/bill aging)
  async generateArAging(organizationId: number, asOfDate: Date = new Date()): Promise<void> {
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        isActive: true,
        status: { in: ['APPROVED', 'FULFILLED'] },
      },
      include: { customer: true },
    });

    const agingRecords: Array<{
      organizationId: number;
      billId: number;
      customerId: number;
      amount: number;
      days_overdue: number;
      ageing_bucket: string;
      as_of_date: Date;
    }> = [];

    for (const bill of bills) {
      const outstanding = (bill.total_amount || 0) - (bill.amount_paid || 0);
      if (outstanding <= 0) continue; // Skip fully paid bills

      // Calculate days overdue from due_date or bill_date
      const referenceDate = bill.due_date || bill.bill_date;
      const daysOverdue = Math.floor(
        (asOfDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const ageingBucket = this.getAgingBucket(daysOverdue);

      agingRecords.push({
        organizationId,
        billId: bill.id,
        customerId: bill.customerId,
        amount: outstanding,
        days_overdue: Math.max(0, daysOverdue),
        ageing_bucket: ageingBucket,
        as_of_date: asOfDate,
      });
    }

    if (agingRecords.length > 0) {
      await this.prisma.arAging.createMany({
        data: agingRecords,
        skipDuplicates: false,
      });
    }
  }

  // Generates AP aging report (vendor/PO aging)
  async generateApAging(organizationId: number, asOfDate: Date = new Date()): Promise<void> {
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        isActive: true,
        status: { in: ['SENT', 'PARTIAL_RECEIVED', 'RECEIVED'] },
      },
      include: { vendor: true },
    });

    const agingRecords: Array<{
      organizationId: number;
      purchaseOrderId: number;
      vendorId: number;
      amount: number;
      days_overdue: number;
      ageing_bucket: string;
      as_of_date: Date;
    }> = [];

    for (const po of purchaseOrders) {
      const outstanding = (po.po_amount || 0) - (po.amount_paid || 0);
      if (outstanding <= 0) continue; // Skip fully paid POs

      // Calculate days overdue from due_date or created_date
      const referenceDate = po.due_date || po.createdAt;
      const daysOverdue = Math.floor(
        (asOfDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const ageingBucket = this.getAgingBucket(daysOverdue);

      agingRecords.push({
        organizationId,
        purchaseOrderId: po.id,
        vendorId: po.vendorId,
        amount: outstanding,
        days_overdue: Math.max(0, daysOverdue),
        ageing_bucket: ageingBucket,
        as_of_date: asOfDate,
      });
    }

    if (agingRecords.length > 0) {
      await this.prisma.apAging.createMany({
        data: agingRecords,
        skipDuplicates: false,
      });
    }
  }

  // Get AR aging report by customer or all customers
  async getArAgingReport(
    organizationId: number,
    customerId?: number,
    asOfDate: Date = new Date(),
  ): Promise<ArAgingSummaryDto[]> {
    const agingRecords = await this.prisma.arAging.findMany({
      where: {
        organizationId,
        ...(customerId && { customerId }),
        as_of_date: { lte: asOfDate },
      },
      include: { bill: { include: { customer: true } } },
      orderBy: [{ customerId: 'asc' }, { days_overdue: 'desc' }],
    });

    // Group by customer
    const grouped = new Map<number, (typeof agingRecords)>();
    for (const record of agingRecords) {
      const cId = record.customerId || 0;
      if (!grouped.has(cId)) grouped.set(cId, []);
      grouped.get(cId)!.push(record);
    }

    const summaries: ArAgingSummaryDto[] = [];

    for (const [cId, records] of grouped) {
      // Get latest record per bucket
      const bucketMap = new Map<string, { count: number; amount: number }>();

      for (const record of records) {
        const bucket = record.ageing_bucket;
        if (!bucketMap.has(bucket)) {
          bucketMap.set(bucket, { count: 0, amount: 0 });
        }
        const entry = bucketMap.get(bucket)!;
        entry.count++;
        entry.amount += record.amount;
      }

      const buckets: AgingBucketDto[] = [];
      for (const [bucket, data] of bucketMap) {
        buckets.push({ bucket, count: data.count, totalAmount: data.amount });
      }

      buckets.sort((a, b) => {
        const order = { '0-10': 0, '10-20': 1, '20-30': 2, '30+': 3 };
        return (order[a.bucket] ?? 999) - (order[b.bucket] ?? 999);
      });

      const totalOutstanding = buckets.reduce((sum, b) => sum + b.totalAmount, 0);
      const customerName = records[0]?.bill?.customer?.name || 'Unknown';

      summaries.push({
        customerId: cId || undefined,
        customerName: cId ? customerName : undefined,
        buckets,
        totalOutstanding,
        asOfDate: asOfDate.toISOString().split('T')[0],
      });
    }

    return summaries;
  }

  // Get AP aging report by vendor or all vendors
  async getApAgingReport(
    organizationId: number,
    vendorId?: number,
    asOfDate: Date = new Date(),
  ): Promise<ApAgingSummaryDto[]> {
    const agingRecords = await this.prisma.apAging.findMany({
      where: {
        organizationId,
        ...(vendorId && { vendorId }),
        as_of_date: { lte: asOfDate },
      },
      include: { purchaseOrder: { include: { vendor: true } } },
      orderBy: [{ vendorId: 'asc' }, { days_overdue: 'desc' }],
    });

    // Group by vendor
    const grouped = new Map<number, (typeof agingRecords)>();
    for (const record of agingRecords) {
      const vId = record.vendorId || 0;
      if (!grouped.has(vId)) grouped.set(vId, []);
      grouped.get(vId)!.push(record);
    }

    const summaries: ApAgingSummaryDto[] = [];

    for (const [vId, records] of grouped) {
      // Get latest record per bucket
      const bucketMap = new Map<string, { count: number; amount: number }>();

      for (const record of records) {
        const bucket = record.ageing_bucket;
        if (!bucketMap.has(bucket)) {
          bucketMap.set(bucket, { count: 0, amount: 0 });
        }
        const entry = bucketMap.get(bucket)!;
        entry.count++;
        entry.amount += record.amount;
      }

      const buckets: AgingBucketDto[] = [];
      for (const [bucket, data] of bucketMap) {
        buckets.push({ bucket, count: data.count, totalAmount: data.amount });
      }

      buckets.sort((a, b) => {
        const order = { '0-10': 0, '10-20': 1, '20-30': 2, '30+': 3 };
        return (order[a.bucket] ?? 999) - (order[b.bucket] ?? 999);
      });

      const totalOutstanding = buckets.reduce((sum, b) => sum + b.totalAmount, 0);
      const vendorName = records[0]?.purchaseOrder?.vendor?.name || 'Unknown';

      summaries.push({
        vendorId: vId || undefined,
        vendorName: vId ? vendorName : undefined,
        buckets,
        totalOutstanding,
        asOfDate: asOfDate.toISOString().split('T')[0],
      });
    }

    return summaries;
  }

  // Get combined AR/AP aging report
  async getArApAgingReport(
    organizationId: number,
    asOfDate: Date = new Date(),
  ): Promise<ArApAgingReportDto> {
    const [arSummaries, apSummaries] = await Promise.all([
      this.getArAgingReport(organizationId, undefined, asOfDate),
      this.getApAgingReport(organizationId, undefined, asOfDate),
    ]);

    const totalArOutstanding = arSummaries.reduce((sum, s) => sum + s.totalOutstanding, 0);
    const totalApOutstanding = apSummaries.reduce((sum, s) => sum + s.totalOutstanding, 0);

    return {
      organizationId,
      reportDate: asOfDate.toISOString().split('T')[0],
      arSummaries,
      apSummaries,
      totalArOutstanding,
      totalApOutstanding,
    };
  }

  private getAgingBucket(daysOverdue: number): string {
    if (daysOverdue < 10) return '0-10';
    if (daysOverdue < 20) return '10-20';
    if (daysOverdue < 30) return '20-30';
    return '30+';
  }
}
