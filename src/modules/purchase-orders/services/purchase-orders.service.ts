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
    _userId: number,
    createDto: CreatePurchaseOrderDto,
  ) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: createDto.vendorId, organizationId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const poNumber = await this.generatePoNumber(organizationId);

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
        poNumber,
        vendorId: createDto.vendorId,
        status: 'DRAFT',
        poDate: new Date(),
        items: {
          createMany: {
            data: createDto.items.map((item) => ({
              organizationId,
              productId: item.productId,
              quantityOrdered: item.quantityOrdered,
            })),
          },
        },
      },
      include: {
        vendor: true,
        items: true,
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
          items: true,
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
          items: true,
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
          items: true,
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
        items: true,
        PurchaseOrderReceipt: true,
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
      },
      include: {
        vendor: true,
        items: true,
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

        if (receiveItem.quantityReceived > poItem.quantityOrdered) {
          throw new BadRequestException(
            `Received quantity exceeds ordered quantity for product ${receiveItem.productId}`,
          );
        }

        // Create receipt record
        await tx.purchaseOrderReceipt.create({
          data: {
            organizationId,
            poId,
            productId: receiveItem.productId,
            quantityReceived: receiveItem.quantityReceived,
            warehouseId: receiveItem.warehouseId,
            receivedBy: userId,
            remarks: confirmDto.remarks,
          },
        });

        // Update inventory
        let inventory = await tx.inventory.findFirst({
          where: {
            productId: receiveItem.productId,
            warehouseId: receiveItem.warehouseId,
            organizationId,
          },
        });

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              organizationId,
              productId: receiveItem.productId,
              warehouseId: receiveItem.warehouseId,
              physicalOnHand: receiveItem.quantityReceived,
              reserved: 0,
            },
          });
        } else {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              physicalOnHand: {
                increment: receiveItem.quantityReceived,
              },
            },
          });
        }
      }

      // Check if all items received by comparing receipts with orders
      const allItems = await tx.purchaseOrderItem.findMany({ where: { poId } });
      const receipts = await tx.purchaseOrderReceipt.findMany({ where: { poId } });

      const allReceived = allItems.every((item) => {
        const totalReceived = receipts
          .filter(r => r.productId === item.productId)
          .reduce((sum, r) => sum + (r as any).quantity_received, 0);
        return totalReceived >= (item as any).quantity_ordered;
      });

      const newStatus = allReceived ? 'RECEIVED' : 'PARTIAL_RECEIVED';

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: newStatus,
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

    if (setDto.primaryVendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: setDto.primaryVendorId, organizationId },
      });

      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        minimumQuantity: setDto.minimumQuantity,
        reorderQuantity: setDto.reorderQuantity,
        primaryVendorId: setDto.primaryVendorId,
      },
    });
  }

  async getLowStockAlerts(organizationId: number) {
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        organizationId,
        isActive: true,
        minimumQuantity: { gt: 0 },
      },
      include: {
        primaryVendor: true,
      },
    });

    // Fetch inventory data separately
    const inventoryData = await this.prisma.inventory.findMany({
      where: {
        organizationId,
        productId: { in: lowStockProducts.map((p) => p.id) },
      },
    });

    const alerts = lowStockProducts
      .map((product) => {
        const productInventory = inventoryData.filter((inv) => inv.productId === product.id);
        const totalAvailable = productInventory.reduce((sum, inv) => sum + inv.available, 0);

        if (totalAvailable <= (product as any).minimum_quantity) {
          return {
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            minimumQuantity: (product as any).minimum_quantity,
            currentAvailable: totalAvailable,
            shortage: (product as any).minimum_quantity - totalAvailable,
            reorderQuantity: (product as any).reorder_quantity,
            primaryVendorId: (product as any).primary_vendor_id,
            primaryVendor: product.primaryVendor,
            inventoryByWarehouse: productInventory,
          };
        }

        return null;
      })
      .filter((a) => a !== null);

    return {
      totalAlerts: alerts.length,
      alerts,
      canAutoGeneratePo: alerts.length > 0,
    };
  }

  async autoCreatePOsForLowStock(organizationId: number, _userId: number) {
    const alerts = await this.getLowStockAlerts(organizationId);

    if (alerts.alerts.length === 0) {
      return { message: 'No low stock items', createdPos: [] };
    }

    const createdPOs = [];

    for (const alert of alerts.alerts) {
      if (!alert.primaryVendorId) {
        continue; // Skip if no vendor assigned
      }

      const poNumber = await this.generatePoNumber(organizationId);

      const po = await this.prisma.purchaseOrder.create({
        data: {
          organizationId,
          poNumber,
          vendorId: alert.primaryVendorId,
          status: 'DRAFT',
          poDate: new Date(),
          items: {
            create: {
              organizationId,
              productId: alert.productId,
              quantityOrdered: alert.reorderQuantity || alert.shortage * 2,
            },
          },
        },
        include: {
          vendor: true,
          items: true,
        },
      });

      createdPOs.push(po);
    }

    return {
      message: `Auto-created ${createdPOs.length} purchase orders`,
      createdPos: createdPOs,
    };
  }
}
