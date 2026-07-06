import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TransactionService } from '../../../common/services/transaction.service';

@Injectable()
export class InventoryOperationsService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
  ) {}

  /**
   * CREATE INVENTORY - Initialize inventory for a product in a warehouse
   */
  async createInventory(
    organizationId: number,
    productId: number,
    warehouseId: number,
    openingBalance: number = 0,
  ) {
    // Check if product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    // Check if warehouse exists
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, organizationId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }

    // Check if inventory already exists
    const existing = await this.prisma.inventory.findFirst({
      where: { organizationId, productId, warehouseId },
    });

    if (existing) {
      throw new ConflictException(`Inventory already exists for this product in this warehouse`);
    }

    // Create inventory
    return this.prisma.inventory.create({
      data: {
        organizationId,
        productId,
        warehouseId,
        physical_on_hand: openingBalance,
        opening_balance: openingBalance,
        reserved: 0,
        available: openingBalance,
      },
      include: {
        Product: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * STOCK IN - Add stock (from PO receipt, returns, etc)
   */
  async stockIn(
    organizationId: number,
    productId: number,
    warehouseId: number,
    quantity: number,
    reference: string,
    createdBy: number,
    remarks?: string,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    return this.transactionService.run(async tx => {
      // Get or create inventory
      let inventory = await tx.inventory.findFirst({
        where: {
          organizationId,
          productId,
          warehouseId,
        },
      });

      if (!inventory) {
        // Create new inventory record if it doesn't exist
        inventory = await tx.inventory.create({
          data: {
            organizationId,
            productId,
            warehouseId,
            physical_on_hand: 0,
            opening_balance: 0,
            reserved: 0,
            available: 0,
          },
        });
      }

      // Update inventory
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
          movementType: 'STOCK_IN',
          quantity,
          reference,
          remarks,
          createdBy,
        },
      });

      return {
        success: true,
        inventory: updated,
        movement,
      };
    });
  }

  /**
   * STOCK OUT - Remove stock (sales, transfers, damage, etc)
   */
  async stockOut(
    organizationId: number,
    productId: number,
    warehouseId: number,
    quantity: number,
    reference: string,
    createdBy: number,
    remarks?: string,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    return this.transactionService.run(async tx => {
      const inventory = await tx.inventory.findFirst({
        where: {
          organizationId,
          productId,
          warehouseId,
        },
      });

      if (!inventory) {
        throw new NotFoundException(`Inventory not found for this product in this warehouse`);
      }

      const available = inventory.physical_on_hand - (inventory.reserved || 0);

      if (available < quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${available}, Required: ${quantity}`,
        );
      }

      // Update inventory
      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          physical_on_hand: {
            decrement: quantity,
          },
          available: {
            decrement: quantity,
          },
        },
      });

      // Record movement
      const movement = await tx.inventoryMovement.create({
        data: {
          organizationId,
          inventoryId: inventory.id,
          movementType: 'STOCK_OUT',
          quantity,
          reference,
          remarks,
          createdBy,
        },
      });

      return {
        success: true,
        inventory: updated,
        movement,
      };
    });
  }

  /**
   * ADJUST STOCK - Add or subtract stock for damage, shrinkage, reconciliation
   */
  async adjustStock(
    organizationId: number,
    productId: number,
    warehouseId: number,
    quantityDifference: number,
    adjustmentType: 'DAMAGE' | 'SHRINKAGE' | 'ADJUSTMENT',
    createdBy: number,
    remarks?: string,
  ) {
    if (quantityDifference === 0) {
      throw new BadRequestException('Adjustment quantity cannot be zero');
    }

    return this.transactionService.run(async tx => {
      const inventory = await tx.inventory.findFirst({
        where: {
          organizationId,
          productId,
          warehouseId,
        },
      });

      if (!inventory) {
        throw new NotFoundException(`Inventory not found for this product in this warehouse`);
      }

      // For negative adjustments, check availability
      if (quantityDifference < 0) {
        const available = inventory.physical_on_hand - (inventory.reserved || 0);
        if (available < Math.abs(quantityDifference)) {
          throw new BadRequestException(
            `Cannot adjust. Available: ${available}, Adjustment: ${Math.abs(quantityDifference)}`,
          );
        }
      }

      // Update inventory
      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          physical_on_hand: {
            increment: quantityDifference,
          },
          available: {
            increment: quantityDifference,
          },
        },
      });

      // Record movement
      const movement = await tx.inventoryMovement.create({
        data: {
          organizationId,
          inventoryId: inventory.id,
          movementType: adjustmentType,
          quantity: Math.abs(quantityDifference),
          reference: `${adjustmentType}`,
          remarks: remarks || `${adjustmentType} adjustment`,
          createdBy,
        },
      });

      return {
        success: true,
        inventory: updated,
        movement,
        adjustmentType,
        quantityChanged: quantityDifference,
      };
    });
  }

  /**
   * TRANSFER STOCK - Transfer stock between warehouses
   */
  async initiateTransfer(
    organizationId: number,
    productId: number,
    fromWarehouseId: number,
    toWarehouseId: number,
    quantity: number,
    requestedBy: number,
    remarks?: string,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must be different');
    }

    return this.transactionService.run(async tx => {
      // Get source inventory
      const fromInventory = await tx.inventory.findFirst({
        where: {
          organizationId,
          productId,
          warehouseId: fromWarehouseId,
        },
      });

      if (!fromInventory) {
        throw new NotFoundException(`Inventory not found in source warehouse`);
      }

      const available = fromInventory.physical_on_hand - (fromInventory.reserved || 0);
      if (available < quantity) {
        throw new BadRequestException(
          `Insufficient stock in source warehouse. Available: ${available}, Required: ${quantity}`,
        );
      }

      // Get or create destination inventory
      let toInventory = await tx.inventory.findFirst({
        where: {
          organizationId,
          productId,
          warehouseId: toWarehouseId,
        },
      });

      if (!toInventory) {
        toInventory = await tx.inventory.create({
          data: {
            organizationId,
            productId,
            warehouseId: toWarehouseId,
            physical_on_hand: 0,
            reserved: 0,
            available: 0,
            opening_balance: 0,
          },
        });
      }

      // Generate transfer number
      const transferDate = new Date();
      const transferNumber = `TRF-${transferDate.getFullYear()}-${String(transferDate.getMonth() + 1).padStart(2, '0')}-${String(transferDate.getDate()).padStart(2, '0')}-${Date.now()}`;

      // Create transfer record
      const transfer = await tx.inventoryTransfer.create({
        data: {
          organizationId,
          transferNumber,
          fromInventoryId: fromInventory.id,
          toInventoryId: toInventory.id,
          quantity,
          status: 'PENDING',
          requestedBy,
          remarks,
        },
      });

      return {
        success: true,
        transfer,
        fromInventory: {
          id: fromInventory.id,
          current: fromInventory.physical_on_hand,
        },
        toInventory: {
          id: toInventory.id,
          current: toInventory.physical_on_hand,
        },
      };
    });
  }

  /**
   * CONFIRM TRANSFER - Complete a transfer (warehouse accepts stock)
   */
  async confirmTransfer(organizationId: number, transferId: number, receivedBy: number) {
    return this.transactionService.run(async tx => {
      const transfer = await tx.inventoryTransfer.findFirst({
        where: {
          id: transferId,
          organizationId,
        },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer not found');
      }

      if (transfer.status === 'RECEIVED') {
        throw new ConflictException('Transfer already received');
      }

      if (transfer.status === 'REJECTED') {
        throw new ConflictException('Transfer has been rejected');
      }

      // Update source inventory (stock out)
      const fromInventory = await tx.inventory.findFirst({
        where: { id: transfer.fromInventoryId },
      });

      await tx.inventory.update({
        where: { id: transfer.fromInventoryId },
        data: {
          physical_on_hand: {
            decrement: transfer.quantity,
          },
          available: {
            decrement: transfer.quantity,
          },
        },
      });

      // Record stock out movement
      await tx.inventoryMovement.create({
        data: {
          organizationId,
          inventoryId: transfer.fromInventoryId,
          movementType: 'TRANSFER_OUT',
          quantity: transfer.quantity,
          reference: transfer.transferNumber,
          remarks: `Transfer out to warehouse`,
          createdBy: receivedBy,
        },
      });

      // Update destination inventory (stock in)
      await tx.inventory.update({
        where: { id: transfer.toInventoryId },
        data: {
          physical_on_hand: {
            increment: transfer.quantity,
          },
          available: {
            increment: transfer.quantity,
          },
        },
      });

      // Record stock in movement
      await tx.inventoryMovement.create({
        data: {
          organizationId,
          inventoryId: transfer.toInventoryId,
          movementType: 'TRANSFER_IN',
          quantity: transfer.quantity,
          reference: transfer.transferNumber,
          remarks: `Transfer in from warehouse`,
          createdBy: receivedBy,
        },
      });

      // Update transfer status
      const updated = await tx.inventoryTransfer.update({
        where: { id: transferId },
        data: {
          status: 'RECEIVED',
          receivedBy,
          receivedDate: new Date(),
        },
      });

      return {
        success: true,
        transfer: updated,
      };
    });
  }

  /**
   * GET MOVEMENT HISTORY - Full movement ledger for an inventory item
   */
  async getMovementHistory(
    organizationId: number,
    inventoryId: number,
    limit: number = 100,
    offset: number = 0,
  ) {
    const [movements, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where: {
          organizationId,
          inventoryId,
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.inventoryMovement.count({
        where: {
          organizationId,
          inventoryId,
        },
      }),
    ]);

    return {
      inventoryId,
      total,
      movements,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * GET TRANSFER HISTORY - All transfers for an inventory
   */
  async getTransferHistory(
    organizationId: number,
    warehouseId?: number,
    limit: number = 50,
    offset: number = 0,
  ) {
    const where: any = { organizationId };

    if (warehouseId) {
      // Get all inventories for this warehouse
      const inventories = await this.prisma.inventory.findMany({
        where: { organizationId, warehouseId },
        select: { id: true },
      });

      const inventoryIds = inventories.map(i => i.id);

      return this.prisma.inventoryTransfer.findMany({
        where: {
          OR: [{ fromInventoryId: { in: inventoryIds } }, { toInventoryId: { in: inventoryIds } }],
        },
        include: {
          fromInventory: {
            include: {
              Product: { select: { code: true, name: true } },
              warehouse: { select: { name: true } },
            },
          },
          toInventory: {
            include: {
              Product: { select: { code: true, name: true } },
              warehouse: { select: { name: true } },
            },
          },
          requestedByUser: {
            select: { firstName: true, lastName: true, email: true },
          },
          receivedByUser: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    }

    return [];
  }

  /**
   * GET INVENTORY SUMMARY - Overview of all inventory in organization
   */
  async getInventorySummary(organizationId: number) {
    const inventories = await this.prisma.inventory.findMany({
      where: { organizationId },
      include: {
        Product: { select: { code: true, name: true } },
        warehouse: { select: { name: true } },
      },
    });

    const summary = {
      totalItems: inventories.length,
      totalValue: 0,
      byWarehouse: {} as any,
      lowStock: [] as any[],
    };

    for (const inv of inventories) {
      const warehouseName = inv.warehouse.name;

      if (!summary.byWarehouse[warehouseName]) {
        summary.byWarehouse[warehouseName] = {
          totalItems: 0,
          totalQty: 0,
          totalReserved: 0,
          totalAvailable: 0,
        };
      }

      summary.byWarehouse[warehouseName].totalItems += 1;
      summary.byWarehouse[warehouseName].totalQty += inv.physical_on_hand;
      summary.byWarehouse[warehouseName].totalReserved += inv.reserved || 0;
      summary.byWarehouse[warehouseName].totalAvailable +=
        inv.physical_on_hand - (inv.reserved || 0);

      // Check for low stock
      const available = inv.physical_on_hand - (inv.reserved || 0);
      if (available < 10) {
        summary.lowStock.push({
          productCode: inv.Product.code,
          productName: inv.Product.name,
          warehouse: warehouseName,
          available,
          reserved: inv.reserved || 0,
          total: inv.physical_on_hand,
        });
      }
    }

    return summary;
  }
}
