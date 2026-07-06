import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GL_UTILS } from '../../../common/utils/gl.utils';
import { JournalEntryLineDto } from '../dto/create-journal-entry.dto';
import { Prisma } from '@prisma/client';

/**
 * Core GL Posting Service
 * Handles posting journal entries to the general ledger
 * All posting operations are atomic (single transaction)
 */
@Injectable()
export class GLPostingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Post a journal entry and create GL postings
   * @param tx Prisma transaction client
   * @param organizationId Organization ID
   * @param entryId Journal entry ID
   * @throws BadRequestException if validation fails
   */
  async postEntry(
    tx: Prisma.TransactionClient | PrismaService,
    organizationId: number,
    entryId: number,
  ): Promise<void> {
    // Fetch the journal entry
    const entry = await tx.journalEntry.findFirst({
      where: { id: entryId, organizationId },
      include: { lines: true },
    });

    if (!entry) {
      throw new BadRequestException('Journal entry not found');
    }

    if (entry.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot post entry with status ${entry.status}`,
      );
    }

    // Validate the entry
    this.validateEntry(entry.lines);

    // Create GL postings for each line
    for (const line of entry.lines) {
      if (line.debitAmount > 0) {
        await tx.gLPosting.create({
          data: {
            organization: { connect: { id: organizationId } },
            account: { connect: { id: line.accountId } },
            postingDate: new Date(),
            transactionDate: entry.entryDate,
            reference: entry.reference || `JE-${entryId}`,
            debitAmount: line.debitAmount,
            creditAmount: 0,
            description: line.description || entry.description,
          },
        });
      }

      if (line.creditAmount > 0) {
        await tx.gLPosting.create({
          data: {
            organization: { connect: { id: organizationId } },
            account: { connect: { id: line.accountId } },
            postingDate: new Date(),
            transactionDate: entry.entryDate,
            reference: entry.reference || `JE-${entryId}`,
            debitAmount: 0,
            creditAmount: line.creditAmount,
            description: line.description || entry.description,
          },
        });
      }
    }

    // Update entry status to POSTED
    await tx.journalEntry.update({
      where: { id: entryId },
      data: {
        status: 'POSTED',
        postedDate: new Date(),
      },
    });
  }

  /**
   * Reverse a posted journal entry
   * Creates a mirror entry with reversed amounts
   * @param tx Prisma transaction client
   * @param organizationId Organization ID
   * @param entryId Original entry ID to reverse
   * @param reversalDate Date for the reversal entry
   * @returns The created reversal entry
   */
  async reverseEntry(
    tx: Prisma.TransactionClient | PrismaService,
    organizationId: number,
    entryId: number,
    reversalDate: Date,
  ): Promise<number> {
    // Fetch original entry
    const originalEntry = await tx.journalEntry.findFirst({
      where: { id: entryId, organizationId },
      include: { lines: true },
    });

    if (!originalEntry) {
      throw new BadRequestException('Journal entry not found');
    }

    if (originalEntry.status !== 'POSTED') {
      throw new BadRequestException(
        'Can only reverse POSTED entries',
      );
    }

    // Create reversal entry with mirror amounts
    const reversalEntry = await tx.journalEntry.create({
      data: {
        organizationId,
        entryDate: reversalDate,
        reference: originalEntry.reference
          ? `${originalEntry.reference}-REV`
          : undefined,
        description: `Reversal of ${originalEntry.description}`,
        status: 'DRAFT',
        reversalEntryId: entryId,
        memo: `Reversal entry for JE-${entryId}`,
      },
    });

    // Create reversed lines (debit becomes credit and vice versa)
    for (const line of originalEntry.lines) {
      await tx.journalEntryLine.create({
        data: {
          entryId: reversalEntry.id,
          accountId: line.accountId,
          description: line.description,
          debitAmount: line.creditAmount, // Reversed
          creditAmount: line.debitAmount, // Reversed
          lineNumber: line.lineNumber,
        },
      });
    }

    // Post the reversal entry
    await this.postEntry(tx, organizationId, reversalEntry.id);

    // Mark original as REVERSED
    await tx.journalEntry.update({
      where: { id: entryId },
      data: { status: 'REVERSED' },
    });

    return reversalEntry.id;
  }

  /**
   * Validate that a journal entry is balanced and properly formatted
   * @throws BadRequestException if validation fails
   */
  private validateEntry(lines: JournalEntryLineDto[]): void {
    if (lines.length < 2) {
      throw new BadRequestException(
        'Journal entry must have at least 2 lines',
      );
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      // Each line must have either debit or credit, not both
      if (line.debitAmount > 0 && line.creditAmount > 0) {
        throw new BadRequestException(
          `Line ${line.lineNumber} has both debit and credit amounts`,
        );
      }

      // At least one side must be non-zero
      if (line.debitAmount === 0 && line.creditAmount === 0) {
        throw new BadRequestException(
          `Line ${line.lineNumber} has zero amount on both sides`,
        );
      }

      totalDebit += line.debitAmount;
      totalCredit += line.creditAmount;
    }

    // Validate balanced
    GL_UTILS.validateBalanced(totalDebit, totalCredit);
  }

  /**
   * Get account balance as of a specific date
   * Aggregates all GL postings for the account up to that date
   * @param organizationId Organization ID
   * @param accountId Account ID
   * @param asOfDate Date to calculate balance as of
   */
  async getAccountBalance(
    organizationId: number,
    accountId: number,
    asOfDate: Date,
  ): Promise<{ debit: number; credit: number; balance: number }> {
    const postings = await this.prisma.gLPosting.aggregate({
      where: {
        organizationId,
        accountId,
        postingDate: { lte: asOfDate },
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const debit = postings._sum.debitAmount || 0;
    const credit = postings._sum.creditAmount || 0;

    // Get account type to determine balance
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { id: accountId },
    });

    let balance = 0;
    if (account) {
      balance = GL_UTILS.calculateBalance(account.accountType, debit, credit);
    }

    return { debit, credit, balance };
  }

  /**
   * Get balances for multiple accounts
   */
  async getAccountBalances(
    organizationId: number,
    accountIds: number[],
    asOfDate: Date,
  ): Promise<Map<number, { debit: number; credit: number; balance: number }>> {
    const result = new Map();

    for (const accountId of accountIds) {
      result.set(
        accountId,
        await this.getAccountBalance(organizationId, accountId, asOfDate),
      );
    }

    return result;
  }
}
