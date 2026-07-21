import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { TransactionService } from 'src/common/services/transaction.service';
import { TransactionSequenceService } from 'src/common/services/transaction-sequence.service';
import { DOC_SEQUENCE, DOC_PATTERN } from 'src/common/config/document-sequences';
import { InventoryOperationsService } from '../../inventory/services/inventory-operations.service';
import { CreatePurchaseReturnDto } from '../dto/purchase-return.dto';

@Injectable()
export class PurchaseReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
    private readonly inventoryOperations: InventoryOperationsService,
    private readonly transactionSequenceService: TransactionSequenceService,
  ) {}

  private async generateReturnNumber(organizationId: number): Promise<string> {
    const next = await this.transactionSequenceService.getNextCounterSeeded(
      organizationId,
      DOC_SEQUENCE.purchaseReturn(),
      async db => {
        const rows = await db.purchaseReturn.findMany({
          where: { organizationId },
          select: { returnNumber: true },
        });
        return TransactionSequenceService.highestSequence(
          rows.map(r => r.returnNumber),
          DOC_PATTERN.purchaseReturn,
        );
      },
    );

    return `PR-${String(next).padStart(6, '0')}`;
  }

  // Returning stock to a vendor removes it from our inventory - decrement
  // each line's warehouse via the shared stock gateway (same one PO receipt
  // uses for stock-in) so physical_on_hand/available/InventoryMovement all
  // stay consistent, and the operation fails loudly if there isn't actually
  // enough stock in that warehouse to return.
  async create(organizationId: number, userId: number, dto: CreatePurchaseReturnDto) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, organizationId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (dto.poId) {
      const po = await this.prisma.purchaseOrder.findFirst({
        where: { id: dto.poId, organizationId, vendorId: dto.vendorId },
      });
      if (!po) {
        throw new BadRequestException('Purchase order not found for this vendor');
      }
    }

    const productIds = dto.items.map(i => i.productId);
    const products = await this.prisma.product.findMany({
      where: { organizationId, id: { in: productIds } },
    });
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('One or more products not found');
    }

    const returnNumber = await this.generateReturnNumber(organizationId);
    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();

    return this.transactionService.run(async tx => {
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          organizationId,
          returnNumber,
          vendorId: dto.vendorId,
          poId: dto.poId ?? null,
          returnDate,
          returnAmount: 0,
          createdBy: userId,
          remarks: dto.remarks,
        },
      });

      let returnAmount = 0;
      for (const item of dto.items) {
        const unitCostCents = Math.round(item.unitCost * 100);

        await tx.purchaseReturnItem.create({
          data: {
            returnId: purchaseReturn.id,
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantityReturned: item.quantityReturned,
            unitCost: unitCostCents,
          },
        });

        await this.inventoryOperations.applyStockOutTx(tx, {
          organizationId,
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.quantityReturned,
          reference: returnNumber,
          createdBy: userId,
          movementType: 'RETURN',
          remarks: `Purchase return to ${vendor.name}${dto.remarks ? ' - ' + dto.remarks : ''}`,
        });

        returnAmount += unitCostCents * item.quantityReturned;
      }

      return tx.purchaseReturn.update({
        where: { id: purchaseReturn.id },
        data: { returnAmount },
        include: { items: { include: { product: true, warehouse: true } }, vendor: true },
      });
    });
  }

  async getById(organizationId: number, id: number) {
    const purchaseReturn = await this.prisma.purchaseReturn.findFirst({
      where: { id, organizationId },
      include: {
        vendor: true,
        purchaseOrder: true,
        items: { include: { product: true, warehouse: true } },
      },
    });
    if (!purchaseReturn) {
      throw new NotFoundException('Purchase return not found');
    }
    return purchaseReturn;
  }

  async list(organizationId: number, skip: number, take: number) {
    const [data, total] = await Promise.all([
      this.prisma.purchaseReturn.findMany({
        where: { organizationId },
        include: { vendor: true, items: true },
        orderBy: { returnDate: 'desc' },
        skip,
        take,
      }),
      this.prisma.purchaseReturn.count({ where: { organizationId } }),
    ]);
    return { data, total, skip, take };
  }

  async getByVendor(organizationId: number, vendorId: number) {
    return this.prisma.purchaseReturn.findMany({
      where: { organizationId, vendorId },
      include: { items: { include: { product: true } } },
      orderBy: { returnDate: 'desc' },
    });
  }
}
