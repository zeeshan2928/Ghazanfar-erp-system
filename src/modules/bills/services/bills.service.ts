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

  private async generateGatePassNumber(organizationId: number): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();

    const lastGatePass = await this.prisma.gatePass.findFirst({
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

  async create(organizationId: number, userId: number, createBillDto: CreateBillDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: createBillDto.customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    return this.transactionService.run(async (tx) => {
      const billNumber = await this.generateBillNumber(organizationId);

      let subtotal = 0;
      let taxAmount = 0;

      for (const line of createBillDto.lines) {
        const lineTotal = line.quantity * line.unitPrice;
        subtotal += lineTotal;
      }

      const discountAmount = createBillDto.discountAmount || 0;
      const totalAmount = subtotal - discountAmount + taxAmount;

      const bill = await tx.bill.create({
        data: {
          billNumber,
          customer: { connect: { id: createBillDto.customerId } },
          salesman: { connect: { id: createBillDto.salesmanId } },
          createdByUser: { connect: { id: userId } },
          organization: { connect: { id: organizationId } },
          channel: createBillDto.channel,
          paymentMethod: createBillDto.paymentMethod,
          subtotal,
          discountAmount,
          discountPercentage: 0,
          taxAmount,
          totalAmount,
          remarks: createBillDto.remarks,
          status: 'APPROVED',
          lines: {
            create: createBillDto.lines.map((line) => ({
              organizationId,
              productId: line.productId,
              warehouseId: line.warehouseId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.quantity * line.unitPrice,
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
            gatePassNumber,
            billId: bill.id,
            warehouseId,
            status: 'PENDING',
            items: {
              create: warehouseLines.map((line) => ({
                organizationId,
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
          createdByUser: {
            select: { firstName: true, lastName: true },
          },
          lines: true,
        },
        orderBy: { billDate: 'desc' },
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
        createdByUser: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!bill) {
      throw new BadRequestException('Bill not found');
    }

    return bill;
  }

  async update(organizationId: number, billId: number, updateData: any) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: billId,
        organizationId,
      },
    });

    if (!bill) {
      throw new BadRequestException('Bill not found');
    }

    if (bill.status !== 'DRAFT') {
      throw new BadRequestException('Can only update bills in DRAFT status');
    }

    return this.transactionService.run(async (tx) => {
      // Update bill fields
      let subtotal = 0;
      let taxAmount = 0;

      if (updateData.lines) {
        // Delete existing lines
        await tx.billLine.deleteMany({ where: { billId } });

        // Create new lines
        for (const line of updateData.lines) {
          const lineTotal = line.quantity * line.unitPrice;
          subtotal += lineTotal;
        }

        await tx.billLine.createMany({
          data: updateData.lines.map((line: any) => ({
            organizationId,
            billId,
            productId: line.productId,
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.quantity * line.unitPrice,
            remarks: line.remarks,
          })),
        });
      } else {
        // Calculate from existing lines if not updating
        const existingLines = await tx.billLine.findMany({ where: { billId } });
        subtotal = existingLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
      }

      const discountAmount = updateData.discountAmount || bill.discountAmount || 0;
      const totalAmount = subtotal - discountAmount + taxAmount;

      return tx.bill.update({
        where: { id: billId },
        data: {
          customerId: updateData.customerId || bill.customerId,
          channel: updateData.channel || bill.channel,
          paymentMethod: updateData.paymentMethod || bill.paymentMethod,
          subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          remarks: updateData.remarks !== undefined ? updateData.remarks : bill.remarks,
        },
        include: {
          lines: {
            include: { product: true },
          },
          customer: true,
        },
      });
    });
  }

  async delete(organizationId: number, billId: number) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: billId,
        organizationId,
      },
    });

    if (!bill) {
      throw new BadRequestException('Bill not found');
    }

    // Soft delete
    return this.prisma.bill.update({
      where: { id: billId },
      data: { isActive: false },
    });
  }

  async changeStatus(organizationId: number, billId: number, newStatus: string) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: billId,
        organizationId,
      },
    });

    if (!bill) {
      throw new BadRequestException('Bill not found');
    }

    // Validate status transition
    const validStatuses = ['DRAFT', 'FINALIZED', 'PAID'];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`Invalid status: ${newStatus}`);
    }

    // Enforce workflow: DRAFT -> FINALIZED -> PAID
    if (bill.status === 'DRAFT' && !['FINALIZED', 'DRAFT'].includes(newStatus)) {
      throw new BadRequestException('Can only finalize a bill from DRAFT status');
    }

    if (bill.status === 'FINALIZED' && !['PAID', 'FINALIZED', 'DRAFT'].includes(newStatus)) {
      throw new BadRequestException('Can only mark as PAID from FINALIZED status');
    }

    return this.prisma.bill.update({
      where: { id: billId },
      data: { status: newStatus },
      include: {
        lines: true,
        customer: true,
      },
    });
  }

  async exportPDF(organizationId: number, billId: number): Promise<string> {
    const bill = await this.findById(organizationId, billId);

    if (!bill) {
      throw new BadRequestException('Bill not found');
    }

    // Generate a simple text representation (can be enhanced with pdfkit library)
    const pdfContent = this.generatePDFContent(bill);

    // Return as base64 encoded string
    return Buffer.from(pdfContent).toString('base64');
  }

  private generatePDFContent(bill: any): string {
    let content = `
====================================
            BILL DOCUMENT
====================================

Bill Number: ${bill.billNumber}
Date: ${bill.billDate.toISOString().split('T')[0]}
Customer: ${bill.customer?.name || 'N/A'}

------------------------------------
BILL ITEMS:
------------------------------------
`;

    bill.lines.forEach((line: any, index: number) => {
      content += `
${index + 1}. Product: ${line.product?.name || 'N/A'}
   Quantity: ${line.quantity}
   Unit Price: ${line.unitPrice}
   Line Total: ${line.lineTotal}
`;
    });

    content += `
------------------------------------
SUMMARY:
------------------------------------
Subtotal: ${bill.subtotal}
Discount: ${bill.discountAmount}
Tax: ${bill.taxAmount}
TOTAL: ${bill.totalAmount}

Status: ${bill.status}
Remarks: ${bill.remarks || 'N/A'}
====================================
    `;

    return content;
  }
}
