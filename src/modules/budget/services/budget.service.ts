import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GLPostingService } from '../../journal-entries/services/gl-posting.service';
import { CreateBudgetDto, UpdateBudgetDto, BudgetVarianceDto } from '../dto/create-budget.dto';

@Injectable()
export class BudgetService {
  constructor(
    private prisma: PrismaService,
    private glPosting: GLPostingService,
  ) {}

  async createBudget(organizationId: number, createDto: CreateBudgetDto) {
    return this.prisma.budget.create({
      data: {
        organizationId,
        accountId: createDto.accountId,
        fiscalYear: createDto.fiscalYear,
        budgetAmount: createDto.budgetAmount,
        period: createDto.period,
        notes: createDto.notes,
      },
      include: {
        account: true,
      },
    });
  }

  async getBudgets(organizationId: number, fiscalYear?: number) {
    return this.prisma.budget.findMany({
      where: {
        organizationId,
        ...(fiscalYear && { fiscalYear }),
      },
      include: {
        account: true,
      },
      orderBy: { fiscalYear: 'desc' },
    });
  }

  async getBudget(organizationId: number, budgetId: number) {
    return this.prisma.budget.findFirst({
      where: {
        id: budgetId,
        organizationId,
      },
      include: {
        account: true,
      },
    });
  }

  async updateBudget(organizationId: number, budgetId: number, updateDto: UpdateBudgetDto) {
    return this.prisma.budget.update({
      where: { id: budgetId },
      data: {
        budgetAmount: updateDto.budgetAmount,
        notes: updateDto.notes,
      },
      include: {
        account: true,
      },
    });
  }

  async deleteBudget(organizationId: number, budgetId: number) {
    return this.prisma.budget.delete({
      where: { id: budgetId },
    });
  }

  async getVarianceReport(
    organizationId: number,
    fiscalYear: number,
  ): Promise<BudgetVarianceDto[]> {
    const budgets = await this.prisma.budget.findMany({
      where: {
        organizationId,
        fiscalYear,
      },
      include: {
        account: true,
      },
    });

    const fiscalYearStart = new Date(fiscalYear, 0, 1);
    const fiscalYearEnd = new Date(fiscalYear, 11, 31);

    const variances: BudgetVarianceDto[] = [];

    for (const budget of budgets) {
      const balance = await this.glPosting.getAccountBalance(
        organizationId,
        budget.accountId,
        fiscalYearEnd,
      );

      const balanceAmount =
        typeof balance === 'object' && balance !== null
          ? (balance as any).balance || 0
          : (balance as any) || 0;
      const budgetAmount = budget.budgetAmount || 0;
      const variance = balanceAmount - budgetAmount;
      const variancePercent =
        budgetAmount !== 0 ? (variance / budgetAmount) * 100 : variance !== 0 ? 100 : 0;

      variances.push({
        accountId: budget.accountId,
        accountCode: budget.account.accountCode,
        accountName: budget.account.accountName,
        budgetAmount,
        actualAmount: balanceAmount,
        variance,
        variancePercent,
      });
    }

    return variances.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }
}
