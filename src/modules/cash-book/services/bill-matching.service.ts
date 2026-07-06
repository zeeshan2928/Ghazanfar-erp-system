import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { matchingAlgorithm } from '../utils/matching-algorithm';

@Injectable()
export class BillMatchingService {
  constructor(private prisma: PrismaService) {}

  async getUnmatchedBills(organizationId: number) {
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        cashBookEntries: { none: {} },
      },
      select: {
        id: true,
        bill_number: true,
        total_amount: true,
        bill_date: true,
        customer: { select: { name: true } },
      },
    });

    return bills.map((bill: any) => ({
      id: bill.id,
      billNumber: bill.bill_number,
      amount: bill.total_amount,
      date: bill.bill_date,
      customerName: bill.customer?.name,
      referenceNumber: bill.bill_number,
    }));
  }

  async getMatchingCandidates(billId: number, organizationId: number) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill || bill.organizationId !== organizationId) {
      return [];
    }

    const entries = await this.prisma.cashBookEntry.findMany({
      where: {
        organizationId,
        linkedBillId: null,
        status: 'DRAFT',
      },
    });

    return matchingAlgorithm.matchBillToEntry(
      {
        amount: bill.total_amount,
        date: bill.bill_date,
        referenceNumber: bill.bill_number,
      },
      entries,
    );
  }

  async matchBillToEntry(
    billId: number,
    entryId: number,
    organizationId: number,
    userId: number,
    reason?: string,
  ) {
    const [bill, entry] = await Promise.all([
      this.prisma.bill.findUnique({ where: { id: billId } }),
      this.prisma.cashBookEntry.findUnique({ where: { id: entryId } }),
    ]);

    if (!bill || !entry || bill.organizationId !== organizationId) {
      throw new Error('Invalid bill or entry');
    }

    const match = await this.prisma.cashBookMatch.create({
      data: {
        organizationId,
        billId,
        entryId,
        matchedAmount: entry.amount,
        reason,
        status: 'CONFIRMED',
        createdBy: userId,
      },
    });

    // NOTE: CashBookEntryStatus has no SYNCED value (real values: DRAFT, POSTED,
    // RECONCILED, CANCELLED). Using POSTED as the closest equivalent to "matched
    // and finalized" - flagged for product review.
    await this.prisma.cashBookEntry.update({
      where: { id: entryId },
      data: { linkedBillId: billId, status: 'POSTED' },
    });

    return match;
  }

  async undoMatch(matchId: number, organizationId: number) {
    const match = await this.prisma.cashBookMatch.findUnique({
      where: { id: matchId },
    });

    if (!match || match.organizationId !== organizationId) {
      throw new Error('Match not found');
    }

    await this.prisma.cashBookEntry.update({
      where: { id: match.entryId },
      data: { linkedBillId: null, status: 'DRAFT' },
    });

    return this.prisma.cashBookMatch.update({
      where: { id: matchId },
      data: { status: 'UNDONE' },
    });
  }

  async batchAutoMatch(organizationId: number, userId: number) {
    const bills = await this.getUnmatchedBills(organizationId);
    const entries = await this.prisma.cashBookEntry.findMany({
      where: { organizationId, linkedBillId: null },
    });

    const matches = matchingAlgorithm.batchMatch(bills, entries);
    const results = [];

    for (const m of matches) {
      try {
        const result = await this.matchBillToEntry(
          m.billId,
          m.entryId,
          organizationId,
          userId,
          `Auto-matched (${m.confidence}% confidence)`,
        );
        results.push(result);
      } catch (error) {}
    }

    return results;
  }
}
