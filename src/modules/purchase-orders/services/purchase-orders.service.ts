import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { TransactionService } from 'src/common/services/transaction.service';
import {
  CreatePurchaseOrderDto,
  ConfirmReceiptDto,
  SetProductReorderParamsDto,
} from '../dto/purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
  ) {}

  private async generatePoNumber(organizationId: number): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    const sequence = String(count + 1).padStart(6, '0');
    return `PO-${sequence}`;
  }

  async create(
    organizationId: number,
    userId: number,
    createDto: CreatePurchaseOrderDto,
  ) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: createDto.vendorId, organizationId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const po_number = await this.generatePoNumber(organizationId);

    const products = await this.prisma.product.findMany({
      where: {
        organizationId,
        id: { in: createDto.items.map((i) => i.productId) },
      },
    });

    if (products.length !== createDto.items.length) {
      throw new BadRequestException('One or more products not found');
    }

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        organizationId,
        po_number,
        vendorId: createDto.vendorId,
        status: 'DRAFT',
        expected_delivery_date: createDto.expected_delivery_date
          ? new Date(createDto.expected_delivery_date)
          : null,
        created_by: userId,
        remarks: createDto.remarks,
        items: {
          createMany: {
            data: createDto.items.map((item) => ({
              productId: item.productId,
              quantity_ordered: item.quantity_ordered,
            })),
          },
        },
      },
      include: {
        vendor: true,
        items: {
          include: { product: true },
        },
      },
    });

    return purchaseOrder;
  }

  async getDraft(organizationId: number, skip = 0, take = 10) {
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { organizationId, status: 'DRAFT' },
        skip,
        take,
        include: {
          vendor: true,
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({
        where: { organizationId, status: 'DRAFT' },
      }),
    ]);

    return { data, total, page: Math.floor(skip / take) + 1, hasMore: skip + take < total };
  }

  async getSent(organizationId: number, skip = 0, take = 10) {
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: {
          organizationId,
          status: { in: ['SENT', 'PARTIAL_RECEIVED'] },
        },
        skip,
        take,
        include: {
          vendor: true,
          items: { include: { product: true } },
          receipts: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({
        where: {
          organizationId,
          status: { in: ['SENT', 'PARTIAL_RECEIVED'] },
        },
      }),
    ]);

    return { data, total, page: Math.floor(skip / take) + 1, hasMore: skip + take < total };
  }

  async getReceived(organizationId: number, skip = 0, take = 10) {
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { organizationId, status: 'RECEIVED' },
        skip,
        take,
        include: {
          vendor: true,
          items: { include: { product: true } },
          receipts: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({
        where: { organizationId, status: 'RECEIVED' },
      }),
    ]);

    return { data, total, page: Math.floor(skip / take) + 1, hasMore: skip + take < total };
  }

  async getById(organizationId: number, poId: number) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, organizationId },
      include: {
        vendor: true,
        items: { include: { product: true } },
        receipts: true,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  async send(organizationId: number, poId: number) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, organizationId },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot send PO with status ${po.status}`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'SENT',
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        vendor: true,
        items: { include: { product: true } },
      },
    });
  }

  async confirmReceipt(
    organizationId: number,
    poId: number,
    userId: number,
    confirmDto: ConfirmReceiptDto,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, organizationId },
      include: {
        items: true,
        vendor: true,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'SENT' && po.status !== 'PARTIAL_RECEIVED') {
      throw new BadRequestException(`Cannot receive items for PO with status ${po.status}`);
    }

    await this.transactionService.run(async (tx) => {
      for (const receiveItem of confirmDto.items) {
        const poItem = po.items.find((i) => i.productId === receiveItem.productId);

        if (!poItem) {
          throw new BadRequestException(
            `Product ${receiveItem.productId} not in this purchase order`,
          );
        }

        if (receiveItem.quantity_received > poItem.quantity_ordered) {
          throw new BadRequestException(
            `Received quantity exceeds ordered quantity for product ${receiveItem.productId}`,
          );
        }

        // Update PO item quantity received
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: {
            quantity_received: {
              increment: receiveItem.quantity_received,
            },
          },
        });

        // Create receipt record
        await tx.purchaseOrderReceipt.create({
          data: {
            poId,
            productId: receiveItem.productId,
            quantity_received: receiveItem.quantity_received,
            warehouse_id: receiveItem.warehouse_id,
            received_by: userId,
            remarks: confirmDto.remarks,
          },
        });

        // Update inventory
        let inventory = await tx.inventory.findFirst({
          where: {
            productId: receiveItem.productId,
            warehouseId: receiveItem.warehouse_id,
            organizationId,
          },
        });

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              organizationId,
              productId: receiveItem.productId,
              warehouseId: receiveItem.warehouse_id,
              physical_on_hand: receiveItem.quantity_received,
              reserved: 0,
            },
          });
        } else {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              physical_on_hand: {
                increment: receiveItem.quantity_received,
              },
            },
          });
        }
      }

      // Check if all items received
      const allItems = await tx.purchaseOrderItem.findMany({ where: { poId } });
      const allReceived = allItems.every((i) => i.quantity_received === i.quantity_ordered);

      const newStatus = allReceived ? 'RECEIVED' : 'PARTIAL_RECEIVED';

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: newStatus,
          actual_delivery_date: newStatus === 'RECEIVED' ? new Date() : null,
        },
      });
    });

    return this.getById(organizationId, poId);
  }

  async setProductReorderParams(
    organizationId: number,
    productId: number,
    setDto: SetProductReorderParamsDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (setDto.primary_vendor_id) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: setDto.primary_vendor_id, organizationId },
      });

      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        minimum_quantity: setDto.minimum_quantity,
        reorder_quantity: setDto.reorder_quantity,
        primary_vendor_id: setDto.primary_vendor_id,
      },
    });
  }

  async getLowStockAlerts(organizationId: number) {
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        organizationId,
        isActive: true,
        minimum_quantity: { gt: 0 },
      },
      include: {
        inventory: {
          where: { organizationId },
        },
        primaryVendor: true,
      },
    });

    const alerts = lowStockProducts
      .map((product) => {
        const totalAvailable = product.inventory.reduce((sum, inv) => sum + inv.available, 0);

        if (totalAvailable <= product.minimum_quantity) {
          return {
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            minimum_quantity: product.minimum_quantity,
            current_available: totalAvailable,
            shortage: product.minimum_quantity - totalAvailable,
            reorder_quantity: product.reorder_quantity,
            primaryVendorId: product.primary_vendor_id,
            primaryVendor: product.primaryVendor,
            inventory_by_warehouse: product.inventory,
          };
        }

        return null;
      })
      .filter((a) => a !== null);

    return {
      total_alerts: alerts.length,
      alerts,
      can_auto_generate_po: alerts.length > 0,
    };
  }

  async autoCreatePOsForLowStock(organizationId: number, userId: number) {
    const alerts = await this.getLowStockAlerts(organizationId);

    if (alerts.alerts.length === 0) {
      return { message: 'No low stock items', created_pos: [] };
    }

    const createdPOs = [];

    for (const alert of alerts.alerts) {
      if (!alert.primaryVendorId) {
        continue; // Skip if no vendor assigned
      }

      const po_number = await this.generatePoNumber(organizationId);

      const po = await this.prisma.purchaseOrder.create({
        data: {
          organizationId,
          po_number,
          vendorId: alert.primaryVendorId,
          status: 'DRAFT',
          created_by: userId,
          remarks: `Auto-created for low stock: ${alert.productCode}`,
          items: {
            create: {
              productId: alert.productId,
              quantity_ordered: alert.reorder_quantity || alert.shortage * 2,
            },
          },
        },
        include: {
          vendor: true,
          items: { include: { product: true } },
        },
      });

      createdPOs.push(po);
    }

    return {
      message: `Auto-created ${createdPOs.length} purchase orders`,
      created_pos: createdPOs,
    };
  }
}
