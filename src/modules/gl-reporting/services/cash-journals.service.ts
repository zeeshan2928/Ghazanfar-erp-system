import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface CashJournalContraLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface CashJournalEntry {
  entryId: number;
  date: string;
  reference: string | null;
  description: string;
  cashAccountCode: string;
  cashAccountName: string;
  amount: number;
  contraLines: CashJournalContraLine[];
}

export interface CashJournalReport {
  from: string;
  to: string;
  entries: CashJournalEntry[];
  total: number;
}

@Injectable()
export class CashJournalsService {
  constructor(private prisma: PrismaService) {}

  // Cash Receipts Journal: every posted journal entry line that debited a
  // cash-flagged account (money coming in), with the offsetting line(s)
  // from the same entry shown as context (what the receipt was for).
  async getCashReceiptsJournal(
    organizationId: number,
    from: Date,
    to: Date,
  ): Promise<CashJournalReport> {
    return this.getCashJournal(organizationId, from, to, 'debit');
  }

  // Cash Disbursements Journal: same, but for lines that credited a
  // cash-flagged account (money going out).
  async getCashDisbursementsJournal(
    organizationId: number,
    from: Date,
    to: Date,
  ): Promise<CashJournalReport> {
    return this.getCashJournal(organizationId, from, to, 'credit');
  }

  private async getCashJournal(
    organizationId: number,
    from: Date,
    to: Date,
    side: 'debit' | 'credit',
  ): Promise<CashJournalReport> {
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        account: { organizationId, isCashAccount: true },
        ...(side === 'debit' ? { debitAmount: { gt: 0 } } : { creditAmount: { gt: 0 } }),
        entry: {
          organizationId,
          status: 'POSTED',
          entryDate: { gte: from, lte: to },
        },
      },
      include: {
        account: true,
        entry: { include: { lines: { include: { account: true } } } },
      },
      orderBy: { entry: { entryDate: 'asc' } },
    });

    const entries: CashJournalEntry[] = lines.map((line) => {
      const contraLines = line.entry.lines
        .filter((l) => l.id !== line.id)
        .map((l) => ({
          accountCode: l.account.accountCode,
          accountName: l.account.accountName,
          debit: l.debitAmount,
          credit: l.creditAmount,
        }));

      return {
        entryId: line.entry.id,
        date: line.entry.entryDate.toISOString().split('T')[0],
        reference: line.entry.reference,
        description: line.entry.description,
        cashAccountCode: line.account.accountCode,
        cashAccountName: line.account.accountName,
        amount: side === 'debit' ? line.debitAmount : line.creditAmount,
        contraLines,
      };
    });

    const total = entries.reduce((sum, e) => sum + e.amount, 0);

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      entries,
      total,
    };
  }
}
