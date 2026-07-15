import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { TransactionSequenceService } from '@common/services/transaction-sequence.service';
import { DOC_SEQUENCE, DOC_PATTERN } from '@common/config/document-sequences';
import { InventoryOperationsService } from '../../inventory/services/inventory-operations.service';
import {
  CreateWarehouseTransferDto,
  ConfirmTransferReceiptDto,
  RejectTransferDto,
} from '../dto/transfer.dto';

@Injectable()
export class WarehouseTransfersService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
    private transactionSequenceService: TransactionSequenceService,
    private inventoryOperations: InventoryOperationsService,
  ) {}

  // Was `count() + 1`, which is not a sequence: delete one transfer and the
  // count goes backwards, so the next number collides with an existing one.
  // Counter-based now - a deleted number stays burned. Runs on the caller's
  // tx, so the number is only consumed if the transfer actually commits.
  private async generateTransferNumber(
    organizationId: number,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();

    const next = await this.transactionSequenceService.getNextCounterSeeded(
      organizationId,
      DOC_SEQUENCE.warehouseTransfer(year),
      async db => {
        const rows = await db.warehouseTransfer.findMany({
          where: { organizationId, transfer_number: { startsWith: `TRF-${year}-` } },
          select: { transfer_number: true },
        });
        return TransactionSequenceService.highestSequence(
          rows.map(r => r.transfer_number),
          DOC_PATTERN.warehouseTransfer(year),
        );
      },
      tx,
    );

    return `TRF-${year}-${String(next).padStart(6, '0')}`;
  }

  async create(organizationId: number, userId: number, createDto: CreateWarehouseTransferDto) {
    return this.transactionService.run(async tx => {
      // Verify warehouses exist
      const fromWarehouse = await tx.warehouse.findFirst({
        where: {
          id: createDto.fromWarehouseId,
          organizationId,
        },
      });

      if (!fromWarehouse) {
        throw new BadRequestException('Source warehouse not found');
      }

      const toWarehouse = await tx.warehouse.findFirst({
        where: {
          id: createDto.toWarehouseId,
          organizationId,
        },
      });

      if (!toWarehouse) {
        throw new BadRequestException('Destination warehouse not found');
      }

      if (fromWarehouse.id === toWarehouse.id) {
        throw new BadRequestException('Source and destination warehouses must be different');
      }

      // Verify inventory exists and is sufficient
      for (const item of createDto.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            organizationId,
            productId: item.productId,
            warehouseId: createDto.fromWarehouseId,
          },
        });

        if (!inventory) {
          throw new BadRequestException(`Product ${item.productId} not found in source warehouse`);
        }

        if (inventory.available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${item.productId}. Available: ${inventory.available}, Required: ${item.quantity}`,
          );
        }
      }

      // Create transfer
      const transferNumber = await this.generateTransferNumber(organizationId, tx);

      const transfer = await tx.warehouseTransfer.create({
        data: {
          organizationId,
          transfer_number: transferNumber,
          from_warehouse_id: createDto.fromWarehouseId,
          to_warehouse_id: createDto.toWarehouseId,
          status: 'PENDING',
          transfer_date: new Date(),
          created_by: userId,
          // WarehouseTransfer.updatedAt has no @updatedAt in schema.prisma, so
          // Prisma can't auto-manage it - must be supplied explicitly.
          updatedAt: new Date(),
          items: {
            create: createDto.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
          from_warehouse: true,
          to_warehouse: true,
        },
      });

      // Note: 'quantity' field is calculated from items, not stored directly on WarehouseTransfer
      // Reserve stock in source warehouse
      for (const item of createDto.items) {
        await tx.inventory.update({
          where: {
            organizationId_productId_warehouseId: {
              organizationId,
              productId: item.productId,
              warehouseId: createDto.fromWarehouseId,
            },
          },
          data: {
            reserved: {
              increment: item.quantity,
            },
            available: {
              decrement: item.quantity,
            },
          },
        });
      }

      return transfer;
    });
  }

  async getPending(organizationId: number, skip = 0, take = 10) {
    const [transfers, total] = await Promise.all([
      this.prisma.warehouseTransfer.findMany({
        where: {
          organizationId,
          status: 'PENDING',
        },
        include: {
          items: true,
          from_warehouse: true,
          to_warehouse: true,
        },
        orderBy: { transfer_date: 'desc' },
        skip,
        take,
      }),
      this.prisma.warehouseTransfer.count({
        where: {
          organizationId,
          status: 'PENDING',
        },
      }),
    ]);

    return {
      data: transfers,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      hasMore: skip + take < total,
    };
  }

  async startTransfer(organizationId: number, transferId: number) {
    const transfer = await this.prisma.warehouseTransfer.findFirst({
      where: {
        id: transferId,
        organizationId,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(`Cannot start transfer with status ${transfer.status}`);
    }

    return this.prisma.warehouseTransfer.update({
      where: { id: transferId },
      data: {
        status: 'IN_TRANSIT',
      },
      include: {
        items: true,
        from_warehouse: true,
        to_warehouse: true,
      },
    });
  }

  async getInTransit(organizationId: number, skip = 0, take = 10) {
    const [transfers, total] = await Promise.all([
      this.prisma.warehouseTransfer.findMany({
        where: {
          organizationId,
          status: 'IN_TRANSIT',
        },
        include: {
          items: true,
          from_warehouse: true,
          to_warehouse: true,
        },
        orderBy: { transfer_date: 'desc' },
        skip,
        take,
      }),
      this.prisma.warehouseTransfer.count({
        where: {
          organizationId,
          status: 'IN_TRANSIT',
        },
      }),
    ]);

    return {
      data: transfers,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      hasMore: skip + take < total,
    };
  }

  async getById(organizationId: number, transferId: number) {
    const transfer = await this.prisma.warehouseTransfer.findFirst({
      where: {
        id: transferId,
        organizationId,
      },
      include: {
        items: true,
        from_warehouse: true,
        to_warehouse: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  async confirmReceipt(
    organizationId: number,
    transferId: number,
    userId: number,
    confirmDto: ConfirmTransferReceiptDto,
  ) {
    return this.transactionService.run(async tx => {
      const transfer = await tx.warehouseTransfer.findFirst({
        where: {
          id: transferId,
          organizationId,
        },
        include: {
          items: true,
        },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer not found');
      }

      if (transfer.status !== 'IN_TRANSIT') {
        throw new BadRequestException(`Cannot confirm transfer with status ${transfer.status}`);
      }

      // Validate received quantities
      for (const received of confirmDto.items) {
        const item = transfer.items.find(i => i.productId === received.productId);

        if (!item) {
          throw new BadRequestException(`Product ${received.productId} not found in transfer`);
        }

        if (received.quantityReceived > item.quantity) {
          throw new BadRequestException(
            `Received quantity ${received.quantityReceived} exceeds transfer quantity ${item.quantity}`,
          );
        }
      }

      // Update inventory for destination warehouse
      for (const received of confirmDto.items) {
        const item = transfer.items.find(i => i.productId === received.productId);

        // Destination: a plain stock-in, so it goes through the shared gateway,
        // which also writes the InventoryMovement audit row this flow was
        // missing entirely.
        await this.inventoryOperations.applyStockInTx(tx, {
          organizationId,
          productId: received.productId,
          warehouseId: transfer.to_warehouse_id,
          quantity: received.quantityReceived,
          reference: transfer.transfer_number,
          createdBy: userId,
          movementType: 'TRANSFER_IN',
        });

        // Source: NOT a plain stock-out - this releases the reservation taken
        // when the transfer started. The whole hold comes off `reserved`, the
        // shortfall (goods that never arrived) is credited back to `available`,
        // and only what actually shipped leaves `physical_on_hand`.
        // stockOut() cannot express this: it never touches `reserved`. So the
        // quantity math stays here, and only the audit row is delegated.
        const shortageQty = item.quantity - received.quantityReceived;
        const sourceInventory = await tx.inventory.update({
          where: {
            organizationId_productId_warehouseId: {
              organizationId,
              productId: received.productId,
              warehouseId: transfer.from_warehouse_id,
            },
          },
          data: {
            reserved: {
              decrement: item.quantity,
            },
            available: {
              increment: shortageQty,
            },
            physical_on_hand: {
              decrement: received.quantityReceived,
            },
          },
        });

        await this.inventoryOperations.recordMovementTx(tx, {
          organizationId,
          inventoryId: sourceInventory.id,
          movementType: 'TRANSFER_OUT',
          quantity: received.quantityReceived,
          reference: transfer.transfer_number,
          createdBy: userId,
        });
      }

      // Update transfer status
      const confirmed = await tx.warehouseTransfer.update({
        where: { id: transferId },
        data: {
          status: 'RECEIVED',
        },
        include: {
          items: true,
          from_warehouse: true,
          to_warehouse: true,
        },
      });

      return confirmed;
    });
  }

  async reject(
    organizationId: number,
    transferId: number,
    _userId: number,
    _rejectDto: RejectTransferDto,
  ) {
    return this.transactionService.run(async tx => {
      const transfer = await tx.warehouseTransfer.findFirst({
        where: {
          id: transferId,
          organizationId,
        },
        include: {
          items: true,
        },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer not found');
      }

      if (!['PENDING', 'IN_TRANSIT'].includes(transfer.status)) {
        throw new BadRequestException(`Cannot reject transfer with status ${transfer.status}`);
      }

      // Release reserved inventory back to source warehouse
      for (const item of transfer.items) {
        await tx.inventory.update({
          where: {
            organizationId_productId_warehouseId: {
              organizationId,
              productId: item.productId,
              warehouseId: transfer.from_warehouse_id,
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

      // Update transfer status
      const rejected = await tx.warehouseTransfer.update({
        where: { id: transferId },
        data: {
          status: 'REJECTED',
        },
        include: {
          items: true,
          from_warehouse: true,
          to_warehouse: true,
        },
      });

      return rejected;
    });
  }
}
