import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TransactionService } from '../../../common/services/transaction.service';

@Injectable()
export class InventoryCriticalFeaturesService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
  ) {}

  /**
   * SET MIN/MAX STOCK LEVELS - Configure reorder points for a product
   */
  async setStockLevels(
    organizationId: number,
    inventoryId: number,
    minimumQuantity: number,
    reorderQuantity: number,
    maximumQuantity?: number,
    safetyStock?: number,
  ) {
    // Validate inventory exists
    const inventory = await this.prisma.inventory.findFirst({
      where: { id: inventoryId, organizationId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    // Validate quantities
    if (minimumQuantity < 0 || reorderQuantity < minimumQuantity) {
      throw new BadRequestException(
        'Invalid quantities: reorderQuantity must be >= minimumQuantity',
      );
    }

    // Create or update level
    const level = await this.prisma.inventoryLevel.upsert({
      where: { inventoryId },
      update: {
        minimumQuantity,
        reorderQuantity,
        maximumQuantity,
        safetyStock: safetyStock || 0,
      },
      create: {
        organizationId,
        inventoryId,
        minimumQuantity,
        reorderQuantity,
        maximumQuantity,
        safetyStock: safetyStock || 0,
      },
    });

    return {
      success: true,
      level,
    };
  }

  /**
   * GET REORDER ALERTS - Items below minimum quantity
   */
  async getReorderAlerts(organizationId: number, warehouseId?: number) {
    const where: any = { organization: { id: organizationId } };

    const levels = await this.prisma.inventoryLevel.findMany({
      where,
      include: {
        inventory: {
          include: {
            Product: {
              select: { code: true, name: true, reorder_quantity: true },
            },
            warehouse: { select: { name: true } },
          },
        },
      },
    });

    const alerts = levels
      .map(level => {
        const inventory = level.inventory;
        const available = inventory.physical_on_hand - (inventory.reserved || 0);

        if (available <= level.minimumQuantity) {
          return {
            inventoryId: inventory.id,
            productCode: inventory.Product.code,
            productName: inventory.Product.name,
            warehouse: inventory.warehouse.name,
            currentStock: available,
            minimumStock: level.minimumQuantity,
            reorderQuantity: level.reorderQuantity,
            shortage: level.minimumQuantity - available,
            urgency:
              available <= level.safetyStock
                ? 'CRITICAL'
                : available <= level.minimumQuantity
                  ? 'HIGH'
                  : 'MEDIUM',
          };
        }
        return null;
      })
      .filter(a => a !== null);

    return {
      organizationId,
      totalAlerts: alerts.length,
      alerts: alerts.sort(
        (a, b) => (b.shortage || 0) - (a.shortage || 0) || (a.urgency === 'CRITICAL' ? -1 : 1),
      ),
    };
  }

  /**
   * START RECONCILIATION - Begin physical count
   */
  async startReconciliation(organizationId: number, countedBy: number) {
    // Verify user exists
    const user = await this.prisma.user.findFirst({
      where: { id: countedBy, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all inventories for organization
    const inventories = await this.prisma.inventory.findMany({
      where: { organizationId },
      select: { id: true },
    });

    // Create reconciliation record
    return this.transactionService.run(async tx => {
      const reconciliation = await tx.inventoryReconciliation.create({
        data: {
          organizationId,
          reconciliationDate: new Date(),
          status: 'IN_PROGRESS',
          countedBy,
          items: {
            create: inventories.map(inv => ({
              inventoryId: inv.id,
              systemQuantity: 0,
              countedQuantity: 0,
              variance: 0,
              variancePercentage: 0,
            })),
          },
        },
        include: {
          items: {
            include: {
              inventory: {
                include: {
                  Product: { select: { code: true, name: true } },
                  warehouse: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      // Populate system quantities
      for (const item of reconciliation.items) {
        await tx.inventoryReconciliationItem.update({
          where: { id: item.id },
          data: {
            systemQuantity: item.inventory.physical_on_hand,
          },
        });
      }

      return {
        success: true,
        reconciliationId: reconciliation.id,
        status: 'IN_PROGRESS',
        itemCount: reconciliation.items.length,
        startedAt: reconciliation.createdAt,
      };
    });
  }

  /**
   * RECORD PHYSICAL COUNT - Update counted quantity
   */
  async recordPhysicalCount(
    organizationId: number,
    reconciliationItemId: number,
    countedQuantity: number,
  ) {
    const item = await this.prisma.inventoryReconciliationItem.findFirst({
      where: { id: reconciliationItemId },
      include: {
        reconciliation: true,
        inventory: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Reconciliation item not found');
    }

    if (item.reconciliation.organizationId !== organizationId) {
      throw new BadRequestException('Unauthorized');
    }

    if (item.reconciliation.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Reconciliation not in progress');
    }

    const variance = countedQuantity - item.systemQuantity;
    const variancePercentage =
      item.systemQuantity > 0 ? (variance / item.systemQuantity) * 100 : variance > 0 ? 100 : 0;

    return this.prisma.inventoryReconciliationItem.update({
      where: { id: reconciliationItemId },
      data: {
        countedQuantity,
        variance,
        variancePercentage: variancePercentage.toFixed(2) as any,
      },
    });
  }

  /**
   * APPROVE RECONCILIATION - Apply variance adjustments
   */
  async approveReconciliation(
    organizationId: number,
    reconciliationId: number,
    approved_by: number,
  ) {
    const reconciliation = await this.prisma.inventoryReconciliation.findFirst({
      where: { id: reconciliationId, organizationId },
      include: {
        items: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!reconciliation) {
      throw new NotFoundException('Reconciliation not found');
    }

    if (reconciliation.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Reconciliation not in progress');
    }

    // Verify all items counted
    const uncounted = reconciliation.items.some(i => i.countedQuantity === 0);
    if (uncounted) {
      throw new BadRequestException('All items must be counted before approval');
    }

    return this.transactionService.run(async tx => {
      const adjustments = [];

      // Apply adjustments for each variance
      for (const item of reconciliation.items) {
        if (item.variance !== 0) {
          const adjusted = await tx.inventory.update({
            where: { id: item.inventoryId },
            data: {
              physical_on_hand: item.countedQuantity,
              available: item.countedQuantity - (item.inventory.reserved || 0),
            },
          });

          // Record movement
          const movement = await tx.inventoryMovement.create({
            data: {
              organizationId,
              inventoryId: item.inventoryId,
              movementType: 'ADJUSTMENT',
              quantity: Math.abs(item.variance),
              reference: `REC-${reconciliationId}`,
              remarks: `Reconciliation adjustment (${item.variance > 0 ? '+' : ''}${item.variance})`,
              createdBy: approved_by,
            },
          });

          adjustments.push({
            inventoryId: item.inventoryId,
            systemQty: item.systemQuantity,
            countedQty: item.countedQuantity,
            variance: item.variance,
            movementId: movement.id,
          });
        }
      }

      // Update reconciliation to approved
      const updated = await tx.inventoryReconciliation.update({
        where: { id: reconciliationId },
        data: {
          status: 'APPROVED',
          approvedBy: approved_by,
          approvalDate: new Date(),
        },
      });

      return {
        success: true,
        reconciliationId: updated.id,
        status: 'APPROVED',
        adjustmentsApplied: adjustments.length,
        adjustments,
        approvalDate: updated.approvalDate,
      };
    });
  }

  /**
   * PROCESS CUSTOMER RETURN - Handle returned goods from customer
   */
  async processCustomerReturn(
    organizationId: number,
    billId: number,
    productId: number,
    quantity: number,
    reason: string,
    receivedBy: number,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    return this.transactionService.run(async tx => {
      // Get bill to find warehouse
      const bill = await tx.bill.findFirst({
        where: { id: billId, organizationId },
        include: {
          lines: { where: { productId } },
        },
      });

      if (!bill) {
        throw new NotFoundException('Bill not found');
      }

      if (bill.lines.length === 0) {
        throw new BadRequestException('Product not found on this bill');
      }

      const billLine = bill.lines[0];

      // Get inventory
      const inventory = await tx.inventory.findFirst({
        where: {
          organizationId,
          productId,
          warehouseId: billLine.warehouseId,
        },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory not found for this warehouse');
      }

      // Increase inventory
      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          physical_on_hand: {
            increment: quantity,
          },
          available: {
            increment: quantity,
          },
        },
      });

      // Record movement
      const movement = await tx.inventoryMovement.create({
        data: {
          organizationId,
          inventoryId: inventory.id,
          movementType: 'RETURN',
          quantity,
          reference: `BILL-${bill.bill_number}`,
          remarks: `Customer return - ${reason}`,
          createdBy: receivedBy,
        },
      });

      return {
        success: true,
        inventory: updated,
        movement,
        returnDetails: {
          bill_number: bill.bill_number,
          reason,
          quantity,
          newStock: updated.physical_on_hand,
        },
      };
    });
  }

  /**
   * PLACE STOCK HOLD - Block stock from sale (QC, dispute, etc)
   */
  async placeStockHold(
    organizationId: number,
    inventoryId: number,
    quantity: number,
    holdType: 'QC_HOLD' | 'DISPUTE' | 'DAMAGED_PENDING' | 'WARRANTY' | 'LEGAL_HOLD',
    reason: string,
    createdBy: number,
  ) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id: inventoryId, organizationId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    const available = inventory.physical_on_hand - (inventory.reserved || 0);
    if (available < quantity) {
      throw new BadRequestException(`Cannot hold ${quantity} units. Available: ${available}`);
    }

    return this.prisma.inventoryHold.create({
      data: {
        organizationId,
        inventoryId,
        quantity,
        holdType,
        reason,
        createdBy,
      },
      include: {
        inventory: {
          include: {
            Product: { select: { code: true, name: true } },
          },
        },
        createdByUser: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * RELEASE STOCK HOLD - Remove hold and release stock
   */
  async releaseStockHold(organizationId: number, holdId: number, approved_by: number) {
    const hold = await this.prisma.inventoryHold.findFirst({
      where: { id: holdId, organizationId },
    });

    if (!hold) {
      throw new NotFoundException('Hold not found');
    }

    if (hold.approvedBy) {
      throw new ConflictException('Hold already released');
    }

    return this.prisma.inventoryHold.update({
      where: { id: holdId },
      data: {
        approvedBy: approved_by,
        approvalDate: new Date(),
      },
      include: {
        inventory: {
          include: {
            Product: { select: { code: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * GET INVENTORY SUMMARY WITH LEVELS - Overview with reorder status
   */
  async getInventorySummaryWithLevels(organizationId: number) {
    const levels = await this.prisma.inventoryLevel.findMany({
      where: { organizationId },
      include: {
        inventory: {
          include: {
            Product: { select: { code: true, name: true } },
            warehouse: { select: { name: true } },
          },
        },
      },
    });

    const withStatus = levels.map(level => {
      const inv = level.inventory;
      const available = inv.physical_on_hand - (inv.reserved || 0);
      const status =
        available <= level.safetyStock
          ? 'CRITICAL'
          : available <= level.minimumQuantity
            ? 'LOW'
            : available <= level.reorderQuantity
              ? 'NORMAL'
              : 'HIGH';

      return {
        inventoryId: inv.id,
        productCode: inv.Product.code,
        productName: inv.Product.name,
        warehouse: inv.warehouse.name,
        physical: inv.physical_on_hand,
        reserved: inv.reserved || 0,
        available,
        minimumLevel: level.minimumQuantity,
        reorderLevel: level.reorderQuantity,
        maximumLevel: level.maximumQuantity,
        safetyStock: level.safetyStock,
        status,
        needsReorder: available <= level.minimumQuantity,
      };
    });

    const summary = {
      totalItems: withStatus.length,
      needsReorder: withStatus.filter(i => i.needsReorder).length,
      critical: withStatus.filter(i => i.status === 'CRITICAL').length,
      items: withStatus,
    };

    return summary;
  }
}
