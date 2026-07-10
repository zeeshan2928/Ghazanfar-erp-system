import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

/**
 * Shared, reusable auto-numbering for any document type that doesn't
 * already have its own dedicated sequence (Bills use InvoiceSequence;
 * GatePass/PurchaseOrder generate their own numbers already). Produces
 * a non-editable transaction number like "JE-1-00042" - any manual
 * reference a user types stays a separate, secondary, optional field.
 */
@Injectable()
export class TransactionSequenceService {
  constructor(private prisma: PrismaService) {}

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
