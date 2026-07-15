import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, InventoryMovementType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { TransactionService } from '../../../common/services/transaction.service';

@Injectable()
export class InventoryOperationsService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
  ) {}

  /**
   * Increment stock inside a caller's existing transaction.
   *
   * `stockIn` below opens its own transaction, so it cannot be called from
   * within one (Prisma would run it on a separate connection, outside the
   * caller's atomicity). Multi-step flows that already hold a `tx` - PO
   * receipt, warehouse transfer - must use this instead, so that the stock
   * change and its InventoryMovement commit or roll back with the rest of
   * the document.
   *
   * Both `physical_on_hand` and `available` move together. Reservations are
   * the only thing that makes them diverge, and this method does not touch
   * `reserved` - a caller with reservation semantics of its own (e.g. the
   * transfer source, releasing a hold) must do that math itself and call
   * `recordMovementTx` for the audit row.
   */
  async applyStockInTx(
    tx: Prisma.TransactionClient,
    params: {
      organizationId: number;
      productId: number;
      warehouseId: number;
      quantity: number;
      reference: string;
      createdBy: number;
      movementType?: InventoryMovementType;
      remarks?: string;
    },
  ) {
    const { organizationId, productId, warehouseId, quantity, reference, createdBy } = params;

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive number');
    }

    const inventory = await tx.inventory.upsert({
      where: {
        organizationId_productId_warehouseId: { organizationId, productId, warehouseId },
      },
      create: {
        organizationId,
        productId,
        warehouseId,
        physical_on_hand: quantity,
        available: quantity,
        reserved: 0,
        opening_balance: 0,
      },
      update: {
        physical_on_hand: { increment: quantity },
        available: { increment: quantity },
      },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        organizationId,
        inventoryId: inventory.id,
        movementType: params.movementType ?? 'STOCK_IN',
        quantity,
        reference,
        remarks: params.remarks,
        createdBy,
      },
    });

    return { inventory, movement };
  }

  /**
   * Decrement stock inside a caller's existing transaction - the applyStockInTx
   * counterpart for callers that already hold a `tx` (manufacturing order
   * completion, currently the only one). Unlike stock-in, a stock-out can never
   * upsert a missing row into existence - there is nothing to take out of a
   * product that was never in this warehouse.
   *
   * Available stock is computed the same way the standalone `stockOut()`
   * above does (`physical_on_hand - reserved`), not read from the stored
   * `available` column, so both call paths agree on what "available" means.
   *
   * The insufficient-stock check below is exactly the class of bug CLAUDE.md
   * documents as the worst in this codebase's history: a field-name typo once
   * made `NaN < quantity` silently evaluate `false`, bypassing this exact
   * check. `Number.isFinite` is asserted before the comparison is ever made,
   * on purpose - never remove it "to simplify".
   */
  async applyStockOutTx(
    tx: Prisma.TransactionClient,
    params: {
      organizationId: number;
      productId: number;
      warehouseId: number;
      quantity: number;
      reference: string;
      createdBy: number;
      movementType?: InventoryMovementType;
      remarks?: string;
    },
  ) {
    const { organizationId, productId, warehouseId, quantity, reference, createdBy } = params;

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive number');
    }

    const inventory = await tx.inventory.findFirst({
      where: { organizationId, productId, warehouseId },
    });
    if (!inventory) {
      throw new NotFoundException('Inventory not found for this product in this warehouse');
    }

    const available = inventory.physical_on_hand - (inventory.reserved || 0);
    if (!Number.isFinite(available)) {
      throw new Error(`Bad inventory read for product ${productId} in warehouse ${warehouseId}`);
    }
    if (available < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${available}, Required: ${quantity}`,
      );
    }

    const updated = await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        physical_on_hand: { decrement: quantity },
        available: { decrement: quantity },
      },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        organizationId,
        inventoryId: inventory.id,
        movementType: params.movementType ?? 'STOCK_OUT',
        quantity,
        reference,
        remarks: params.remarks,
        createdBy,
      },
    });

    return { inventory: updated, movement };
  }

  /**
   * Write an InventoryMovement audit row for a quantity change the caller has
   * already applied itself. Only for callers whose quantity math this service
   * cannot express - currently the warehouse-transfer source, which releases a
   * reservation rather than performing a plain stock-out.
   */
  async recordMovementTx(
    tx: Prisma.TransactionClient,
    params: {
      organizationId: number;
      inventoryId: number;
      movementType: InventoryMovementType;
      quantity: number;
      reference: string;
      createdBy: number;
      remarks?: string;
    },
  ) {
    return tx.inventoryMovement.create({
      data: {
        organizationId: params.organizationId,
        inventoryId: params.inventoryId,
        movementType: params.movementType,
        quantity: params.quantity,
        reference: params.reference,
        remarks: params.remarks,
        createdBy: params.createdBy,
      },
    });
  }

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
    return this.transactionService.run(async tx => {
      const { inventory, movement } = await this.applyStockInTx(tx, {
        organizationId,
        productId,
        warehouseId,
        quantity,
        reference,
        createdBy,
        remarks,
      });

      return { success: true, inventory, movement };
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
        Product: { select: { code: true, name: true, cost_price: true } },
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
          totalValue: 0,
        };
      }

      summary.byWarehouse[warehouseName].totalItems += 1;
      summary.byWarehouse[warehouseName].totalQty += inv.physical_on_hand;
      summary.byWarehouse[warehouseName].totalReserved += inv.reserved || 0;
      summary.byWarehouse[warehouseName].totalAvailable +=
        inv.physical_on_hand - (inv.reserved || 0);

      // On-hand quantity x unit cost - this was previously never
      // accumulated at all (stuck at 0), so totalValue always reported 0.
      // cost_price is a Prisma Decimal object, not a JS number - `number *
      // Decimal` silently evaluates to NaN, so it must be converted first.
      const itemValue = inv.physical_on_hand * Number(inv.Product?.cost_price ?? 0);
      summary.totalValue += itemValue;
      summary.byWarehouse[warehouseName].totalValue += itemValue;

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
