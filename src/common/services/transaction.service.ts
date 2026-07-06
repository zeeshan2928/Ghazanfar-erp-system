import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Run a database transaction with proper type safety
   *
   * Usage:
   *   await this.transactionService.run(async (tx) => {
   *     const bill = await tx.bill.create({ data: {...} });
   *     const gatePass = await tx.gatePass.create({ data: {...} });
   *     return { bill, gatePass };
   *   });
   */
  async run<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async tx => {
      return callback(tx);
    });
  }
}
