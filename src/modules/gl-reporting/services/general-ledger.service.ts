import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GL_UTILS } from '../../../common/utils/gl.utils';

export interface GeneralLedgerTransaction {
  id: number;
  transactionDate: string;
  postingDate: string;
  reference: string | null;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedgerReport {
  account: {
    id: number;
    accountCode: string;
    accountName: string;
    accountType: string;
    isCashAccount: boolean;
  };
  from: string;
  to: string;
  openingBalance: number;
  transactions: GeneralLedgerTransaction[];
  closingBalance: number;
}

@Injectable()
export class GeneralLedgerService {
  constructor(private prisma: PrismaService) {}

  // Per-account transaction detail with a running balance - the "General
  // Ledger" / "Cash Account Register" report (same capability, the
  // frontend just points this at a cash-flagged account for the latter).
  //
  // Filters/sorts by postingDate (not transactionDate) to stay consistent
  // with how Trial Balance and Balance Sheet compute "as of" balances
  // (GLPostingService.getAccountBalance also cuts off on postingDate) -
  // otherwise this report's closing balance could disagree with Trial
  // Balance for the same date if an entry's postingDate and transactionDate
  // differ (e.g. a backdated entry posted later).
  async getAccountLedger(
    organizationId: number,
    accountId: number,
    from: Date,
    to: Date,
  ): Promise<GeneralLedgerReport> {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id: accountId, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const openingAgg = await this.prisma.gLPosting.aggregate({
      where: {
        organizationId,
        accountId,
        postingDate: { lt: from },
      },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const openingBalance = GL_UTILS.calculateBalance(
      account.accountType,
      openingAgg._sum.debitAmount || 0,
      openingAgg._sum.creditAmount || 0,
    );

    const postings = await this.prisma.gLPosting.findMany({
      where: {
        organizationId,
        accountId,
        postingDate: { gte: from, lte: to },
      },
      orderBy: [{ postingDate: 'asc' }, { id: 'asc' }],
    });

    let runningBalance = openingBalance;
    const transactions: GeneralLedgerTransaction[] = postings.map((posting) => {
      runningBalance += GL_UTILS.calculateBalance(
        account.accountType,
        posting.debitAmount,
        posting.creditAmount,
      );

      return {
        id: posting.id,
        transactionDate: posting.transactionDate.toISOString().split('T')[0],
        postingDate: posting.postingDate.toISOString().split('T')[0],
        reference: posting.reference,
        description: posting.description,
        debit: posting.debitAmount,
        credit: posting.creditAmount,
        runningBalance,
      };
    });

    return {
      account: {
        id: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        isCashAccount: account.isCashAccount,
      },
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      openingBalance,
      transactions,
      closingBalance: runningBalance,
    };
  }
}
