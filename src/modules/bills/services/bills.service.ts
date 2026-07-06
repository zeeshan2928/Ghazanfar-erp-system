import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { CreateBillDto, DiscountType, TransactionType } from '../dto/create-bill.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class BillsService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
  ) {}

  // Dedicated counter, incremented atomically inside the same transaction as
  // bill creation - see InvoiceSequence in schema.prisma for why this exists
  // instead of deriving the number from existing rows. Format: INV-<block>-
  // <count padded to 5 digits>; block starts at 124 and rolls over to the
  // next block after 10,000 invoices, per the business's existing numbering.
  private async generateInvoiceNumber(tx: any, organizationId: number): Promise<string> {
    let seq = await tx.invoiceSequence.findUnique({
      where: { organizationId },
    });

    if (!seq) {
      seq = await tx.invoiceSequence.create({
        data: { organizationId },
      });
    }

    let { currentBlock, currentCount } = seq;
    currentCount += 1;
    if (currentCount > 10000) {
      currentBlock += 1;
      currentCount = 1;
    }

    await tx.invoiceSequence.update({
      where: { organizationId },
      data: { currentBlock, currentCount },
    });

    return `INV-${currentBlock}-${String(currentCount).padStart(5, '0')}`;
  }

  private async generateGatePassNumber(organizationId: number): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();

    // NOTE: sorting a number field as a string is unsafe when historical rows
    // have inconsistent zero-padding - lexicographic order picks the wrong
    // "last" row and regenerates a duplicate. Fetch all matches and take the
    // true numeric max instead.
    const gatePasses = await this.prisma.gatePass.findMany({
      where: {
        organizationId,
        gate_pass_number: {
          startsWith: `GP-${year}-`,
        },
      },
      select: { gate_pass_number: true },
    });

    let maxSequence = 0;
    for (const gp of gatePasses) {
      const parts = gp.gate_pass_number.split('-');
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxSequence) {
        maxSequence = num;
      }
    }

    const sequence = maxSequence + 1;
    return `GP-${year}-${String(sequence).padStart(6, '0')}`;
  }

  /**
   * Reserves inventory for a SALE's lines, throwing if any line lacks
   * sufficient available stock. Used both when a SALE invoice is first
   * created and when its lines are edited afterward.
   */
  private async reserveSaleInventory(
    tx: any,
    organizationId: number,
    lines: Array<{ productId: number; warehouseId: number; quantity: number; productName: string }>,
  ): Promise<void> {
    const warehouseIds = [...new Set(lines.map(l => l.warehouseId))];
    const warehouseRecords = await tx.warehouse.findMany({ where: { id: { in: warehouseIds } } });
    const warehouseNameById = new Map(warehouseRecords.map((w: any) => [w.id, w.name]));

    for (const line of lines) {
      const inventory = await tx.inventory.findUnique({
        where: {
          organizationId_productId_warehouseId: {
            organizationId,
            productId: line.productId,
            warehouseId: line.warehouseId,
          },
        },
      });

      const availableQuantity = inventory?.available ?? 0;
      if (availableQuantity < line.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${line.productName} in ${warehouseNameById.get(line.warehouseId) || 'warehouse #' + line.warehouseId}: available ${availableQuantity}, requested ${line.quantity}`,
        );
      }

      await tx.inventory.update({
        where: {
          organizationId_productId_warehouseId: {
            organizationId,
            productId: line.productId,
            warehouseId: line.warehouseId,
          },
        },
        data: {
          reserved: { increment: line.quantity },
          available: { decrement: line.quantity },
        },
      });
    }
  }

  /**
   * Reverses a previous reserveSaleInventory() call - used when a SALE's
   * lines are edited, to release the old reservation before the new one
   * (from the edited lines) is applied.
   */
  private async releaseSaleInventory(
    tx: any,
    organizationId: number,
    lines: Array<{ productId: number; warehouseId: number; quantity: number }>,
  ): Promise<void> {
    for (const line of lines) {
      await tx.inventory.update({
        where: {
          organizationId_productId_warehouseId: {
            organizationId,
            productId: line.productId,
            warehouseId: line.warehouseId,
          },
        },
        data: {
          reserved: { decrement: line.quantity },
          available: { increment: line.quantity },
        },
      });
    }
  }

  private async createGatePassesForBill(
    tx: any,
    organizationId: number,
    billId: number,
    billLines: Array<{ id: number; productId: number; warehouseId: number; quantity: number }>,
  ) {
    const warehouseGroups = new Map<number, typeof billLines>();
    for (const line of billLines) {
      if (!warehouseGroups.has(line.warehouseId)) warehouseGroups.set(line.warehouseId, []);
      warehouseGroups.get(line.warehouseId)!.push(line);
    }

    const gatePasses = [];
    for (const [warehouseId, warehouseLines] of warehouseGroups.entries()) {
      const gatePassNumber = await this.generateGatePassNumber(organizationId);
      const gatePass = await tx.gatePass.create({
        data: {
          organizationId,
          gate_pass_number: gatePassNumber,
          billId,
          warehouseId,
          status: 'PENDING',
          items: {
            create: warehouseLines.map(line => ({
              organizationId,
              billLineId: line.id,
              productId: line.productId,
              quantity: line.quantity,
            })),
          },
        },
        include: {
          warehouse: true,
          items: { include: { billLine: { include: { product: true } } } },
        },
      });
      gatePasses.push(gatePass);
    }
    return gatePasses;
  }

  /**
   * Applies a RETURN's stock-in effect (increments physical/available and
   * logs an audit movement). Reused both at creation and when re-applying
   * edited RETURN lines.
   */
  private async applyReturnStock(
    tx: any,
    organizationId: number,
    lines: Array<{ productId: number; warehouseId: number; quantity: number }>,
    reference: string,
    remarks: string | undefined,
    userId: number,
  ): Promise<void> {
    for (const line of lines) {
      const inventory = await tx.inventory.upsert({
        where: {
          organizationId_productId_warehouseId: {
            organizationId,
            productId: line.productId,
            warehouseId: line.warehouseId,
          },
        },
        update: {
          physical_on_hand: { increment: line.quantity },
          available: { increment: line.quantity },
        },
        create: {
          organizationId,
          productId: line.productId,
          warehouseId: line.warehouseId,
          physical_on_hand: line.quantity,
          available: line.quantity,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          organizationId,
          inventoryId: inventory.id,
          movementType: 'RETURN',
          quantity: line.quantity,
          reference,
          remarks,
          createdBy: userId,
        },
      });
    }
  }

  /**
   * Reverses a previous applyReturnStock() call - used when a RETURN's
   * lines are edited. Assumes none of the returned stock has since been
   * consumed by another sale; if it has, this can legitimately push
   * available/physical_on_hand negative, which is a real business
   * conflict the edit should surface rather than hide.
   */
  private async reverseReturnStock(
    tx: any,
    organizationId: number,
    lines: Array<{ productId: number; warehouseId: number; quantity: number }>,
    reference: string,
    userId: number,
  ): Promise<void> {
    for (const line of lines) {
      const inventory = await tx.inventory.findUnique({
        where: {
          organizationId_productId_warehouseId: {
            organizationId,
            productId: line.productId,
            warehouseId: line.warehouseId,
          },
        },
      });
      if (!inventory) continue;

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          physical_on_hand: { decrement: line.quantity },
          available: { decrement: line.quantity },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          organizationId,
          inventoryId: inventory.id,
          movementType: 'ADJUSTMENT',
          quantity: -line.quantity,
          reference,
          remarks: 'Reversal of previous RETURN due to invoice edit',
          createdBy: userId,
        },
      });
    }
  }

  async create(organizationId: number, userId: number, createBillDto: CreateBillDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: createBillDto.customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    // Customer contact number is mandatory for every invoice - if the
    // customer record doesn't have one on file yet, or it differs from what
    // was entered at point of sale, update it from here.
    if (!createBillDto.customerPhone?.trim()) {
      throw new BadRequestException('Customer contact number is required to save an invoice');
    }

    const transactionType = createBillDto.transactionType || TransactionType.SALE;

    if (transactionType === TransactionType.RETURN && !createBillDto.returnWarehouseId) {
      throw new BadRequestException('A destination warehouse is required for a return');
    }

    return this.transactionService.run(async tx => {
      if (customer.phone !== createBillDto.customerPhone) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { phone: createBillDto.customerPhone },
        });
      }

      const invoiceNumber = await this.generateInvoiceNumber(tx, organizationId);

      let subtotal = 0;
      const taxAmount = 0;

      for (const line of createBillDto.lines) {
        const lineTotal = line.quantity * line.unitPrice;
        subtotal += lineTotal;
      }

      // Discount is one-or-the-other via a dropdown, defaulting to
      // PERCENTAGE, per the confirmed business rule - not both applied
      // together.
      const discountType = createBillDto.discountType || DiscountType.PERCENTAGE;
      const discountPercentage = createBillDto.discountPercentage || 0;
      const discountAmount =
        discountType === DiscountType.FIXED
          ? createBillDto.discountAmount || 0
          : Math.round((subtotal * discountPercentage) / 100);

      const deliveryCharges = createBillDto.deliveryCharges || 0;
      const totalAmount = subtotal - discountAmount + taxAmount + deliveryCharges;

      // For a RETURN, every line goes back into the single chosen destination
      // warehouse - not each line's own dispatch warehouse (that field is only
      // meaningful for a SALE).
      const effectiveLines = createBillDto.lines.map(line => ({
        ...line,
        warehouseId:
          transactionType === TransactionType.RETURN
            ? createBillDto.returnWarehouseId!
            : line.warehouseId,
      }));

      const bill = await tx.bill.create({
        data: {
          bill_number: invoiceNumber,
          customerId: createBillDto.customerId,
          salesmanId: createBillDto.salesmanId,
          created_by: userId,
          organizationId,
          channel: createBillDto.channel,
          payment_method: createBillDto.paymentMethod,
          subtotal,
          discount_amount: discountAmount,
          discountPercentage: discountType === DiscountType.PERCENTAGE ? discountPercentage : 0,
          discountType,
          deliveryCharges,
          cashbookNumber: createBillDto.cashbookNumber,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          remarks: createBillDto.remarks,
          status: 'APPROVED',
          transactionType,
          lines: {
            create: effectiveLines.map(line => ({
              organizationId,
              productId: line.productId,
              warehouseId: line.warehouseId,
              quantity: line.quantity,
              unit_price: line.unitPrice,
              line_total: line.quantity * line.unitPrice,
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

      if (transactionType === TransactionType.RETURN) {
        // A return puts stock back - no reservation, no gate pass.
        await this.applyReturnStock(tx, organizationId, effectiveLines, invoiceNumber, createBillDto.remarks, userId);
        return { ...bill, gatePasses: [] };
      }

      // Fetch created lines with full details for reservation + gate passes
      const billLines = await tx.billLine.findMany({
        where: { billId: bill.id },
        include: { product: true },
      });

      await this.reserveSaleInventory(
        tx,
        organizationId,
        billLines.map((l: any) => ({ productId: l.productId, warehouseId: l.warehouseId, quantity: l.quantity, productName: l.product.name })),
      );

      const gatePasses = await this.createGatePassesForBill(tx, organizationId, bill.id, billLines);

      return { ...bill, gatePasses };
    });
  }

  async findAll(organizationId: number, skip = 0, take = 10) {
    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where: { organizationId, isActive: true },
        include: {
          customer: true,
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
      },
    });

    if (!bill) {
      throw new BadRequestException('Bill not found');
    }

    return bill;
  }

  async update(organizationId: number, billId: number, userId: number, updateData: any) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, organizationId },
      include: {
        lines: true,
        gatePasses: true,
        customer: true,
      },
    });

    if (!bill) {
      throw new BadRequestException('Bill not found');
    }

    // Editing is blocked once fulfillment has physically started - not by
    // Bill.status, which create() always sets to APPROVED (so a
    // PENDING_APPROVAL-only gate would make every invoice permanently
    // uneditable). The real risk is a warehouse having already picked or
    // confirmed a gate pass against the current lines.
    const lockedGatePass = bill.gatePasses.find((gp: any) => gp.status !== 'PENDING');
    if (lockedGatePass) {
      throw new BadRequestException(
        `Cannot edit this invoice - gate pass ${lockedGatePass.gate_pass_number} has already been ${lockedGatePass.status.toLowerCase()}`,
      );
    }

    return this.transactionService.run(async tx => {
      if (updateData.customerPhone && updateData.customerPhone !== bill.customer?.phone) {
        await tx.customer.update({
          where: { id: updateData.customerId || bill.customerId },
          data: { phone: updateData.customerPhone },
        });
      }

      let subtotal = 0;
      const taxAmount = 0;

      if (updateData.lines) {
        const oldLines = bill.lines;

        // Release/reverse whatever the old lines did to inventory before
        // applying the new ones - same reservation/return logic used at
        // creation, just run in the opposite direction first.
        if (bill.transactionType === 'RETURN') {
          await this.reverseReturnStock(
            tx,
            organizationId,
            oldLines.map((l: any) => ({ productId: l.productId, warehouseId: l.warehouseId, quantity: l.quantity })),
            bill.bill_number,
            userId,
          );
        } else {
          await this.releaseSaleInventory(
            tx,
            organizationId,
            oldLines.map((l: any) => ({ productId: l.productId, warehouseId: l.warehouseId, quantity: l.quantity })),
          );
          // Old gate passes referenced the old billLines (which are about to
          // be deleted) - drop them too; fresh ones are created below from
          // the new lines. Safe because we already confirmed above that none
          // of them have progressed past PENDING.
          await tx.gatePass.deleteMany({ where: { billId } });
        }

        // BillLine delete cascades to GatePassItem, so no separate cleanup
        // is needed there.
        await tx.billLine.deleteMany({ where: { billId } });

        const returnWarehouseId =
          bill.transactionType === 'RETURN'
            ? updateData.returnWarehouseId || oldLines[0]?.warehouseId
            : undefined;

        const newEffectiveLines = updateData.lines.map((line: any) => ({
          ...line,
          warehouseId: bill.transactionType === 'RETURN' ? returnWarehouseId : line.warehouseId,
        }));

        for (const line of newEffectiveLines) {
          subtotal += line.quantity * line.unitPrice;
        }

        await tx.billLine.createMany({
          data: newEffectiveLines.map((line: any) => ({
            organizationId,
            billId,
            productId: line.productId,
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            line_total: line.quantity * line.unitPrice,
            remarks: line.remarks,
          })),
        });

        const newBillLines = await tx.billLine.findMany({ where: { billId }, include: { product: true } });

        if (bill.transactionType === 'RETURN') {
          await this.applyReturnStock(tx, organizationId, newEffectiveLines, bill.bill_number, updateData.remarks ?? bill.remarks, userId);
        } else {
          await this.reserveSaleInventory(
            tx,
            organizationId,
            newBillLines.map((l: any) => ({ productId: l.productId, warehouseId: l.warehouseId, quantity: l.quantity, productName: l.product.name })),
          );
          await this.createGatePassesForBill(tx, organizationId, billId, newBillLines);
        }
      } else {
        const existingLines = await tx.billLine.findMany({ where: { billId } });
        subtotal = existingLines.reduce((sum: number, line: any) => sum + (line.line_total || 0), 0);
      }

      const discountType = updateData.discountType || bill.discountType || DiscountType.PERCENTAGE;
      const discountPercentage =
        updateData.discountPercentage ?? Number(bill.discountPercentage) ?? 0;
      const discountAmount =
        discountType === DiscountType.FIXED
          ? updateData.discountAmount ?? bill.discount_amount ?? 0
          : Math.round((subtotal * discountPercentage) / 100);
      const deliveryCharges = updateData.deliveryCharges ?? bill.deliveryCharges ?? 0;
      const totalAmount = subtotal - discountAmount + taxAmount + deliveryCharges;

      return tx.bill.update({
        where: { id: billId },
        data: {
          customerId: updateData.customerId || bill.customerId,
          salesmanId: updateData.salesmanId || bill.salesmanId,
          channel: updateData.channel || bill.channel,
          payment_method: updateData.paymentMethod || bill.payment_method,
          subtotal,
          discount_amount: discountAmount,
          discountPercentage: discountType === DiscountType.PERCENTAGE ? discountPercentage : 0,
          discountType,
          deliveryCharges,
          cashbookNumber: updateData.cashbookNumber ?? bill.cashbookNumber,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          remarks: updateData.remarks !== undefined ? updateData.remarks : bill.remarks,
        },
        include: {
          lines: { include: { product: true } },
          customer: true,
          gatePasses: {
            include: { warehouse: true, items: { include: { billLine: { include: { product: true } } } } },
          },
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

    // NOTE: Bill.status uses OrderStatus (PENDING_APPROVAL, APPROVED, REJECTED,
    // FULFILLED, CANCELLED). Reinterpreted from the old DRAFT/FINALIZED/PAID
    // vocabulary, which doesn't exist on this enum. Flagged for product review:
    // confirm this matches the intended approval workflow.
    const validStatuses: OrderStatus[] = [
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'FULFILLED',
      'CANCELLED',
    ];
    if (!validStatuses.includes(newStatus as OrderStatus)) {
      throw new BadRequestException(`Invalid status: ${newStatus}`);
    }

    // Enforce workflow: PENDING_APPROVAL -> APPROVED/REJECTED -> FULFILLED/CANCELLED
    if (
      bill.status === 'PENDING_APPROVAL' &&
      !['APPROVED', 'REJECTED', 'PENDING_APPROVAL'].includes(newStatus)
    ) {
      throw new BadRequestException('Can only approve or reject a bill from PENDING_APPROVAL status');
    }

    if (
      bill.status === 'APPROVED' &&
      !['FULFILLED', 'CANCELLED', 'APPROVED'].includes(newStatus)
    ) {
      throw new BadRequestException('Can only fulfill or cancel a bill from APPROVED status');
    }

    return this.prisma.bill.update({
      where: { id: billId },
      data: { status: newStatus as OrderStatus },
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

Bill Number: ${bill.bill_number}
Date: ${bill.bill_date.toISOString().split('T')[0]}
Customer: ${bill.customer?.name || 'N/A'}

------------------------------------
BILL ITEMS:
------------------------------------
`;

    bill.lines.forEach((line: any, index: number) => {
      content += `
${index + 1}. Product: ${line.product?.name || 'N/A'}
   Quantity: ${line.quantity}
   Unit Price: ${line.unit_price}
   Line Total: ${line.line_total}
`;
    });

    content += `
------------------------------------
SUMMARY:
------------------------------------
Subtotal: ${bill.subtotal}
Discount: ${bill.discount_amount}
Tax: ${bill.tax_amount}
TOTAL: ${bill.total_amount}

Status: ${bill.status}
Remarks: ${bill.remarks || 'N/A'}
====================================
    `;

    return content;
  }
}
