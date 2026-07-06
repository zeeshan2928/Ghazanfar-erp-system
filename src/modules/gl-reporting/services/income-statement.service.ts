import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GLPostingService } from '../../journal-entries/services/gl-posting.service';
import { GL_UTILS } from '../../../common/utils/gl.utils';

export interface IncomeStatementLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  amount: number; // In cents
}

export interface IncomeStatement {
  period: {
    from: string;
    to: string;
  };
  revenues: IncomeStatementLine[];
  totalRevenue: number;
  expenses: IncomeStatementLine[];
  totalExpenses: number;
  netIncome: number;
}

@Injectable()
export class IncomeStatementService {
  constructor(
    private prisma: PrismaService,
    private glPosting: GLPostingService,
  ) {}

  async getIncomeStatement(
    organizationId: number,
    from: Date,
    to: Date,
  ): Promise<IncomeStatement> {
    // Get all income statement accounts
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        isActive: true,
        accountType: { in: ['REVENUE', 'EXPENSE'] },
      },
    });

    // Get balances for all accounts (as of end of period)
    const balances = await this.glPosting.getAccountBalances(
      organizationId,
      accounts.map((a) => a.id),
      to,
    );

    // Separate into revenue and expense
    const revenues: IncomeStatementLine[] = [];
    const expenses: IncomeStatementLine[] = [];

    for (const account of accounts) {
      const balance = balances.get(account.id);
      if (!balance || (balance.debit === 0 && balance.credit === 0)) continue;

      const amount = GL_UTILS.calculateBalance(
        account.accountType,
        balance.debit,
        balance.credit,
      );

      const line: IncomeStatementLine = {
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        amount: Math.abs(amount), // Display as positive
      };

      if (account.accountType === 'REVENUE') {
        revenues.push(line);
      } else if (account.accountType === 'EXPENSE') {
        expenses.push(line);
      }
    }

    // Sort by account code
    revenues.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    expenses.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // Calculate totals
    const totalRevenue = revenues.reduce((sum, line) => sum + line.amount, 0);
    const totalExpenses = expenses.reduce((sum, line) => sum + line.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      period: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      revenues,
      totalRevenue,
      expenses,
      totalExpenses,
      netIncome,
    };
  }
}
