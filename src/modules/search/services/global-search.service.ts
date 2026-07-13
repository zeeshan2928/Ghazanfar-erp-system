import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { tokenSearchWhere } from '@common/search/token-search';

export interface GlobalSearchResult {
  type:
    | 'bill'
    | 'purchase_order'
    | 'gate_pass'
    | 'journal_entry'
    | 'cash_book_entry'
    | 'customer'
    | 'vendor'
    | 'sales_order';
  id: number;
  title: string;
  subtitle: string;
}

@Injectable()
export class GlobalSearchService {
  constructor(private prisma: PrismaService) {}

  async search(organizationId: number, query: string, takePerType = 8): Promise<GlobalSearchResult[]> {
    const q = query.trim();
    if (!q) return [];

    const [bills, purchaseOrders, gatePasses, journalEntries, cashBookEntries, customers, vendors, salesOrders] =
      await Promise.all([
        this.prisma.bill.findMany({
          where: {
            organizationId,
            ...tokenSearchWhere(q, ['bill_number', 'remarks', 'customer.name', 'customer.phone']),
          },
          include: { customer: true },
          take: takePerType,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.purchaseOrder.findMany({
          where: {
            organizationId,
            ...tokenSearchWhere(q, ['po_number', 'manual_reference', 'vendor.name']),
          },
          include: { vendor: true },
          take: takePerType,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.gatePass.findMany({
          where: {
            organizationId,
            ...tokenSearchWhere(q, ['gate_pass_number']),
          },
          take: takePerType,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.journalEntry.findMany({
          where: {
            organizationId,
            ...tokenSearchWhere(q, ['entryNumber', 'reference', 'description']),
          },
          take: takePerType,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.cashBookEntry.findMany({
          where: {
            organizationId,
            ...tokenSearchWhere(q, ['entryNumber', 'referenceNumber', 'description']),
          },
          take: takePerType,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.customer.findMany({
          where: {
            organizationId,
            ...tokenSearchWhere(q, ['name', 'phone', 'email']),
          },
          take: takePerType,
          orderBy: { name: 'asc' },
        }),
        this.prisma.vendor.findMany({
          where: {
            organizationId,
            ...tokenSearchWhere(q, ['name', 'phone', 'email']),
          },
          take: takePerType,
          orderBy: { name: 'asc' },
        }),
        this.prisma.salesOrder.findMany({
          where: {
            organizationId,
            ...tokenSearchWhere(q, ['orderNumber', 'remarks', 'customer.name']),
          },
          include: { customer: true },
          take: takePerType,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const results: GlobalSearchResult[] = [];

    for (const bill of bills) {
      results.push({
        type: 'bill',
        id: bill.id,
        title: bill.bill_number,
        subtitle: `${bill.customer?.name || 'Unknown customer'} - ${bill.total_amount}`,
      });
    }

    for (const po of purchaseOrders) {
      results.push({
        type: 'purchase_order',
        id: po.id,
        title: po.po_number,
        subtitle: `${po.vendor?.name || 'Unknown vendor'} - ${po.po_amount}`,
      });
    }

    for (const gp of gatePasses) {
      results.push({
        type: 'gate_pass',
        id: gp.id,
        title: gp.gate_pass_number,
        subtitle: gp.status,
      });
    }

    for (const je of journalEntries) {
      results.push({
        type: 'journal_entry',
        id: je.id,
        title: je.entryNumber || `JE #${je.id}`,
        subtitle: je.description,
      });
    }

    for (const cb of cashBookEntries) {
      results.push({
        type: 'cash_book_entry',
        id: cb.id,
        title: cb.entryNumber || `CB #${cb.id}`,
        subtitle: cb.description,
      });
    }

    for (const customer of customers) {
      results.push({
        type: 'customer',
        id: customer.id,
        title: customer.name,
        subtitle: customer.phone || customer.email || '',
      });
    }

    for (const vendor of vendors) {
      results.push({
        type: 'vendor',
        id: vendor.id,
        title: vendor.name,
        subtitle: vendor.phone || vendor.email || '',
      });
    }

    for (const so of salesOrders) {
      results.push({
        type: 'sales_order',
        id: so.id,
        title: so.orderNumber,
        subtitle: `${so.customer?.name || 'Unknown customer'} - ${so.status}`,
      });
    }

    return results;
  }
}
