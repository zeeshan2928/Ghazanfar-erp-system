import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CreateBankStatementDto } from '../dto/create-bank-statement.dto';

@Injectable()
export class BankReconciliationService {
  constructor(private prisma: PrismaService) {}

  async uploadBankStatements(organizationId: number, statements: CreateBankStatementDto[]) {
    const created = await Promise.all(
      statements.map(stmt =>
        this.prisma.bankStatement.create({
          data: {
            organizationId,
            date: new Date(stmt.date),
            description: stmt.description,
            amount: stmt.amount,
            referenceNumber: stmt.referenceNumber,
          },
        }),
      ),
    );

    return {
      totalImported: created.length,
      statements: created,
    };
  }

  async processReconciliation(organizationId: number) {
    const entries = await this.prisma.cashBookEntry.findMany({
      where: { organizationId, status: 'POSTED' },
    });

    const bankStatements = await this.prisma.bankStatement.findMany({
      where: { organizationId },
    });

    const matches: any[] = [];
    const unmatched: any[] = [];

    for (const stmt of bankStatements) {
      let found = false;

      for (const entry of entries) {
        const amountDiff = Math.abs(stmt.amount - entry.amount);
        const dateDiff =
          Math.abs(new Date(stmt.date).getTime() - new Date(entry.date).getTime()) /
          (1000 * 60 * 60 * 24);

        if (amountDiff < 10000 && dateDiff <= 3) {
          matches.push({
            bankStatementId: stmt.id,
            entryId: entry.id,
            matchedAmount: entry.amount,
            confidence: 100 - (amountDiff / stmt.amount) * 100,
          });
          found = true;
          break;
        }
      }

      if (!found) {
        unmatched.push({
          id: stmt.id,
          date: stmt.date,
          description: stmt.description,
          amount: stmt.amount,
          referenceNumber: stmt.referenceNumber,
          days: Math.floor(
            (new Date().getTime() - new Date(stmt.date).getTime()) / (1000 * 60 * 60 * 24),
          ),
        });
      }
    }

    const reconciliationRate = Math.round((matches.length / bankStatements.length) * 100) || 0;

    return {
      totalStatements: bankStatements.length,
      totalMatched: matches.length,
      reconciliationRate,
      matches,
      unmatchedEntries: unmatched,
    };
  }

  async completeReconciliation(organizationId: number) {
    const updated = await this.prisma.cashBookEntry.updateMany({
      where: {
        organizationId,
        status: 'POSTED',
      },
      data: {
        status: 'RECONCILED',
      },
    });

    return {
      message: 'Reconciliation completed',
      updatedCount: updated.count,
    };
  }

  async getUnmatchedStatements(organizationId: number, daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.prisma.bankStatement.findMany({
      where: {
        organizationId,
        date: { lt: cutoffDate },
      },
      orderBy: { date: 'asc' },
    });
  }
}
