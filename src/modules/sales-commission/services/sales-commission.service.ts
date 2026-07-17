import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { TransactionSequenceService } from '@common/services/transaction-sequence.service';
import { GLPostingService } from '../../journal-entries/services/gl-posting.service';
import {
  CreateCommissionRuleDto,
  CalculateCommissionDto,
  ApproveCommissionDto,
} from '../dto/sales-commission.dto';

@Injectable()
export class SalesCommissionService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
    private transactionSequenceService: TransactionSequenceService,
    private glPostingService: GLPostingService,
  ) {}

  async createCommissionRule(organizationId: number, createDto: CreateCommissionRuleDto) {
    const existing = await this.prisma.commissionRule.findFirst({
      where: {
        organizationId,
        name: createDto.name,
      },
    });

    if (existing) {
      throw new BadRequestException(`Commission rule "${createDto.name}" already exists`);
    }

    return this.prisma.commissionRule.create({
      data: {
        organizationId,
        name: createDto.name,
        description: createDto.description,
        ruleType: createDto.ruleType,
        percentage: createDto.percentage ? createDto.percentage.toString() : null,
        fixedAmount: createDto.fixedAmount,
        minSales: createDto.minSales,
        maxSales: createDto.maxSales,
      },
    });
  }

  async getCommissionRules(organizationId: number, skip = 0, take = 10) {
    const [data, total] = await Promise.all([
      this.prisma.commissionRule.findMany({
        where: { organizationId, isActive: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commissionRule.count({
        where: { organizationId, isActive: true },
      }),
    ]);

    return {
      data,
      total,
      page: Math.floor(skip / take) + 1,
      hasMore: skip + take < total,
    };
  }

  async getCommissionRuleById(organizationId: number, ruleId: number) {
    const rule = await this.prisma.commissionRule.findFirst({
      where: { id: ruleId, organizationId },
    });

    if (!rule) {
      throw new NotFoundException('Commission rule not found');
    }

    return rule;
  }

  async updateCommissionRule(
    organizationId: number,
    ruleId: number,
    updateDto: Partial<CreateCommissionRuleDto>,
  ) {
    const rule = await this.getCommissionRuleById(organizationId, ruleId);

    return this.prisma.commissionRule.update({
      where: { id: ruleId },
      data: {
        ...updateDto,
        percentage: updateDto.percentage ? updateDto.percentage.toString() : undefined,
      },
    });
  }

  async calculateCommission(
    organizationId: number,
    salesPersonId: number,
    calculateDto: CalculateCommissionDto,
  ) {
    const rule = await this.getCommissionRuleById(organizationId, calculateDto.ruleId);

    if (!rule.isActive) {
      throw new BadRequestException('Commission rule is not active');
    }

    let commissionAmount = 0;

    if (rule.ruleType === 'PERCENTAGE' && rule.percentage) {
      const percentage =
        typeof rule.percentage === 'string' ? parseFloat(rule.percentage) : Number(rule.percentage);
      commissionAmount = Math.floor((calculateDto.baseSales * percentage) / 100);
    } else if (rule.ruleType === 'FIXED') {
      commissionAmount = rule.fixedAmount || 0;
    } else if (rule.ruleType === 'TIERED') {
      if (rule.minSales && calculateDto.baseSales >= rule.minSales) {
        const percentage = rule.percentage
          ? typeof rule.percentage === 'string'
            ? parseFloat(rule.percentage)
            : Number(rule.percentage)
          : 0;
        commissionAmount = Math.floor((calculateDto.baseSales * percentage) / 100);
      }
    }

    return this.prisma.commissionCalculation.create({
      data: {
        organizationId,
        ruleId: calculateDto.ruleId,
        salesPersonId,
        period: calculateDto.period,
        startDate: calculateDto.startDate,
        endDate: calculateDto.endDate,
        baseSales: calculateDto.baseSales,
        commissionAmount,
        status: 'DRAFT',
      },
      include: {
        rule: true,
        salesperson: true,
      },
    });
  }

  async approveCommission(
    organizationId: number,
    commissionId: number,
    approverId: number,
    approveDto: ApproveCommissionDto,
  ) {
    const commission = await this.prisma.commissionCalculation.findFirst({
      where: { id: commissionId, organizationId },
    });

    if (!commission) {
      throw new NotFoundException('Commission calculation not found');
    }

    if (commission.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot approve commission with status ${commission.status}`);
    }

    return this.prisma.commissionCalculation.update({
      where: { id: commissionId },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvalDate: new Date(),
        notes: approveDto.notes,
      },
      include: {
        rule: true,
        salesperson: true,
      },
    });
  }

  // Mark an approved commission PAID and post it to the general ledger so it
  // lands in P&L: Dr Sales Commission Expense / Cr Cash. Atomic - the ledger
  // entry, its GL postings, and the PAID flag all commit together. Amounts are
  // already in the smallest unit (paisa) on both sides, so no conversion.
  async markAsPaid(organizationId: number, userId: number, commissionId: number) {
    const commission = await this.prisma.commissionCalculation.findFirst({
      where: { id: commissionId, organizationId },
      include: { salesperson: { select: { firstName: true, lastName: true } } },
    });
    if (!commission) throw new NotFoundException('Commission calculation not found');
    if (commission.status !== 'APPROVED') {
      throw new BadRequestException(
        `Only APPROVED commissions can be paid (this one is ${commission.status}).`,
      );
    }
    if (commission.commissionAmount <= 0) {
      throw new BadRequestException('Commission amount is zero - nothing to post.');
    }

    const expenseAccount = await this.findOrCreateCommissionExpenseAccount(organizationId);
    const cashAccount = await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        isActive: true,
        OR: [{ isCashAccount: true }, { accountCode: '1000' }],
      },
      orderBy: { isCashAccount: 'desc' },
    });
    if (!cashAccount) {
      throw new BadRequestException(
        'No cash account exists in the chart of accounts to pay commission from - add one first.',
      );
    }

    const entryNumber = await this.transactionSequenceService.getNext(
      organizationId,
      'JOURNAL_ENTRY',
      'JE',
    );
    const salesman = `${commission.salesperson?.firstName ?? ''} ${commission.salesperson?.lastName ?? ''}`.trim();

    await this.transactionService.run(async tx => {
      const entry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          entryDate: new Date(),
          reference: `COMM-${commission.id}`,
          description: `Sales commission paid${salesman ? ' to ' + salesman : ''}`,
          status: 'DRAFT',
          createdBy: userId,
          lines: {
            createMany: {
              data: [
                { accountId: expenseAccount.id, description: 'Commission expense', debitAmount: commission.commissionAmount, creditAmount: 0, lineNumber: 1 },
                { accountId: cashAccount.id, description: 'Commission paid in cash', debitAmount: 0, creditAmount: commission.commissionAmount, lineNumber: 2 },
              ],
            },
          },
        },
      });

      // Reuse the tested poster: validates the entry balances, writes GLPostings,
      // and flips it to POSTED.
      await this.glPostingService.postEntry(tx, organizationId, entry.id);

      await tx.commissionCalculation.update({
        where: { id: commission.id },
        data: { status: 'PAID' },
      });
    });

    return this.prisma.commissionCalculation.findFirst({
      where: { id: commissionId },
      include: { rule: true, salesperson: true },
    });
  }

  // The expense account commission payouts are booked to. Created once per org
  // if it has never had one (5000 is usually COGS, so start at 5100).
  private async findOrCreateCommissionExpenseAccount(organizationId: number) {
    const existing = await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        accountType: 'EXPENSE',
        accountName: { equals: 'Sales Commission Expense', mode: 'insensitive' },
      },
    });
    if (existing) return existing;

    let code = '5100';
    for (let n = 1; await this.prisma.chartOfAccount.findFirst({ where: { organizationId, accountCode: code }, select: { id: true } }); n++) {
      code = `51${String(n).padStart(2, '0')}`;
    }
    return this.prisma.chartOfAccount.create({
      data: {
        organizationId,
        accountCode: code,
        accountName: 'Sales Commission Expense',
        accountType: 'EXPENSE',
        description: 'Auto-created for commission payouts',
      },
    });
  }

  async getCommissionHistory(organizationId: number, salesPersonId: number, skip = 0, take = 10) {
    const [data, total] = await Promise.all([
      this.prisma.commissionCalculation.findMany({
        where: { organizationId, salesPersonId },
        include: {
          rule: true,
          salesperson: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take,
      }),
      this.prisma.commissionCalculation.count({
        where: { organizationId, salesPersonId },
      }),
    ]);

    return {
      data,
      total,
      page: Math.floor(skip / take) + 1,
      hasMore: skip + take < total,
    };
  }

  async getPeriodCommissionSummary(organizationId: number, startDate: Date, endDate: Date) {
    const commissions = await this.prisma.commissionCalculation.findMany({
      where: {
        organizationId,
        startDate: { gte: startDate },
        endDate: { lte: endDate },
      },
      include: {
        rule: true,
        salesperson: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { baseSales: 'desc' },
    });

    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalSales = commissions.reduce((sum, c) => sum + c.baseSales, 0);

    const bySalesperson = new Map<number, any>();
    for (const commission of commissions) {
      const key = commission.salesPersonId;
      const current = bySalesperson.get(key) || {
        salesPersonId: commission.salesPersonId,
        name: `${commission.salesperson.firstName} ${commission.salesperson.lastName}`,
        totalSales: 0,
        totalCommission: 0,
        commissionCount: 0,
      };
      current.totalSales += commission.baseSales;
      current.totalCommission += commission.commissionAmount;
      current.commissionCount++;
      bySalesperson.set(key, current);
    }

    return {
      period: { startDate, endDate },
      totalSales,
      totalCommission,
      averageCommissionPerSalesperson:
        bySalesperson.size > 0 ? totalCommission / bySalesperson.size : 0,
      bySalesperson: Array.from(bySalesperson.values()).sort(
        (a, b) => b.totalCommission - a.totalCommission,
      ),
      details: commissions,
    };
  }

  async setProductCommission(
    organizationId: number,
    productId: number,
    commissionRate: number,
    effectiveFrom: Date,
    effectiveTo?: Date,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.productCommission.create({
      data: {
        organizationId,
        productId,
        commissionRate: commissionRate.toString(),
        effectiveFrom,
        effectiveTo,
      },
    });
  }

  async getProductCommissions(organizationId: number, productId: number) {
    return this.prisma.productCommission.findMany({
      where: { organizationId, productId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
