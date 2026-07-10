import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AccountType } from '@prisma/client';
import { ChartOfAccountsService } from '../../chart-of-accounts/services/chart-of-accounts.service';
import { JournalEntriesService } from '../../journal-entries/services/journal-entries.service';
import {
  CreateSalesmanProductCommissionDto,
  UpdateSalesmanProductCommissionDto,
} from '../dto/salesman-product-commission.dto';

const COMMISSION_EXPENSE_ACCOUNT = { code: '6250', name: 'Sales Commission Expense', type: 'EXPENSE' as const };
const COMMISSION_PAYABLE_ACCOUNT = { code: '2350', name: 'Commission Payable', type: 'LIABILITY' as const };

@Injectable()
export class SalesmanProductCommissionService {
  constructor(
    private prisma: PrismaService,
    private chartOfAccountsService: ChartOfAccountsService,
    private journalEntriesService: JournalEntriesService,
  ) {}

  async createAssignment(organizationId: number, dto: CreateSalesmanProductCommissionDto) {
    const [salesman, product] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: dto.salesmanId, organizationId } }),
      this.prisma.product.findFirst({ where: { id: dto.productId, organizationId } }),
    ]);

    if (!salesman) throw new BadRequestException('Salesman not found');
    if (!product) throw new BadRequestException('Product not found');

    return this.prisma.salesmanProductCommission.create({
      data: {
        organizationId,
        salesmanId: dto.salesmanId,
        productId: dto.productId,
        commissionType: dto.commissionType,
        rate: dto.rate,
        targetQuantity: dto.targetQuantity,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
      },
      include: { salesman: true, product: true },
    });
  }

  async listAssignments(organizationId: number, salesmanId?: number) {
    const assignments = await this.prisma.salesmanProductCommission.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(salesmanId ? { salesmanId } : {}),
      },
      include: { salesman: true, product: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(assignments.map(a => this.withComputedFields(a)));
  }

  private async withComputedFields(assignment: any) {
    // Net achieved quantity/value: SALE lines minus RETURN lines, for this
    // exact salesman+product, within the assignment's period.
    const lines = await this.prisma.billLine.findMany({
      where: {
        organizationId: assignment.organizationId,
        productId: assignment.productId,
        bill: {
          salesmanId: assignment.salesmanId,
          bill_date: { gte: assignment.periodStart, lte: assignment.periodEnd },
          isActive: true,
        },
      },
      include: { bill: { select: { transactionType: true } } },
    });

    let achievedQuantity = 0;
    let achievedValue = 0;
    for (const line of lines) {
      const sign = line.bill.transactionType === 'RETURN' ? -1 : 1;
      achievedQuantity += sign * line.quantity;
      achievedValue += sign * line.line_total;
    }
    achievedQuantity = Math.max(0, achievedQuantity);
    achievedValue = Math.max(0, achievedValue);

    const rate = Number(assignment.rate);
    const commissionEarned =
      assignment.commissionType === 'FIXED_PER_UNIT'
        ? achievedQuantity * rate
        : Math.round((achievedValue * rate) / 100);

    const progressPercent =
      assignment.targetQuantity > 0 ? Math.min(100, Math.round((achievedQuantity / assignment.targetQuantity) * 100)) : 0;

    return {
      ...assignment,
      achievedQuantity,
      achievedValue,
      commissionEarned,
      progressPercent,
    };
  }

  private async getAssignmentOrThrow(organizationId: number, id: number) {
    const assignment = await this.prisma.salesmanProductCommission.findFirst({
      where: { id, organizationId },
      include: { salesman: true, product: true },
    });
    if (!assignment) throw new NotFoundException('Commission assignment not found');
    return assignment;
  }

  async updateAssignment(organizationId: number, id: number, dto: UpdateSalesmanProductCommissionDto) {
    await this.getAssignmentOrThrow(organizationId, id);

    return this.prisma.salesmanProductCommission.update({
      where: { id },
      data: {
        commissionType: dto.commissionType,
        rate: dto.rate,
        targetQuantity: dto.targetQuantity,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
      },
      include: { salesman: true, product: true },
    });
  }

  async deactivateAssignment(organizationId: number, id: number) {
    await this.getAssignmentOrThrow(organizationId, id);
    return this.prisma.salesmanProductCommission.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async findOrCreateAccount(organizationId: number, spec: { code: string; name: string; type: 'EXPENSE' | 'LIABILITY' }) {
    const existing = await this.prisma.chartOfAccount.findFirst({
      where: { organizationId, accountName: spec.name },
    });
    if (existing) return existing;

    return this.chartOfAccountsService.create(organizationId, {
      accountCode: spec.code,
      accountName: spec.name,
      accountType: spec.type as AccountType,
    });
  }

  /**
   * Books the accrued commission as a journal entry (debit Commission
   * Expense, credit Commission Payable) - this records the liability, it
   * does not move real cash. Idempotent: a second call on an
   * already-paid assignment is rejected.
   */
  async markPaid(organizationId: number, id: number, userId: number) {
    const assignment = await this.getAssignmentOrThrow(organizationId, id);
    if (assignment.paidAt) {
      throw new BadRequestException('This commission has already been marked paid');
    }

    const computed = await this.withComputedFields(assignment);
    if (computed.commissionEarned <= 0) {
      throw new BadRequestException('No commission has been earned yet for this assignment');
    }

    const [expenseAccount, payableAccount] = await Promise.all([
      this.findOrCreateAccount(organizationId, COMMISSION_EXPENSE_ACCOUNT),
      this.findOrCreateAccount(organizationId, COMMISSION_PAYABLE_ACCOUNT),
    ]);

    const entry = await this.journalEntriesService.create(organizationId, userId, {
      entryDate: new Date().toISOString(),
      reference: `COMMISSION-${assignment.id}`,
      description: `Sales commission - ${assignment.salesman.firstName} ${assignment.salesman.lastName} / ${assignment.product.name}`,
      lines: [
        {
          accountId: expenseAccount.id,
          description: 'Commission expense accrued',
          debitAmount: computed.commissionEarned,
          creditAmount: 0,
          lineNumber: 1,
        },
        {
          accountId: payableAccount.id,
          description: 'Commission payable to salesman',
          debitAmount: 0,
          creditAmount: computed.commissionEarned,
          lineNumber: 2,
        },
      ],
    });

    await this.journalEntriesService.post(organizationId, entry.id);

    return this.prisma.salesmanProductCommission.update({
      where: { id },
      data: {
        paidAt: new Date(),
        paidAmount: computed.commissionEarned,
        journalEntryId: entry.id,
      },
      include: { salesman: true, product: true },
    });
  }
}
