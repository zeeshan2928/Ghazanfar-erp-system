import { Injectable } from '@nestjs/common';
import { AccountCategory, AccountType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { GLPostingService } from '../../journal-entries/services/gl-posting.service';
import { GL_UTILS } from '../../../common/utils/gl.utils';

export interface IncomeStatementLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  amount: number; // In cents
}

export interface IncomeStatementSubsection {
  category: string; // AccountCategory value, or 'UNCATEGORIZED'
  label: string;
  lines: IncomeStatementLine[];
  total: number;
}

export interface IncomeStatementSection {
  section: 'REVENUE' | 'EXPENSE';
  subsections: IncomeStatementSubsection[];
  total: number;
}

export interface IncomeStatement {
  period: {
    from: string;
    to: string;
  };
  revenue: IncomeStatementSection;
  expenses: IncomeStatementSection;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

// Mirrors SUBSECTION_ORDER in balance-sheet.service.ts. 'UNCATEGORIZED'
// always sorts last within its type and catches accounts created before
// this field existed, or any custom account a user hasn't categorized -
// see ALLOWED_CATEGORIES_BY_TYPE in chart-of-accounts.service.ts for the
// source of truth on which category belongs to which type.
const SUBSECTION_ORDER: Record<AccountType, { category: string; label: string }[]> = {
  ASSET: [],
  LIABILITY: [],
  EQUITY: [],
  REVENUE: [
    { category: AccountCategory.SALES_REVENUE, label: 'Sales Revenue' },
    { category: AccountCategory.OTHER_REVENUE, label: 'Other Revenue' },
    { category: 'UNCATEGORIZED', label: 'Uncategorized' },
  ],
  EXPENSE: [
    { category: AccountCategory.COGS, label: 'Cost of Goods Sold' },
    { category: AccountCategory.OPERATING_EXPENSE, label: 'Operating Expenses' },
    { category: AccountCategory.NON_OPERATING_EXPENSE, label: 'Non-operating Expenses' },
    { category: AccountCategory.TAX_EXPENSE, label: 'Tax Expenses' },
    { category: 'UNCATEGORIZED', label: 'Uncategorized' },
  ],
};

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

    const linesByType: Record<AccountType, IncomeStatementLine[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    const categoryByAccountId = new Map<number, string>();

    for (const account of accounts) {
      const balance = balances.get(account.id);
      if (!balance || (balance.debit === 0 && balance.credit === 0)) continue;

      const amount = GL_UTILS.calculateBalance(
        account.accountType,
        balance.debit,
        balance.credit,
      );

      linesByType[account.accountType].push({
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        amount: Math.abs(amount), // Display as positive
      });
      categoryByAccountId.set(account.id, account.accountCategory || 'UNCATEGORIZED');
    }

    const buildSection = (
      section: 'REVENUE' | 'EXPENSE',
      accountType: AccountType,
    ): IncomeStatementSection => {
      const lines = linesByType[accountType];
      const subsections: IncomeStatementSubsection[] = [];

      for (const { category, label } of SUBSECTION_ORDER[accountType]) {
        const subsectionLines = lines
          .filter((line) => categoryByAccountId.get(line.accountId) === category)
          .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

        if (subsectionLines.length === 0) continue;

        subsections.push({
          category,
          label,
          lines: subsectionLines,
          total: subsectionLines.reduce((sum, line) => sum + line.amount, 0),
        });
      }

      const total = subsections.reduce((sum, sub) => sum + sub.total, 0);
      return { section, subsections, total };
    };

    const revenue = buildSection('REVENUE', 'REVENUE');
    const expenses = buildSection('EXPENSE', 'EXPENSE');

    const totalRevenue = revenue.total;
    const totalExpenses = expenses.total;
    const netIncome = totalRevenue - totalExpenses;

    return {
      period: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome,
    };
  }
}
