import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { ConfirmGatePassDto, RejectGatePassDto } from '../dto/confirm-gate-pass.dto';

@Injectable()
export class GatePassesService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
  ) {}

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
    return this.transactionService.run(async (tx) => {
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
        throw new BadRequestException(
          `Cannot confirm gate pass with status ${gatePass.status}`,
        );
      }

      // Update picked quantities for each item
      for (const pickedItem of confirmDto.pickedItems) {
        const item = gatePass.items.find((i) => i.billLineId === pickedItem.billLineId);

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
    return this.transactionService.run(async (tx) => {
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
          `Cannot reject gate pass with status ${gatePass.status}`,
        );
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
}
