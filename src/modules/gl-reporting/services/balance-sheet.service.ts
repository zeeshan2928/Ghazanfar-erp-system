import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GLPostingService } from '../../journal-entries/services/gl-posting.service';
import { GL_UTILS } from '../../../common/utils/gl.utils';

export interface BalanceSheetLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  amount: number; // In cents
}

export interface BalanceSheetSection {
  section: 'ASSETS' | 'LIABILITIES' | 'EQUITY';
  lines: BalanceSheetLine[];
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

    // Separate into sections
    const assets: BalanceSheetLine[] = [];
    const liabilities: BalanceSheetLine[] = [];
    const equity: BalanceSheetLine[] = [];

    for (const account of accounts) {
      const balance = balances.get(account.id);
      if (!balance || (balance.debit === 0 && balance.credit === 0)) continue;

      const amount = GL_UTILS.calculateBalance(
        account.accountType,
        balance.debit,
        balance.credit,
      );

      const line: BalanceSheetLine = {
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        amount,
      };

      if (account.accountType === 'ASSET') {
        assets.push(line);
      } else if (account.accountType === 'LIABILITY') {
        liabilities.push(line);
      } else if (account.accountType === 'EQUITY') {
        equity.push(line);
      }
    }

    // Sort by account code
    assets.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    liabilities.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    equity.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // Calculate totals
    const totalAssets = assets.reduce((sum, line) => sum + line.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, line) => sum + line.amount, 0);
    const totalEquity = equity.reduce((sum, line) => sum + line.amount, 0);

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      asOfDate: asOf.toISOString().split('T')[0],
      assets: {
        section: 'ASSETS',
        lines: assets,
        total: totalAssets,
      },
      liabilities: {
        section: 'LIABILITIES',
        lines: liabilities,
        total: totalLiabilities,
      },
      equity: {
        section: 'EQUITY',
        lines: equity,
        total: totalEquity,
      },
      isBalanced: totalAssets === totalLiabilitiesAndEquity,
      totalAssets,
      totalLiabilitiesAndEquity,
    };
  }
}
