import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

// Any Prisma client - the base one, or a transaction client passed in by a
// caller that is already inside $transaction().
type Db = PrismaService | Prisma.TransactionClient;

/**
 * The single source of truth for auto-generated document numbers.
 *
 * WHY THIS EXISTS. Every module used to roll its own numbering, and every
 * hand-rolled version was wrong in the same two ways:
 *
 *   count() + 1        - a row count is not a sequence. Delete one document
 *                        and the count goes backwards, so the next number
 *                        collides with one that already exists.
 *   MAX(existing) + 1  - same defect, plus it re-issues the number of a
 *                        deleted document (delete invoice 7 and the next
 *                        invoice is 7 again), and it re-reads every document
 *                        in the period on every single write.
 *
 * A counter fixes both: it only ever goes up. Deleting a document *burns* its
 * number - gaps are correct and expected. Numbers are identifiers, not a
 * population count.
 */
@Injectable()
export class TransactionSequenceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Next raw counter value. The caller formats the number itself - use this
   * (not getNext) when a module has a live number format that must not change.
   *
   * The increment is performed BY THE DATABASE (`increment: 1`), never
   * read-then-write in JS, so two concurrent creates can never receive the
   * same number.
   *
   * Pass `client` when already inside a $transaction so the counter bump
   * commits or rolls back with the document itself.
   */
  async getNextCounter(
    organizationId: number,
    docType: string,
    seedIfMissing = 0,
    client?: Prisma.TransactionClient,
  ): Promise<number> {
    const db: Db = client ?? this.prisma;

    await db.transactionSequence.upsert({
      where: { organizationId_docType: { organizationId, docType } },
      create: { organizationId, docType, currentCount: seedIfMissing },
      update: {},
    });

    const updated = await db.transactionSequence.update({
      where: { organizationId_docType: { organizationId, docType } },
      data: { currentCount: { increment: 1 } },
    });

    return updated.currentCount;
  }

  /**
   * Same, but for a module adopting this service when it ALREADY has
   * historical documents. `computeSeed` returns the highest sequence already
   * in use, so the counter continues the series instead of restarting at 1 and
   * colliding with existing rows.
   *
   * `computeSeed` runs at most ONCE per (organization, docType), ever - the
   * first time that counter is needed. Every call after that is a single
   * indexed counter update, so an O(n) backfill scan never sits on the hot path.
   */
  async getNextCounterSeeded(
    organizationId: number,
    docType: string,
    computeSeed: (db: Db) => Promise<number>,
    client?: Prisma.TransactionClient,
  ): Promise<number> {
    const db: Db = client ?? this.prisma;

    const existing = await db.transactionSequence.findUnique({
      where: { organizationId_docType: { organizationId, docType } },
      select: { id: true },
    });

    const seed = existing ? 0 : await computeSeed(db);
    return this.getNextCounter(organizationId, docType, seed, client);
  }

  /**
   * Highest numeric sequence already used by a set of document numbers.
   *
   * Only counts numbers in the exact expected shape. Anything else - a
   * hand-edited reference, an imported legacy number - is ignored rather than
   * parsed into NaN and silently poisoning the seed.
   */
  static highestSequence(numbers: string[], pattern: RegExp): number {
    let max = 0;
    for (const value of numbers) {
      const match = pattern.exec(value);
      if (!match) continue;
      const parsed = parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > max) max = parsed;
    }
    return max;
  }

  /** Legacy PREFIX-BLOCK-COUNT format (journal entries, cash book). */
  async getNext(organizationId: number, docType: string, prefix: string): Promise<string> {
    const seq = await this.prisma.transactionSequence.upsert({
      where: { organizationId_docType: { organizationId, docType } },
      create: { organizationId, docType },
      update: {},
    });

    let { currentBlock, currentCount } = seq;
    currentCount += 1;
    if (currentCount > 10000) {
      currentBlock += 1;
      currentCount = 1;
    }

    await this.prisma.transactionSequence.update({
      where: { organizationId_docType: { organizationId, docType } },
      data: { currentBlock, currentCount },
    });

    return `${prefix}-${currentBlock}-${String(currentCount).padStart(5, '0')}`;
  }
}
