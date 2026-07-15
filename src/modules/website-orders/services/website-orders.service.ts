import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { TransactionSequenceService } from '@common/services/transaction-sequence.service';
import { DOC_SEQUENCE, DOC_PATTERN } from '@common/config/document-sequences';
import { ApproveWebsiteOrderDto, RejectWebsiteOrderDto } from '../dto/website-order.dto';

@Injectable()
export class WebsiteOrdersService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
    private transactionSequenceService: TransactionSequenceService,
  ) {}

  async getPending(organizationId: number, skip = 0, take = 10) {
    const [orders, total] = await Promise.all([
      this.prisma.websiteOrder.findMany({
        where: {
          organizationId,
          status: 'PENDING_APPROVAL',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.websiteOrder.count({
        where: {
          organizationId,
          status: 'PENDING_APPROVAL',
        },
      }),
    ]);

    return {
      data: orders,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      hasMore: skip + take < total,
    };
  }

  async getById(organizationId: number, orderId: string) {
    const order = await this.prisma.websiteOrder.findFirst({
      where: {
        id: orderId,
        organizationId,
      },
    });

    if (!order) {
      throw new NotFoundException('Website order not found');
    }

    return order;
  }

  async approve(
    organizationId: number,
    orderId: string,
    userId: number,
    approveDto: ApproveWebsiteOrderDto,
  ) {
    return this.transactionService.run(async tx => {
      const order = await tx.websiteOrder.findFirst({
        where: {
          id: orderId,
          organizationId,
        },
      });

      if (!order) {
        throw new NotFoundException('Website order not found');
      }

      if (order.status !== 'PENDING_APPROVAL') {
        throw new BadRequestException(`Cannot approve order with status ${order.status}`);
      }

      // Verify customer exists
      const customer = await tx.customer.findUnique({
        where: { id: approveDto.customerId },
      });

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }

      // Parse items from JSON
      const itemsData = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      // Normalize to camelCase (legacy rows may have snake_case unit_price in stored JSON)
      const items: Array<{ productId: number; quantity: number; unitPrice: number }> = (
        itemsData as any[]
      ).map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? item.unit_price,
      }));

      // @ts-ignore - Prisma transaction type inference issue, logic is correct
      const bill = await tx.bill.create({
        data: {
          bill_number: await this.generateBillNumber(organizationId, tx),
          customerId: approveDto.customerId,
          salesmanId: userId,
          created_by: userId,
          organizationId,
          channel: 'WEBSITE',
          subtotal: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
          discount_amount: 0,
          discountPercentage: 0,
          tax_amount: 0,
          total_amount: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
          remarks: approveDto.remarks,
          status: 'APPROVED',
          lines: {
            create: items.map(item => ({
              organizationId,
              productId: item.productId,
              warehouseId: approveDto.warehouseId,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              line_total: item.quantity * item.unitPrice,
            })),
          },
        },
        include: {
          lines: {
            include: { product: true },
          },
          customer: true,
        },
      });

      // Fetch bill lines for inventory reservation and gate pass creation
      const billLines = await tx.billLine.findMany({
        where: { billId: bill.id },
        include: { product: true },
      });

      // Reserve inventory
      for (const line of billLines) {
        await tx.inventory.update({
          where: {
            organizationId_productId_warehouseId: {
              organizationId,
              productId: line.productId,
              warehouseId: line.warehouseId,
            },
          },
          data: {
            reserved: {
              increment: line.quantity,
            },
            available: {
              decrement: line.quantity,
            },
          },
        });
      }

      // Create gate pass
      const gatePassNumber = await this.generateGatePassNumber(organizationId, tx);
      await tx.gatePass.create({
        data: {
          organizationId,
          gate_pass_number: gatePassNumber,
          billId: bill.id,
          warehouseId: approveDto.warehouseId,
          status: 'PENDING',
          items: {
            create: billLines.map(line => ({
              organizationId,
              billLineId: line.id,
              productId: line.productId,
              quantity: line.quantity,
            })),
          },
        },
      });

      // Update website order status
      const approvedOrder = await tx.websiteOrder.update({
        where: { id: orderId },
        data: {
          status: 'APPROVED',
          approval_by: userId,
          approval_date: new Date(),
          synced_to_erp_bill_id: bill.id,
        },
      });

      return {
        order: approvedOrder,
        bill,
      };
    });
  }

  async reject(
    organizationId: number,
    orderId: string,
    userId: number,
    rejectDto: RejectWebsiteOrderDto,
  ) {
    const order = await this.prisma.websiteOrder.findFirst({
      where: {
        id: orderId,
        organizationId,
      },
    });

    if (!order) {
      throw new NotFoundException('Website order not found');
    }

    if (order.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Cannot reject order with status ${order.status}`);
    }

    return this.prisma.websiteOrder.update({
      where: { id: orderId },
      data: {
        status: 'REJECTED',
        approval_by: userId,
        approval_date: new Date(),
        rejection_reason: rejectDto.reason,
      },
    });
  }

  // Was MAX(existing) + 1 over every bill in the year: it re-issued the number
  // of a deleted bill, and re-read the whole year on every write. Counter now.
  private async generateBillNumber(
    organizationId: number,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();

    const next = await this.transactionSequenceService.getNextCounterSeeded(
      organizationId,
      DOC_SEQUENCE.websiteBill(year),
      async db => {
        const rows = await db.bill.findMany({
          where: { organizationId, bill_number: { startsWith: `BILL-${year}-` } },
          select: { bill_number: true },
        });
        return TransactionSequenceService.highestSequence(
          rows.map(r => r.bill_number),
          DOC_PATTERN.websiteBill(year),
        );
      },
      tx,
    );

    return `BILL-${year}-${String(next).padStart(6, '0')}`;
  }

  // Same GP-{year}-{nnnnnn} shape that bills.service.ts emits. These two used
  // to compute "next" independently, each blind to the other, so they would
  // eventually hand out the same gate pass number twice. They now share one
  // counter key (DOC_SEQUENCE.gatePassYearly), which makes that impossible.
  private async generateGatePassNumber(
    organizationId: number,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();

    const next = await this.transactionSequenceService.getNextCounterSeeded(
      organizationId,
      DOC_SEQUENCE.gatePassYearly(year),
      async db => {
        const rows = await db.gatePass.findMany({
          where: { organizationId, gate_pass_number: { startsWith: `GP-${year}-` } },
          select: { gate_pass_number: true },
        });
        return TransactionSequenceService.highestSequence(
          rows.map(r => r.gate_pass_number),
          DOC_PATTERN.gatePassYearly(year),
        );
      },
      tx,
    );

    return `GP-${year}-${String(next).padStart(6, '0')}`;
  }
}
