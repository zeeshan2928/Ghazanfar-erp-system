import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { ApproveWebsiteOrderDto, RejectWebsiteOrderDto } from '../dto/website-order.dto';

@Injectable()
export class WebsiteOrdersService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
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
    return this.transactionService.run(async (tx) => {
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
        throw new BadRequestException(
          `Cannot approve order with status ${order.status}`,
        );
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
      const items = itemsData as Array<{
        productId: number;
        quantity: number;
        unitPrice: number;
      }>;

      // Create bill from website order
      const bill = await tx.bill.create({
        data: {
          organizationId,
          billNumber: await this.generateBillNumber(organizationId, tx),
          customerId: approveDto.customerId,
          channel: 'WEBSITE',
          websiteOrderId: orderId,
          createdBy: userId,
          subtotal: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
          remarks: approveDto.remarks,
          status: 'APPROVED',
          lines: {
            create: items.map((item) => ({
              organizationId,
              productId: item.productId,
              warehouseId: approveDto.warehouseId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
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
          gatePassNumber,
          billId: bill.id,
          warehouseId: approveDto.warehouseId,
          status: 'PENDING',
          items: {
            create: billLines.map((line) => ({
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
          approvalBy: userId,
          approvalDate: new Date(),
          syncedToErpBillId: bill.id,
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
      throw new BadRequestException(
        `Cannot reject order with status ${order.status}`,
      );
    }

    return this.prisma.websiteOrder.update({
      where: { id: orderId },
      data: {
        status: 'REJECTED',
        approvalBy: userId,
        approvalDate: new Date(),
        rejectionReason: rejectDto.reason,
      },
    });
  }

  private async generateBillNumber(organizationId: number, tx: any): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();

    const lastBill = await tx.bill.findFirst({
      where: {
        organizationId,
        billNumber: {
          startsWith: `BILL-${year}-`,
        },
      },
      orderBy: { billNumber: 'desc' },
      select: { billNumber: true },
    });

    let sequence = 1;
    if (lastBill) {
      const parts = lastBill.billNumber.split('-');
      sequence = parseInt(parts[2], 10) + 1;
    }

    return `BILL-${year}-${String(sequence).padStart(6, '0')}`;
  }

  private async generateGatePassNumber(organizationId: number, tx: any): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();

    const lastGatePass = await tx.gatePass.findFirst({
      where: {
        organizationId,
        gatePassNumber: {
          startsWith: `GP-${year}-`,
        },
      },
      orderBy: { gatePassNumber: 'desc' },
      select: { gatePassNumber: true },
    });

    let sequence = 1;
    if (lastGatePass) {
      const parts = lastGatePass.gatePassNumber.split('-');
      sequence = parseInt(parts[2], 10) + 1;
    }

    return `GP-${year}-${String(sequence).padStart(6, '0')}`;
  }
}
