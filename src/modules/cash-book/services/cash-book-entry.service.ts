import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CreateCashBookEntryDto } from '../dto/create-entry.dto';
import { UpdateCashBookEntryDto } from '../dto/update-entry.dto';
import { LinkBillDto } from '../dto/link-bill.dto';
import { ICashBookEntry, EntryStatus } from '../entities/cash-book-entry.entity';

@Injectable()
export class CashBookEntryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new cash book entry
   */
  async createEntry(
    organizationId: number,
    userId: number,
    createDto: CreateCashBookEntryDto,
  ): Promise<ICashBookEntry> {
    // Validate linked bill if provided
    if (createDto.linkedBillId) {
      const bill = await this.prisma.bill.findFirst({
        where: {
          id: createDto.linkedBillId,
          organizationId,
        },
      });

      if (!bill) {
        throw new BadRequestException('Bill not found or does not belong to this organization');
      }
    }

    // Create entry
    const entry = await this.prisma.cashBookEntry.create({
      data: {
        organizationId,
        date: createDto.date,
        amount: createDto.amount,
        description: createDto.description,
        category: createDto.category,
        paymentMethod: createDto.paymentMethod,
        referenceNumber: createDto.referenceNumber,
        linkedBillId: createDto.linkedBillId,
        status: EntryStatus.DRAFT,
        createdBy: userId,
        notes: createDto.notes,
      },
    });

    return entry as ICashBookEntry;
  }

  /**
   * Get all entries for organization with filtering and pagination
   */
  async getEntries(
    organizationId: number,
    filters?: {
      category?: string;
      paymentMethod?: string;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
      linkedBillId?: number;
    },
    skip: number = 0,
    take: number = 20,
  ) {
    const where: any = { organizationId };

    if (filters?.category) where.category = filters.category;
    if (filters?.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters?.status) where.status = filters.status;
    if (filters?.linkedBillId) where.linkedBillId = filters.linkedBillId;

    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = filters.dateFrom;
      if (filters.dateTo) where.date.lte = filters.dateTo;
    }

    const [entries, total] = await Promise.all([
      this.prisma.cashBookEntry.findMany({
        where,
        include: {
          bill: {
            select: {
              id: true,
              bill_number: true,
              total_amount: true,
              customer: { select: { name: true } },
            },
          },
          createdByUser: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      this.prisma.cashBookEntry.count({ where }),
    ]);

    return {
      data: entries as ICashBookEntry[],
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get single entry by ID
   */
  async getEntryById(organizationId: number, entryId: number): Promise<ICashBookEntry> {
    const entry = await this.prisma.cashBookEntry.findFirst({
      where: {
        id: entryId,
        organizationId,
      },
      include: {
        bill: {
          select: {
            id: true,
            bill_number: true,
            total_amount: true,
            customer: { select: { name: true } },
          },
        },
        createdByUser: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Cash book entry not found');
    }

    return entry as ICashBookEntry;
  }

  /**
   * Update entry
   */
  async updateEntry(
    organizationId: number,
    entryId: number,
    updateDto: UpdateCashBookEntryDto,
  ): Promise<ICashBookEntry> {
    const entry = await this.getEntryById(organizationId, entryId);

    // Don't allow updating posted or reconciled entries
    if ([EntryStatus.POSTED, EntryStatus.RECONCILED].includes(entry.status as EntryStatus)) {
      throw new BadRequestException(`Cannot update ${entry.status} entries`);
    }

    // Validate linked bill if changing it
    if (updateDto.linkedBillId !== undefined && updateDto.linkedBillId !== null) {
      const bill = await this.prisma.bill.findFirst({
        where: {
          id: updateDto.linkedBillId,
          organizationId,
        },
      });

      if (!bill) {
        throw new BadRequestException('Bill not found or does not belong to this organization');
      }
    }

    const updated = await this.prisma.cashBookEntry.update({
      where: { id: entryId },
      data: {
        ...updateDto,
        updatedAt: new Date(),
      },
    });

    return updated as ICashBookEntry;
  }

  /**
   * Delete entry
   */
  async deleteEntry(organizationId: number, entryId: number): Promise<void> {
    const entry = await this.getEntryById(organizationId, entryId);

    // Only draft entries can be deleted
    if (entry.status !== EntryStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT entries can be deleted');
    }

    await this.prisma.cashBookEntry.delete({
      where: { id: entryId },
    });
  }

  /**
   * Link an entry to a bill (for reconciliation)
   */
  async linkBill(
    organizationId: number,
    entryId: number,
    linkDto: LinkBillDto,
  ): Promise<ICashBookEntry> {
    // Verify bill exists
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: linkDto.billId,
        organizationId,
      },
    });

    if (!bill) {
      throw new BadRequestException('Bill not found');
    }

    // Verify amount matches if specified
    if (linkDto.partialAmount && linkDto.partialAmount > bill.total_amount) {
      throw new BadRequestException(
        `Partial amount (${linkDto.partialAmount}) cannot exceed bill total (${bill.total_amount})`,
      );
    }

    const entry = await this.getEntryById(organizationId, entryId);

    // Verify amount matches
    const expectedAmount = linkDto.partialAmount || bill.total_amount;
    if (entry.amount !== expectedAmount) {
      throw new BadRequestException(
        `Entry amount (${entry.amount}) does not match bill amount (${expectedAmount})`,
      );
    }

    const updated = await this.prisma.cashBookEntry.update({
      where: { id: entryId },
      data: {
        linkedBillId: linkDto.billId,
        status: EntryStatus.POSTED,
      },
    });

    return updated as ICashBookEntry;
  }

  /**
   * Post entry (finalize it)
   */
  async postEntry(organizationId: number, entryId: number): Promise<ICashBookEntry> {
    const entry = await this.getEntryById(organizationId, entryId);

    if (entry.status !== EntryStatus.DRAFT) {
      throw new BadRequestException(`Cannot post ${entry.status} entries`);
    }

    const updated = await this.prisma.cashBookEntry.update({
      where: { id: entryId },
      data: {
        status: EntryStatus.POSTED,
      },
    });

    return updated as ICashBookEntry;
  }

  /**
   * Get summary/dashboard data
   */
  async getSummary(organizationId: number, dateFrom?: Date, dateTo?: Date) {
    const where: any = { organizationId, status: EntryStatus.POSTED };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = dateFrom;
      if (dateTo) where.date.lte = dateTo;
    }

    const entries = await this.prisma.cashBookEntry.findMany({
      where,
    });

    // Calculate totals by category
    const byCategory = entries.reduce(
      (acc, entry) => {
        if (!acc[entry.category]) {
          acc[entry.category] = { inflow: 0, outflow: 0 };
        }
        // Sales receipts and loans received are inflows
        if (['SALES_RECEIPT', 'LOAN_RECEIVED', 'OTHER_INCOME'].includes(entry.category)) {
          acc[entry.category].inflow += entry.amount;
        } else {
          acc[entry.category].outflow += entry.amount;
        }
        return acc;
      },
      {} as Record<string, { inflow: number; outflow: number }>,
    );

    const totalInflow = entries
      .filter(e => ['SALES_RECEIPT', 'LOAN_RECEIVED', 'OTHER_INCOME'].includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);

    const totalOutflow = entries
      .filter(e => !['SALES_RECEIPT', 'LOAN_RECEIVED', 'OTHER_INCOME'].includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalInflow,
      totalOutflow,
      netCash: totalInflow - totalOutflow,
      byCategory,
      entriesCount: entries.length,
    };
  }
}
