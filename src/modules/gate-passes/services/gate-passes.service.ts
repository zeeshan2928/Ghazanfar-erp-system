import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { TransactionSequenceService } from '@common/services/transaction-sequence.service';
import { DOC_SEQUENCE, DOC_PATTERN } from '@common/config/document-sequences';
import { ConfirmGatePassDto, RejectGatePassDto } from '../dto/confirm-gate-pass.dto';

@Injectable()
export class GatePassesService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
    private transactionSequenceService: TransactionSequenceService,
  ) {}

  // Called by the frontend right before actually printing a gate pass (not
  // on "skip"). First print is always allowed. Any print after that is a
  // reprint - a hard ADMIN-only rule (not a togglable permission, since the
  // whole point is nobody-but-admin can ever generate a second physical
  // copy without it being visibly marked). Returns isDuplicate so the
  // frontend can render a DUPLICATE watermark before calling window.print().
  async recordPrint(organizationId: number, gatePassId: number, callerRole: UserRole) {
    const gatePass = await this.prisma.gatePass.findFirst({
      where: { id: gatePassId, organizationId },
    });

    if (!gatePass) {
      throw new NotFoundException('Gate pass not found');
    }

    const isReprint = gatePass.printCount > 0;

    if (isReprint && callerRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'This gate pass has already been printed. Only an admin can reprint it.',
      );
    }

    const updated = await this.prisma.gatePass.update({
      where: { id: gatePassId },
      data: {
        printCount: { increment: 1 },
        printedAt: gatePass.printedAt ?? new Date(),
      },
    });

    return { isDuplicate: isReprint, printCount: updated.printCount, printedAt: updated.printedAt };
  }

  async getPending(organizationId: number, warehouseId: number, skip = 0, take = 10) {
    const [gatePasses, total] = await Promise.all([
      this.prisma.gatePass.findMany({
        where: {
          organizationId,
          warehouseId,
          status: 'PENDING',
        },
        include: {
          bill: {
            include: {
              customer: true,
            },
          },
          items: {
            include: {
              billLine: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
        orderBy: { gate_pass_date: 'desc' },
        skip,
        take,
      }),
      this.prisma.gatePass.count({
        where: {
          organizationId,
          warehouseId,
          status: 'PENDING',
        },
      }),
    ]);

    return {
      data: gatePasses,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      hasMore: skip + take < total,
    };
  }

  async getById(organizationId: number, gatePassId: number) {
    const gatePass = await this.prisma.gatePass.findFirst({
      where: {
        id: gatePassId,
        organizationId,
      },
      include: {
        bill: {
          include: {
            customer: true,
            lines: {
              include: {
                product: true,
              },
            },
          },
        },
        items: {
          include: {
            billLine: {
              include: {
                product: true,
              },
            },
          },
        },
        warehouse: true,
      },
    });

    if (!gatePass) {
      throw new NotFoundException('Gate pass not found');
    }

    return gatePass;
  }

  async confirm(
    organizationId: number,
    gatePassId: number,
    userId: number,
    confirmDto: ConfirmGatePassDto,
  ) {
    return this.transactionService.run(async tx => {
      const gatePass = await tx.gatePass.findFirst({
        where: {
          id: gatePassId,
          organizationId,
        },
        include: {
          items: true,
          bill: true,
        },
      });

      if (!gatePass) {
        throw new NotFoundException('Gate pass not found');
      }

      if (gatePass.status !== 'PENDING') {
        throw new BadRequestException(`Cannot confirm gate pass with status ${gatePass.status}`);
      }

      // Update picked quantities for each item
      for (const pickedItem of confirmDto.pickedItems) {
        const item = gatePass.items.find(i => i.billLineId === pickedItem.billLineId);

        if (!item) {
          throw new BadRequestException(
            `Bill line ${pickedItem.billLineId} not found in gate pass`,
          );
        }

        if (pickedItem.pickedQuantity > item.quantity) {
          throw new BadRequestException(
            `Picked quantity ${pickedItem.pickedQuantity} exceeds required quantity ${item.quantity}`,
          );
        }

        // Update picked quantity
        await tx.gatePassItem.update({
          where: { id: item.id },
          data: {
            picked_quantity: pickedItem.pickedQuantity,
          },
        });
      }

      // Confirm gate pass
      const confirmed = await tx.gatePass.update({
        where: { id: gatePassId },
        data: {
          status: 'CONFIRMED',
          confirmed_by: userId,
          confirmed_date: new Date(),
          remarks: confirmDto.remarks,
        },
        include: {
          items: {
            include: {
              billLine: {
                include: {
                  product: true,
                },
              },
            },
          },
          bill: {
            include: {
              customer: true,
            },
          },
        },
      });

      // Update inventory: deduct from physical_on_hand and reserved
      for (const item of confirmed.items) {
        await tx.inventory.update({
          where: {
            organizationId_productId_warehouseId: {
              organizationId,
              productId: item.productId,
              warehouseId: gatePass.warehouseId,
            },
          },
          data: {
            physical_on_hand: {
              decrement: item.picked_quantity,
            },
            reserved: {
              decrement: item.quantity,
            },
          },
        });
      }

      return confirmed;
    });
  }

  async reject(
    organizationId: number,
    gatePassId: number,
    userId: number,
    rejectDto: RejectGatePassDto,
  ) {
    return this.transactionService.run(async tx => {
      const gatePass = await tx.gatePass.findFirst({
        where: {
          id: gatePassId,
          organizationId,
        },
        include: {
          items: true,
        },
      });

      if (!gatePass) {
        throw new NotFoundException('Gate pass not found');
      }

      if (gatePass.status !== 'PENDING') {
        throw new BadRequestException(`Cannot reject gate pass with status ${gatePass.status}`);
      }

      // Release reserved inventory back to available
      for (const item of gatePass.items) {
        await tx.inventory.update({
          where: {
            organizationId_productId_warehouseId: {
              organizationId,
              productId: item.productId,
              warehouseId: gatePass.warehouseId,
            },
          },
          data: {
            reserved: {
              decrement: item.quantity,
            },
            available: {
              increment: item.quantity,
            },
          },
        });
      }

      // Reject gate pass
      const rejected = await tx.gatePass.update({
        where: { id: gatePassId },
        data: {
          status: 'REJECTED',
          confirmed_by: userId,
          confirmed_date: new Date(),
          remarks: rejectDto.reason,
        },
        include: {
          items: {
            include: {
              billLine: {
                include: {
                  product: true,
                },
              },
            },
          },
          bill: {
            include: {
              customer: true,
            },
          },
        },
      });

      return rejected;
    });
  }

  /**
   * REPORT SHORTAGE - warehouse staff marks items not available
   * Updates picked quantity and gate pass status to indicate shortage
   */
  async reportShortage(
    organizationId: number,
    gatePassId: number,
    userId: number,
    shortageItems: Array<{
      billLineId: number;
      orderQuantity: number;
      pickedQuantity: number;
    }>,
  ) {
    return this.transactionService.run(async tx => {
      const gatePass = await tx.gatePass.findFirst({
        where: {
          id: gatePassId,
          organizationId,
        },
        include: {
          items: true,
        },
      });

      if (!gatePass) {
        throw new NotFoundException('Gate pass not found');
      }

      if (gatePass.status !== 'PENDING') {
        throw new BadRequestException(
          `Cannot report shortage on gate pass with status ${gatePass.status}`,
        );
      }

      // Update items with actual picked quantities
      for (const shortageItem of shortageItems) {
        const item = gatePass.items.find(i => i.billLineId === shortageItem.billLineId);

        if (!item) {
          throw new BadRequestException(
            `Bill line ${shortageItem.billLineId} not found in gate pass`,
          );
        }

        if (shortageItem.pickedQuantity > item.quantity) {
          throw new BadRequestException(
            `Picked quantity ${shortageItem.pickedQuantity} cannot exceed ordered quantity ${item.quantity}`,
          );
        }

        await tx.gatePassItem.update({
          where: { id: item.id },
          data: {
            picked_quantity: shortageItem.pickedQuantity,
          },
        });
      }

      // Mark gate pass as PICKED (will be confirmed later after shortage review)
      const updated = await tx.gatePass.update({
        where: { id: gatePassId },
        data: {
          status: 'PICKED',
          picked_by: userId,
          picked_date: new Date(),
          remarks: 'Shortage reported',
        },
        include: {
          items: {
            include: {
              billLine: {
                include: {
                  product: true,
                },
              },
            },
          },
          bill: {
            include: {
              customer: true,
            },
          },
        },
      });

      return updated;
    });
  }

  /**
   * AUTO-TRIGGER: Create gate pass when bill is confirmed
   * Called automatically from BillService when bill status changes to CONFIRMED
   */
  async createFromBill(organizationId: number, billId: number) {
    return this.transactionService.run(async tx => {
      // Check if gate pass already exists for this bill
      const existing = await tx.gatePass.findFirst({
        where: {
          billId,
          organizationId,
        },
      });

      if (existing) {
        throw new BadRequestException(`Gate pass already exists for bill ${billId}`);
      }

      // Get bill with all items
      const bill = await tx.bill.findFirst({
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
        },
      });

      if (!bill) {
        throw new NotFoundException(`Bill ${billId} not found`);
      }

      // NOTE: Bill.status uses OrderStatus (PENDING_APPROVAL, APPROVED, REJECTED,
      // FULFILLED, CANCELLED) - there is no CONFIRMED value, and bills.service.ts
      // create() sets new bills to APPROVED. Using APPROVED here as the closest
      // equivalent - flagged for product review.
      if (bill.status !== 'APPROVED') {
        throw new BadRequestException('Gate pass can only be created for approved bills');
      }

      // Group lines by warehouse
      const warehouseGroups = new Map<number, typeof bill.lines>();
      for (const line of bill.lines) {
        if (!warehouseGroups.has(line.warehouseId)) {
          warehouseGroups.set(line.warehouseId, []);
        }
        warehouseGroups.get(line.warehouseId)!.push(line);
      }

      // Check inventory availability for all items
      for (const line of bill.lines) {
        const inventory = await tx.inventory.findFirst({
          where: {
            organizationId,
            productId: line.productId,
            warehouseId: line.warehouseId,
          },
        });

        if (!inventory) {
          throw new BadRequestException(
            `Product ${line.product.code} not found in warehouse ${line.warehouseId}`,
          );
        }

        const available = inventory.physical_on_hand - (inventory.reserved || 0);
        if (available < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${line.product.code}. Required: ${line.quantity}, Available: ${available}`,
          );
        }
      }

      // Generate gate pass number (format: GP-YYYYMMDD-XXXXX)
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

      // Create gate passes per warehouse
      const gatePasses = [];
      for (const [warehouseId, warehouseLines] of warehouseGroups.entries()) {
        // Was MAX(existing today) + 1, which re-issued the number of a deleted
        // gate pass and re-read the day's rows on every pass. Counter now, on
        // the caller's tx so the number is only consumed if the bill commits.
        const sequenceNum = await this.transactionSequenceService.getNextCounterSeeded(
          organizationId,
          DOC_SEQUENCE.gatePassDaily(dateStr),
          async db => {
            const rows = await db.gatePass.findMany({
              where: { organizationId, gate_pass_number: { startsWith: `GP-${dateStr}-` } },
              select: { gate_pass_number: true },
            });
            return TransactionSequenceService.highestSequence(
              rows.map(r => r.gate_pass_number),
              DOC_PATTERN.gatePassDaily(dateStr),
            );
          },
          tx,
        );

        const gatePassNumber = `GP-${dateStr}-${String(sequenceNum).padStart(5, '0')}`;

        // Create gate pass for this warehouse
        const gatePass = await tx.gatePass.create({
          data: {
            organizationId,
            gate_pass_number: gatePassNumber,
            billId,
            warehouseId,
            status: 'PENDING',
            gate_pass_date: new Date(),
            items: {
              create: warehouseLines.map(line => ({
                organizationId,
                billLineId: line.id,
                productId: line.productId,
                quantity: line.quantity,
                picked_quantity: 0,
              })),
            },
          },
        });

        gatePasses.push(gatePass);

        // Reserve inventory for these items
        for (const line of warehouseLines) {
          await tx.inventory.update({
            where: {
              organizationId_productId_warehouseId: {
                organizationId,
                productId: line.productId,
                warehouseId,
              },
            },
            data: {
              reserved: {
                increment: line.quantity,
              },
            },
          });
        }
      }

      return gatePasses.length === 1
        ? gatePasses[0]
        : { gatePassCount: gatePasses.length, gatePasses };
    });
  }

  /**
   * Update picking quantity for a single item
   * Called as warehouse staff picks items
   */
  async updatePickQuantity(
    organizationId: number,
    gatePassId: number,
    billLineId: number,
    pickedQuantity: number,
  ) {
    const gatePass = await this.prisma.gatePass.findFirst({
      where: {
        id: gatePassId,
        organizationId,
      },
      include: {
        items: true,
      },
    });

    if (!gatePass) {
      throw new NotFoundException('Gate pass not found');
    }

    if (gatePass.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot update quantities on gate pass with status ${gatePass.status}`,
      );
    }

    const item = gatePass.items.find(i => i.billLineId === billLineId);
    if (!item) {
      throw new BadRequestException(`Bill line not found in gate pass`);
    }

    if (pickedQuantity > item.quantity) {
      throw new BadRequestException(
        `Picked quantity ${pickedQuantity} exceeds required ${item.quantity}`,
      );
    }

    return this.prisma.gatePassItem.update({
      where: { id: item.id },
      data: {
        picked_quantity: pickedQuantity,
      },
      include: {
        billLine: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Complete picking - mark all items as picked
   * Returns gate pass with summary of what was picked vs required
   */
  async completePicking(organizationId: number, gatePassId: number, userId: number) {
    const gatePass = await this.prisma.gatePass.findFirst({
      where: {
        id: gatePassId,
        organizationId,
      },
      include: {
        items: {
          include: {
            billLine: true,
          },
        },
      },
    });

    if (!gatePass) {
      throw new NotFoundException('Gate pass not found');
    }

    if (gatePass.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot complete picking on gate pass with status ${gatePass.status}`,
      );
    }

    // Calculate summary
    const summary = gatePass.items.map(item => ({
      billLineId: item.billLineId,
      required: item.quantity,
      picked: item.picked_quantity,
      shortage: item.quantity - item.picked_quantity,
      isShortage: item.picked_quantity < item.quantity,
    }));

    const hasShortage = summary.some(s => s.isShortage);

    // Update gate pass status to PICKED
    const updated = await this.prisma.gatePass.update({
      where: { id: gatePassId },
      data: {
        status: 'PICKED',
        picked_by: userId,
        picked_date: new Date(),
      },
      include: {
        items: {
          include: {
            billLine: {
              include: {
                product: true,
              },
            },
          },
        },
        bill: true,
      },
    });

    return {
      gatePass: updated,
      summary,
      hasShortage,
    };
  }

  /**
   * Get all gate passes with detailed status
   */
  async getAll(
    organizationId: number,
    filters: {
      warehouseId?: number;
      status?: string;
      skip?: number;
      take?: number;
    } = {},
  ) {
    const skip = filters.skip || 0;
    const take = filters.take || 20;

    const where: any = { organizationId };
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.status) where.status = filters.status;

    const [gatePasses, total] = await Promise.all([
      this.prisma.gatePass.findMany({
        where,
        include: {
          bill: {
            include: {
              customer: true,
            },
          },
          items: {
            include: {
              billLine: {
                include: {
                  product: true,
                },
              },
            },
          },
          warehouse: true,
        },
        orderBy: { gate_pass_date: 'desc' },
        skip,
        take,
      }),
      this.prisma.gatePass.count({ where }),
    ]);

    return {
      data: gatePasses,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get warehouse dashboard stats
   */
  async getWarehouseStats(organizationId: number, warehouseId: number) {
    // NOTE: GatePassStatus has no PICKING value (real values: PENDING, PICKED,
    // CONFIRMED, REJECTED) - there is no distinct "actively being picked" state
    // in this schema. Reporting the 4 real statuses instead of the fictional
    // 5th bucket that used to be queried here.
    const [pending, picked, confirmed, rejected] = await Promise.all([
      this.prisma.gatePass.count({
        where: { organizationId, warehouseId, status: 'PENDING' },
      }),
      this.prisma.gatePass.count({
        where: { organizationId, warehouseId, status: 'PICKED' },
      }),
      this.prisma.gatePass.count({
        where: { organizationId, warehouseId, status: 'CONFIRMED' },
      }),
      this.prisma.gatePass.count({
        where: { organizationId, warehouseId, status: 'REJECTED' },
      }),
    ]);

    return {
      pending,
      picked,
      confirmed,
      rejected,
      total: pending + picked + confirmed + rejected,
    };
  }
}
