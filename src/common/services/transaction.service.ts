import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async run<T>(callback: (prisma: PrismaService) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return callback(tx as unknown as PrismaService);
    });
  }
}
