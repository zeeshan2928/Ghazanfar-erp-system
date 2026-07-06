import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CashBookCategory } from '@prisma/client';

// ==================== DTOs ====================

export interface CashBookKPIs {
  totalEntries: number;
  matchedCount: number;
  unmatchedCount: number;
  reconciliationPercentage: number;
  totalAmount: number;
  discrepancyAmount: number;
  oldestUnmatchedDays: number;
  avgMatchTime: number;
}

export interface CashFlowEntry {
  date: string;
  amount: number;
  category: 'sales' | 'purchases' | 'expenses';
}

export interface Discrepancy {
  id: number;
  type: string;
  description: string;
  amount: number;
  daysOld: number;
  severity: 'critical' | 'warning' | 'notice';
}

export interface UnmatchedItem {
  id: number;
  entryDate: string;
  referenceNumber: string;
  amount: number;
  description: string;
  daysOld: number;
  category: string;
}

// ==================== Service ====================

@Injectable()
export class CashBookReportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get KPIs for cash book reconciliation
   */
  async getKPIs(organizationId: number, fromDate: string, toDate: string): Promise<CashBookKPIs> {
    const dateFrom = new Date(fromDate);
    const dateTo = new Date(toDate);
    dateTo.setHours(23, 59, 59, 999);

    const entries = await this.prisma.cashBookEntry.findMany({
      where: {
        organizationId,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      include: {
        bill: {
          select: { id: true, total_amount: true, createdAt: true },
        },
      },
    });

    const matched = entries.filter(e => e.linkedBillId !== null);
    const unmatched = entries.filter(e => e.linkedBillId === null);

    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
    const matchedAmount = matched.reduce((sum, e) => sum + e.amount, 0);
    const unmatchedAmount = unmatched.reduce((sum, e) => sum + e.amount, 0);

    const reconciliationPercentage =
      entries.length > 0 ? (matched.length / entries.length) * 100 : 0;

    const now = new Date();
    const oldestUnmatched = unmatched.reduce((oldest, entry) => {
      const daysOld = Math.floor((now.getTime() - entry.date.getTime()) / (1000 * 60 * 60 * 24));
      return daysOld > oldest ? daysOld : oldest;
    }, 0);

    const avgMatchTime =
      matched.length > 0
        ? matched.reduce((sum, entry) => {
            const daysToMatch = entry.bill
              ? Math.floor(
                  (entry.bill.createdAt.getTime() - entry.date.getTime()) / (1000 * 60 * 60),
                )
              : 0;
            return sum + daysToMatch;
          }, 0) / matched.length
        : 0;

    return {
      totalEntries: entries.length,
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      reconciliationPercentage,
      totalAmount,
      discrepancyAmount: unmatchedAmount,
      oldestUnmatchedDays: oldestUnmatched,
      avgMatchTime,
    };
  }

  /**
   * Get cash flow analysis grouped by date, week, or month
   */
  async getCashFlow(
    organizationId: number,
    groupBy: 'day' | 'week' | 'month' = 'day',
    fromDate?: string,
    toDate?: string,
  ): Promise<CashFlowEntry[]> {
    const dateFrom = fromDate
      ? new Date(fromDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = toDate ? new Date(toDate) : new Date();
    dateTo.setHours(23, 59, 59, 999);

    const entries = await this.prisma.cashBookEntry.findMany({
      where: {
        organizationId,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      orderBy: { date: 'asc' },
    });

    const grouped: Record<string, Record<string, number>> = {};

    entries.forEach(entry => {
      let key: string;

      if (groupBy === 'day') {
        key = entry.date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const d = new Date(entry.date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = entry.date.toISOString().substring(0, 7);
      }

      if (!grouped[key]) {
        grouped[key] = { sales: 0, purchases: 0, expenses: 0 };
      }

      const category = this.mapEntryCategory(entry.category);
      grouped[key][category] += entry.amount;
    });

    const result: CashFlowEntry[] = [];
    Object.entries(grouped).forEach(([date, amounts]) => {
      if (amounts.sales > 0) result.push({ date, amount: amounts.sales, category: 'sales' });
      if (amounts.purchases > 0)
        result.push({ date, amount: amounts.purchases, category: 'purchases' });
      if (amounts.expenses > 0)
        result.push({ date, amount: amounts.expenses, category: 'expenses' });
    });

    return result;
  }

  /**
   * Get discrepancies and aging analysis
   */
  async getDiscrepancies(
    organizationId: number,
    fromDate?: string,
    toDate?: string,
    category?: string,
  ): Promise<Discrepancy[]> {
    const where: any = { organizationId };

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    if (category) {
      where.category = category;
    }

    const unmatchedEntries = await this.prisma.cashBookEntry.findMany({
      where: {
        ...where,
        linkedBillId: null,
      },
      orderBy: { date: 'asc' },
    });

    const now = new Date();
    const discrepancies: Discrepancy[] = unmatchedEntries.map(entry => {
      const daysOld = Math.floor((now.getTime() - entry.date.getTime()) / (1000 * 60 * 60 * 24));

      let severity: 'critical' | 'warning' | 'notice' = 'notice';
      if (daysOld > 60) severity = 'critical';
      else if (daysOld > 30) severity = 'warning';

      return {
        id: entry.id,
        type: entry.category,
        description: entry.description,
        amount: entry.amount,
        daysOld,
        severity,
      };
    });

    return discrepancies.sort((a, b) => b.daysOld - a.daysOld);
  }

  /**
   * Get unmatched items by age
   */
  async getUnmatchedItems(
    organizationId: number,
    ageingDays: number = 30,
  ): Promise<UnmatchedItem[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageingDays);

    const items = await this.prisma.cashBookEntry.findMany({
      where: {
        organizationId,
        linkedBillId: null,
        date: {
          lte: cutoffDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const now = new Date();
    return items.map(item => ({
      id: item.id,
      entryDate: item.date.toISOString().split('T')[0],
      referenceNumber: item.referenceNumber,
      amount: item.amount,
      description: item.description,
      daysOld: Math.floor((now.getTime() - item.date.getTime()) / (1000 * 60 * 60 * 24)),
      category: item.category,
    }));
  }

  /**
   * Export report as PDF or Excel (placeholder)
   */
  async exportReport(
    organizationId: number,
    format: 'pdf' | 'excel',
    fromDate: string,
    toDate: string,
  ): Promise<Buffer> {
    const kpis = await this.getKPIs(organizationId, fromDate, toDate);
    const cashFlow = await this.getCashFlow(organizationId, 'day', fromDate, toDate);
    const discrepancies = await this.getDiscrepancies(organizationId, fromDate, toDate);

    if (format === 'pdf') {
      return this.generatePDFReport({ kpis, cashFlow, discrepancies });
    } else {
      return this.generateExcelReport({ kpis, cashFlow, discrepancies });
    }
  }

  private generatePDFReport(data: any): Buffer {
    // Placeholder: In production, use a library like pdfkit or puppeteer
    const json = JSON.stringify(data, null, 2);
    return Buffer.from(json, 'utf-8');
  }

  private generateExcelReport(data: any): Buffer {
    // Placeholder: In production, use a library like xlsx
    const json = JSON.stringify(data, null, 2);
    return Buffer.from(json, 'utf-8');
  }

  /**
   * Map entry category to report category
   */
  private mapEntryCategory(category: CashBookCategory): 'sales' | 'purchases' | 'expenses' {
    switch (category) {
      case CashBookCategory.SALES_RECEIPT:
      case CashBookCategory.OTHER_INCOME:
      case CashBookCategory.LOAN_RECEIVED:
        return 'sales';
      case CashBookCategory.PURCHASE_PAYMENT:
        return 'purchases';
      case CashBookCategory.OPERATING_EXPENSE:
      case CashBookCategory.LOAN_PAYMENT:
      case CashBookCategory.EQUIPMENT:
      case CashBookCategory.OTHER_EXPENSE:
        return 'expenses';
      default:
        return 'expenses';
    }
  }
}
