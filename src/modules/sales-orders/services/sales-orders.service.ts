import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { TransactionSequenceService } from '@common/services/transaction-sequence.service';
import { BillsService } from '../../bills/services/bills.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { ConvertToInvoiceDto } from '../dto/convert-to-invoice.dto';
import { SalesOrderStatus } from '@prisma/client';

@Injectable()
export class SalesOrdersService {
  constructor(
    private prisma: PrismaService,
    private transactionSequenceService: TransactionSequenceService,
    private billsService: BillsService,
  ) {}

  async create(organizationId: number, userId: number, dto: CreateSalesOrderDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId },
    });
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Sales order must have at least one line');
    }

    const orderNumber = await this.transactionSequenceService.getNext(
      organizationId,
      'SALES_ORDER',
      'SO',
    );

    return this.prisma.salesOrder.create({
      data: {
        organizationId,
        orderNumber,
        customerId: dto.customerId,
        salesmanId: dto.salesmanId,
        remarks: dto.remarks,
        createdBy: userId,
        lines: {
          createMany: {
            data: dto.lines.map(line => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.quantity * line.unitPrice,
            })),
          },
        },
      },
      include: { lines: { include: { product: true } }, customer: true },
    });
  }

  async findAll(organizationId: number, status?: SalesOrderStatus) {
    return this.prisma.salesOrder.findMany({
      where: { organizationId, ...(status && { status }) },
      include: { lines: { include: { product: true } }, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: number, id: number) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, organizationId },
      include: { lines: { include: { product: true } }, customer: true },
    });
    if (!order) {
      throw new NotFoundException('Sales order not found');
    }
    return order;
  }

  async cancel(organizationId: number, id: number) {
    const order = await this.findOne(organizationId, id);
    if (order.status === SalesOrderStatus.CONVERTED) {
      throw new BadRequestException('Cannot cancel a sales order that has already been converted to an invoice');
    }
    return this.prisma.salesOrder.update({
      where: { id: order.id },
      data: { status: SalesOrderStatus.CANCELLED },
    });
  }

  // Converts a Sales Order into a real Bill/Invoice, reusing BillsService.create
  // so it goes through the exact same inventory reservation + gate-pass +
  // invoice-numbering path as a direct invoice - a Sales Order is just a
  // recorded commitment beforehand, not a parallel fulfillment pipeline.
  async convertToInvoice(
    organizationId: number,
    userId: number,
    id: number,
    dto: ConvertToInvoiceDto,
  ) {
    const order = await this.findOne(organizationId, id);

    if (order.status === SalesOrderStatus.CONVERTED) {
      throw new BadRequestException('Sales order has already been converted to an invoice');
    }
    if (order.status === SalesOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot convert a cancelled sales order');
    }

    const customerPhone = dto.customerPhone?.trim() || order.customer.phone || undefined;
    if (!customerPhone) {
      throw new BadRequestException('Customer contact number is required to convert to an invoice');
    }

    const salesmanId = dto.salesmanId ?? order.salesmanId;
    if (!salesmanId) {
      throw new BadRequestException('A salesman is required to convert to an invoice');
    }

    const warehouseByLineId = new Map(dto.lineWarehouses.map(lw => [lw.salesOrderLineId, lw.warehouseId]));

    const lines = order.lines.map(line => {
      const warehouseId = warehouseByLineId.get(line.id);
      if (!warehouseId) {
        throw new BadRequestException(`Missing warehouse assignment for line ${line.id}`);
      }
      return {
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        warehouseId,
      };
    });

    const bill = await this.billsService.create(organizationId, userId, {
      customerId: order.customerId,
      customerPhone,
      salesmanId,
      channel: dto.channel,
      remarks: order.remarks ?? undefined,
      lines,
    });

    await this.prisma.salesOrder.update({
      where: { id: order.id },
      data: { status: SalesOrderStatus.CONVERTED, convertedBillId: bill.id },
    });

    return bill;
  }
}
