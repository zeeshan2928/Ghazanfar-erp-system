import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateJournalEntryDto } from '../dto/create-journal-entry.dto';
import { ReverseEntryDto } from '../dto/reverse-entry.dto';
import { GLPostingService } from './gl-posting.service';
import { TransactionSequenceService } from '../../../common/services/transaction-sequence.service';

@Injectable()
export class JournalEntriesService {
  constructor(
    private prisma: PrismaService,
    private glPostingService: GLPostingService,
    private transactionSequenceService: TransactionSequenceService,
  ) {}

  async create(
    organizationId: number,
    userId: number,
    createDto: CreateJournalEntryDto,
  ) {
    // Validate lines
    if (!createDto.lines || createDto.lines.length < 2) {
      throw new BadRequestException(
        'Journal entry must have at least 2 lines',
      );
    }

    // Validate that all accounts exist and belong to org
    const accountIds = createDto.lines.map((l) => l.accountId);
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        id: { in: accountIds },
        organizationId,
        isActive: true,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more accounts not found');
    }

    const entryNumber = await this.transactionSequenceService.getNext(
      organizationId,
      'JOURNAL_ENTRY',
      'JE',
    );

    // Create entry in DRAFT status with lines
    const entry = await this.prisma.journalEntry.create({
      data: {
        organizationId,
        entryNumber,
        entryDate: new Date(createDto.entryDate),
        reference: createDto.reference,
        description: createDto.description,
        memo: createDto.memo,
        status: 'DRAFT',
        createdBy: userId,
        lines: {
          createMany: {
            data: createDto.lines.map((line) => ({
              accountId: line.accountId,
              description: line.description,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              lineNumber: line.lineNumber,
            })),
          },
        },
      },
      include: { lines: true },
    });

    return entry;
  }

  async findAll(
    organizationId: number,
    from?: Date,
    to?: Date,
    status?: string,
  ) {
    return this.prisma.journalEntry.findMany({
      where: {
        organizationId,
        ...(from && { entryDate: { gte: from } }),
        ...(to && { entryDate: { lte: to } }),
        ...(status && { status: status as any }),
      },
      include: { lines: true },
      orderBy: { entryDate: 'desc' },
    });
  }

  async findOne(organizationId: number, id: number) {
    return this.prisma.journalEntry.findFirst({
      where: { id, organizationId },
      include: { lines: true },
    });
  }

  async post(organizationId: number, id: number) {
    const entry = await this.findOne(organizationId, id);
    if (!entry) {
      throw new BadRequestException('Journal entry not found');
    }

    if (entry.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT entries can be posted');
    }

    // Post in transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      await this.glPostingService.postEntry(tx, organizationId, id);
    });

    return this.findOne(organizationId, id);
  }

  async reverse(
    organizationId: number,
    id: number,
    reverseDto: ReverseEntryDto,
  ) {
    const entry = await this.findOne(organizationId, id);
    if (!entry) {
      throw new BadRequestException('Journal entry not found');
    }

    if (entry.status !== 'POSTED') {
      throw new BadRequestException('Only POSTED entries can be reversed');
    }

    const reversalDate = new Date(reverseDto.reversalDate);
    let reversalEntryId: number;

    // Reverse in transaction
    await this.prisma.$transaction(async (tx) => {
      reversalEntryId = await this.glPostingService.reverseEntry(
        tx,
        organizationId,
        id,
        reversalDate,
      );
    });

    return this.findOne(organizationId, reversalEntryId!);
  }

  async getTrialBalance(organizationId: number, asOfDate: Date) {
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { organizationId, isActive: true },
    });

    const balances = await this.glPostingService.getAccountBalances(
      organizationId,
      accounts.map((a) => a.id),
      asOfDate,
    );

    // Map to trial balance format
    const trialBalanceAccounts = accounts
      .map((account) => {
        const balance = balances.get(account.id);
        return {
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          debit: balance?.debit || 0,
          credit: balance?.credit || 0,
          balance: balance?.balance || 0,
        };
      })
      .filter((item) => item.debit > 0 || item.credit > 0)
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const totalDebit = trialBalanceAccounts.reduce((sum, a) => sum + a.debit, 0);
    const totalCredit = trialBalanceAccounts.reduce((sum, a) => sum + a.credit, 0);

    return {
      asOfDate: asOfDate.toISOString().split('T')[0],
      accounts: trialBalanceAccounts,
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit,
    };
  }
}
