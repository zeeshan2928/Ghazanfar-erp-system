import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TransactionService } from '../../../common/services/transaction.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InventoryReservationService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
  ) {}

  /**
   * CHECK AVAILABILITY - Returns available qty (total - reserved)
   */
  async checkAvailability(organizationId: number, productId: number, warehouseId: number) {
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        organizationId,
        productId,
        warehouseId,
      },
    });

    if (!inventory) {
      return {
        productId,
        warehouseId,
        total: 0,
        reserved: 0,
        available: 0,
      };
    }

    const reserved = inventory.reserved || 0;
    const available = inventory.physical_on_hand - reserved;

    return {
      productId,
      warehouseId,
      total: inventory.physical_on_hand,
      reserved,
      available: Math.max(0, available),
    };
  }

  /**
   * RESERVE FOR BILL - Called when bill is created
   * Automatically creates reservations for all bill items
   */
  async reserveForBill(organizationId: number, billId: number) {
    return this.transactionService.run(async tx => {
      // Get bill with items
      const bill = await tx.bill.findFirst({
        where: {
          id: billId,
          organizationId,
        },
        include: {
          lines: true,
        },
      });

      if (!bill) {
        throw new NotFoundException(`Bill ${billId} not found`);
      }

      const reservations = [];

      // Create reservation for each item
      for (const line of bill.lines) {
        // Check current inventory
        const inventory = await tx.inventory.findFirst({
          where: {
            organizationId,
            productId: line.productId,
            warehouseId: line.warehouseId,
          },
        });

        if (!inventory) {
          throw new BadRequestException(
            `Product ${line.productId} not found in warehouse ${line.warehouseId}`,
          );
        }

        const reserved = inventory.reserved || 0;
        const available = inventory.physical_on_hand - reserved;

        if (available < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${line.productId}. Required: ${line.quantity}, Available: ${available}`,
          );
        }

        // Create reservation record
        const reservation = await tx.inventoryReservation.create({
          data: {
            organizationId,
            billId,
            inventoryId: inventory.id,
            quantity: line.quantity,
            status: 'RESERVED',
            releaseType: 'AUTO',
          },
        });

        reservations.push(reservation);

        // Update inventory reserved count
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            reserved: {
              increment: line.quantity,
            },
            lastReservedAt: new Date(),
          },
        });
      }

      return {
        billId,
        reservations,
        totalReserved: reservations.length,
      };
    });
  }

  /**
   * RELEASE RESERVATION - Release a single reservation
   */
  async releaseReservation(
    organizationId: number,
    reservationId: number,
    releaseType: 'AUTO' | 'MANUAL' | 'EXPIRED' = 'MANUAL',
  ) {
    return this.transactionService.run(async tx => {
      const reservation = await tx.inventoryReservation.findFirst({
        where: {
          id: reservationId,
          organizationId,
        },
      });

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      if (reservation.status !== 'RESERVED') {
        throw new BadRequestException(
          `Cannot release reservation with status ${reservation.status}`,
        );
      }

      // Update reservation status
      const updated = await tx.inventoryReservation.update({
        where: { id: reservationId },
        data: {
          status: 'RELEASED',
          releaseType,
          releaseDate: new Date(),
        },
      });

      // Decrease reserved count
      await tx.inventory.update({
        where: { id: reservation.inventoryId },
        data: {
          reserved: {
            decrement: reservation.quantity,
          },
        },
      });

      return updated;
    });
  }

  /**
   * RELEASE BY BILL - Release all reservations for a bill
   * Called when bill is cancelled or when gate pass is confirmed
   */
  async releaseReservationsByBill(
    organizationId: number,
    billId: number,
    releaseType: 'AUTO' | 'MANUAL' = 'AUTO',
  ) {
    return this.transactionService.run(async tx => {
      // Get all reservations for this bill
      const reservations = await tx.inventoryReservation.findMany({
        where: {
          billId,
          organizationId,
          status: 'RESERVED',
        },
      });

      const released = [];

      for (const reservation of reservations) {
        // Update reservation
        const updated = await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: {
            status: 'RELEASED',
            releaseType,
            releaseDate: new Date(),
          },
        });

        // Decrease reserved count
        await tx.inventory.update({
          where: { id: reservation.inventoryId },
          data: {
            reserved: {
              decrement: reservation.quantity,
            },
          },
        });

        released.push(updated);
      }

      return {
        billId,
        released,
        totalReleased: released.length,
      };
    });
  }

  /**
   * GET RESERVATION HISTORY - All reservations for an inventory
   */
  async getReservationHistory(organizationId: number, inventoryId: number) {
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: {
        organizationId,
        inventoryId,
      },
      include: {
        bill: {
          select: {
            id: true,
            bill_number: true,
            status: true,
            gatePasses: {
              select: {
                id: true,
                gate_pass_number: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      inventoryId,
      total: reservations.length,
      reserved: reservations.filter(r => r.status === 'RESERVED').length,
      released: reservations.filter(r => r.status === 'RELEASED').length,
      expired: reservations.filter(r => r.status === 'EXPIRED').length,
      reservations,
    };
  }

  /**
   * DETECT SHORTAGES - Items that cannot be fulfilled with current inventory
   */
  async detectShortages(organizationId: number, warehouseId: number) {
    const inventories = await this.prisma.inventory.findMany({
      where: {
        organizationId,
        warehouseId,
      },
    });

    // Fetch product details for all inventories
    const productIds = [...new Set(inventories.map(i => i.productId).filter(id => id))];
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    const shortages = inventories
      .map(inv => {
        const product = productMap.get(inv.productId);
        if (!product) return null;

        const reserved = inv.reserved || 0;
        const available = inv.physical_on_hand - reserved;

        return {
          inventoryId: inv.id,
          productId: inv.productId,
          productCode: product.code,
          productName: product.name,
          total: inv.physical_on_hand,
          reserved,
          available: Math.max(0, available),
          threshold: 10,
          isLow: available < 10,
        };
      })
      .filter(s => s && s.isLow)
      .sort((a, b) => (a?.available ?? 0) - (b?.available ?? 0));

    return {
      warehouseId,
      total: shortages.length,
      shortages,
    };
  }

  /**
   * AUTO-EXPIRE OLD RESERVATIONS - Run periodically to expire old reservations
   * Default: expire after 7 days
   */
  async autoExpireOldReservations(organizationId: number, daysOld: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.transactionService.run(async tx => {
      // Find old reserved items
      const oldReservations = await tx.inventoryReservation.findMany({
        where: {
          organizationId,
          status: 'RESERVED',
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      const expired = [];

      for (const reservation of oldReservations) {
        // Mark as expired
        const updated = await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: {
            status: 'EXPIRED',
            releaseType: 'EXPIRED',
            releaseDate: new Date(),
          },
        });

        // Decrease reserved count
        await tx.inventory.update({
          where: { id: reservation.inventoryId },
          data: {
            reserved: {
              decrement: reservation.quantity,
            },
          },
        });

        expired.push(updated);
      }

      return {
        expiredCount: expired.length,
        reservations: expired,
      };
    });
  }

  /**
   * GET INVENTORY STATUS - Full status of an inventory item
   */
  async getInventoryStatus(organizationId: number, productId: number, warehouseId: number) {
    const [inventory, product, warehouse] = await Promise.all([
      this.prisma.inventory.findFirst({
        where: {
          organizationId,
          productId,
          warehouseId,
        },
      }),
      this.prisma.product.findFirst({
        where: {
          id: productId,
          organizationId,
        },
      }),
      this.prisma.warehouse.findFirst({
        where: {
          id: warehouseId,
          organizationId,
        },
      }),
    ]);

    if (!inventory || !product || !warehouse) {
      return {
        productId,
        warehouseId,
        found: false,
      };
    }

    const reservations = await this.prisma.inventoryReservation.findMany({
      where: {
        inventoryId: inventory.id,
        status: 'RESERVED',
      },
      include: {
        bill: {
          select: {
            id: true,
            bill_number: true,
          },
        },
      },
    });

    const reserved = inventory.reserved || 0;
    const available = inventory.physical_on_hand - reserved;

    return {
      found: true,
      productId,
      productCode: product.code,
      productName: product.name,
      warehouseId,
      warehouseName: warehouse.name,
      total: inventory.physical_on_hand,
      reserved,
      available: Math.max(0, available),
      lastReservedAt: inventory.lastReservedAt,
      reservations,
      reservationCount: reservations.length,
    };
  }

  /**
   * BULK CHECK AVAILABILITY - Check multiple products at once
   */
  async bulkCheckAvailability(
    organizationId: number,
    items: Array<{ productId: number; warehouseId: number; requiredQuantity: number }>,
  ) {
    const results = [];

    for (const item of items) {
      const availability = await this.checkAvailability(
        organizationId,
        item.productId,
        item.warehouseId,
      );

      results.push({
        ...availability,
        required: item.requiredQuantity,
        canFulfill: availability.available >= item.requiredQuantity,
        shortage: Math.max(0, item.requiredQuantity - availability.available),
      });
    }

    return {
      total: items.length,
      canFulfillAll: results.every(r => r.canFulfill),
      results,
    };
  }
}
