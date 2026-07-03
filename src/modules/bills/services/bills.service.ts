import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { CreateBillDto } from '../dto/create-bill.dto';

@Injectable()
export class BillsService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
  ) {}

  private async generateBillNumber(organizationId: number): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();

    const lastBill = await this.prisma.bill.findFirst({
      where: {
        organizationId,
        bill_number: {
          startsWith: `BILL-${year}-`,
        },
      },
      orderBy: { bill_number: 'desc' },
      select: { bill_number: true },
    });

    let sequence = 1;
    if (lastBill) {
      const parts = lastBill.bill_number.split('-');
      sequence = parseInt(parts[2], 10) + 1;
    }

    return `BILL-${year}-${String(sequence).padStart(6, '0')}`;
  }

  private async generateGatePassNumber(organizationId: number): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();

    const lastGatePass = await this.prisma.gatePass.findFirst({
      where: {
        organizationId,
        gate_pass_number: {
          startsWith: `GP-${year}-`,
        },
      },
      orderBy: { gate_pass_number: 'desc' },
      select: { gate_pass_number: true },
    });

    let sequence = 1;
    if (lastGatePass) {
      const parts = lastGatePass.gate_pass_number.split('-');
      sequence = parseInt(parts[2], 10) + 1;
    }

    return `GP-${year}-${String(sequence).padStart(6, '0')}`;
  }

  async create(organizationId: number, userId: number, createBillDto: CreateBillDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: createBillDto.customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    return this.transactionService.run(async (tx) => {
      const bill_number = await this.generateBillNumber(organizationId);

      let subtotal = 0;
      let tax_amount = 0;

      for (const line of createBillDto.lines) {
        const lineTotal = line.quantity * line.unit_price;
        subtotal += lineTotal;
      }

      const discount_amount = createBillDto.discount_amount || 0;
      const total_amount = subtotal - discount_amount + tax_amount;

      const bill = await tx.bill.create({
        data: {
          organizationId,
          bill_number,
          customerId: createBillDto.customerId,
          channel: createBillDto.channel,
          payment_method: createBillDto.payment_method,
          created_by: userId,
          subtotal,
          discount_amount,
          tax_amount,
          total_amount,
          remarks: createBillDto.remarks,
          status: 'APPROVED',
          lines: {
            create: createBillDto.lines.map((line) => ({
              productId: line.productId,
              warehouseId: line.warehouseId,
              quantity: line.quantity,
              unit_price: line.unit_price,
              line_total: line.quantity * line.unit_price,
              remarks: line.remarks,
            })),
          },
        },
        include: {
          lines: {
            include: {
              product: true,
            },
          },
          customer: true,
        },
      });

      // Fetch created lines with full details for gate pass creation
      const billLines = await tx.billLine.findMany({
        where: { billId: bill.id },
        include: { product: true },
      });

      // Reserve inventory and create gate passes per warehouse
      const warehouseGroups = new Map<number, typeof billLines>();
      for (const line of billLines) {
        if (!warehouseGroups.has(line.warehouseId)) {
          warehouseGroups.set(line.warehouseId, []);
        }
        warehouseGroups.get(line.warehouseId).push(line);

        // Reserve inventory
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

      // Create gate passes per warehouse
      for (const [warehouseId, warehouseLines] of warehouseGroups.entries()) {
        const gatePassNumber = await this.generateGatePassNumber(organizationId);

        await tx.gatePass.create({
          data: {
            organizationId,
            gate_pass_number: gatePassNumber,
            billId: bill.id,
            warehouseId,
            status: 'PENDING',
            items: {
              create: warehouseLines.map((line) => ({
                billLineId: line.id,
                productId: line.productId,
                quantity: line.quantity,
              })),
            },
          },
        });
      }

      return bill;
    });
  }

  async findAll(organizationId: number, skip = 0, take = 10) {
    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where: { organizationId, isActive: true },
        include: {
          customer: true,
          created_by_user: {
            select: { firstName: true, lastName: true },
          },
          lines: true,
        },
        orderBy: { bill_date: 'desc' },
        skip,
        take,
      }),
      this.prisma.bill.count({
        where: { organizationId, isActive: true },
      }),
    ]);

    return {
      data: bills,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      hasMore: skip + take < total,
    };
  }

  async findById(organizationId: number, billId: number) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: billId,
        organizationId,
      },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
        customer: true,
        created_by_user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!bill) {
      throw new BadRequestException('Bill not found');
    }

    return bill;
  }
}
