import { Injectable } from '@nestjs/common';
import { AccountCategory, AccountType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { GLPostingService } from '../../journal-entries/services/gl-posting.service';
import { GL_UTILS } from '../../../common/utils/gl.utils';

export interface BalanceSheetLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  amount: number; // In cents
}

export interface BalanceSheetSubsection {
  category: string; // AccountCategory value, or 'UNCATEGORIZED'
  label: string;
  lines: BalanceSheetLine[];
  total: number;
}

export interface BalanceSheetSection {
  section: 'ASSETS' | 'LIABILITIES' | 'EQUITY';
  subsections: BalanceSheetSubsection[];
  total: number;
}

export interface BalanceSheet {
  asOfDate: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  isBalanced: boolean;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
}

// Display order + human label for each AccountCategory, grouped by the
// AccountType it belongs to. 'UNCATEGORIZED' always sorts last within its
// type and catches accounts created before this field existed, or any
// custom account a user hasn't categorized yet - see ALLOWED_CATEGORIES_BY_TYPE
// in chart-of-accounts.service.ts for the source of truth on which
// category belongs to which type.
const SUBSECTION_ORDER: Record<AccountType, { category: string; label: string }[]> = {
  ASSET: [
    { category: AccountCategory.CURRENT_ASSET, label: 'Current Assets' },
    { category: AccountCategory.FIXED_ASSET, label: 'Fixed Assets' },
    { category: AccountCategory.OTHER_ASSET, label: 'Other Assets' },
    { category: 'UNCATEGORIZED', label: 'Uncategorized' },
  ],
  LIABILITY: [
    { category: AccountCategory.CURRENT_LIABILITY, label: 'Current Liabilities' },
    { category: AccountCategory.LONG_TERM_LIABILITY, label: 'Long-term Liabilities' },
    { category: 'UNCATEGORIZED', label: 'Uncategorized' },
  ],
  EQUITY: [
    { category: AccountCategory.OWNER_EQUITY, label: 'Owner Equity' },
    { category: 'UNCATEGORIZED', label: 'Uncategorized' },
  ],
  REVENUE: [],
  EXPENSE: [],
};

@Injectable()
export class BalanceSheetService {
  constructor(
    private prisma: PrismaService,
    private glPosting: GLPostingService,
  ) {}

  async getBalanceSheet(organizationId: number, asOf: Date): Promise<BalanceSheet> {
    // Get all balance sheet accounts
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        isActive: true,
        accountType: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
      },
    });

    // Get balances for all accounts
    const balances = await this.glPosting.getAccountBalances(
      organizationId,
      accounts.map((a) => a.id),
      asOf,
    );

    const linesByType: Record<AccountType, BalanceSheetLine[]> = {
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
        amount,
      });
      categoryByAccountId.set(account.id, account.accountCategory || 'UNCATEGORIZED');
    }

    const buildSection = (
      section: 'ASSETS' | 'LIABILITIES' | 'EQUITY',
      accountType: AccountType,
    ): BalanceSheetSection => {
      const lines = linesByType[accountType];
      const subsections: BalanceSheetSubsection[] = [];

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

    const assets = buildSection('ASSETS', 'ASSET');
    const liabilities = buildSection('LIABILITIES', 'LIABILITY');
    const equity = buildSection('EQUITY', 'EQUITY');

    const totalAssets = assets.total;
    const totalLiabilitiesAndEquity = liabilities.total + equity.total;

    return {
      asOfDate: asOf.toISOString().split('T')[0],
      assets,
      liabilities,
      equity,
      isBalanced: totalAssets === totalLiabilitiesAndEquity,
      totalAssets,
      totalLiabilitiesAndEquity,
    };
  }
}
