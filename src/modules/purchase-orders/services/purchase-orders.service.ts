import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { TransactionService } from 'src/common/services/transaction.service';
import {
  CreatePurchaseOrderDto,
  ConfirmReceiptDto,
  SetProductReorderParamsDto,
  UpdatePurchaseOrderDto,
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

  async create(organizationId: number, userId: number, createDto: CreatePurchaseOrderDto) {
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
        id: { in: createDto.items.map(i => i.productId) },
      },
    });

    if (products.length !== createDto.items.length) {
      throw new BadRequestException('One or more products not found');
    }

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        organizationId,
        po_number: poNumber,
        vendorId: createDto.vendorId,
        status: 'DRAFT',
        created_by: userId,
        PurchaseOrderItem: {
          createMany: {
            data: createDto.items.map(item => ({
              productId: item.productId,
              quantity_ordered: item.quantityOrdered,
            })),
          },
        },
      },
      include: {
        vendor: true,
        PurchaseOrderItem: true,
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
          PurchaseOrderItem: true,
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
          PurchaseOrderItem: true,
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
          PurchaseOrderItem: true,
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
        PurchaseOrderItem: true,
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
        PurchaseOrderItem: true,
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
        PurchaseOrderItem: true,
        vendor: true,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'SENT' && po.status !== 'PARTIAL_RECEIVED') {
      throw new BadRequestException(`Cannot receive items for PO with status ${po.status}`);
    }

    await this.transactionService.run(async tx => {
      for (const receiveItem of confirmDto.items) {
        const poItem = po.PurchaseOrderItem.find(i => i.productId === receiveItem.productId);

        if (!poItem) {
          throw new BadRequestException(
            `Product ${receiveItem.productId} not in this purchase order`,
          );
        }

        if (receiveItem.quantityReceived > poItem.quantity_ordered) {
          throw new BadRequestException(
            `Received quantity exceeds ordered quantity for product ${receiveItem.productId}`,
          );
        }

        // Create receipt record
        await tx.purchaseOrderReceipt.create({
          data: {
            poId,
            productId: receiveItem.productId,
            quantity_received: receiveItem.quantityReceived,
            warehouse_id: receiveItem.warehouseId,
            received_by: userId,
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
              physical_on_hand: receiveItem.quantityReceived,
              reserved: 0,
            },
          });
        } else {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              physical_on_hand: {
                increment: receiveItem.quantityReceived,
              },
            },
          });
        }
      }

      // Check if all items received by comparing receipts with orders
      const allItems = await tx.purchaseOrderItem.findMany({ where: { poId } });
      const receipts = await tx.purchaseOrderReceipt.findMany({ where: { poId } });

      const allReceived = allItems.every(item => {
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
        minimum_quantity: setDto.minimumQuantity,
        reorder_quantity: setDto.reorderQuantity,
        primary_vendor_id: setDto.primaryVendorId,
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
        Vendor: true,
      },
    });

    // Fetch inventory data separately
    const inventoryData = await this.prisma.inventory.findMany({
      where: {
        organizationId,
        productId: { in: lowStockProducts.map(p => p.id) },
      },
    });

    const alerts = lowStockProducts
      .map(product => {
        const productInventory = inventoryData.filter(inv => inv.productId === product.id);
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
            primaryVendorId: product.primary_vendor_id,
            inventoryByWarehouse: productInventory,
          };
        }

        return null;
      })
      .filter(a => a !== null);

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
          po_number: poNumber,
          vendorId: alert.primaryVendorId,
          status: 'DRAFT',
          created_by: _userId,
          PurchaseOrderItem: {
            create: {
              productId: alert.productId,
              quantity_ordered: alert.reorderQuantity || alert.shortage * 2,
            },
          },
        },
        include: {
          vendor: true,
          PurchaseOrderItem: true,
        },
      });

      createdPOs.push(po);
    }

    return {
      message: `Auto-created ${createdPOs.length} purchase orders`,
      createdPos: createdPOs,
    };
  }

  async getVendorMetrics(organizationId: number, vendorId: number) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, organizationId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const pos = await this.prisma.purchaseOrder.findMany({
      where: { vendorId, organizationId },
      include: {
        PurchaseOrderItem: true,
        PurchaseOrderReceipt: true,
      },
    });

    const totalOrders = pos.length;
    const completedOrders = pos.filter(p => p.status === 'RECEIVED').length;
    const totalValue = pos.reduce((sum: number, p: any) => sum + (Number(p.po_amount) || 0), 0);

    // Calculate average delivery days
    let totalDeliveryDays = 0;
    let deliveredCount = 0;
    pos.forEach(po => {
      if (po.status === 'RECEIVED' && po.updatedAt && po.createdAt) {
        const days = Math.floor(
          (po.updatedAt.getTime() - po.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        totalDeliveryDays += days;
        deliveredCount++;
      }
    });

    const avgDeliveryDays = deliveredCount > 0 ? Math.round(totalDeliveryDays / deliveredCount) : 0;

    return {
      vendorId,
      vendorName: vendor.name,
      totalOrders,
      completedOrders,
      completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0,
      totalValue,
      averageOrderValue: totalOrders > 0 ? totalValue / totalOrders : 0,
      averageDeliveryDays: avgDeliveryDays,
    };
  }

  async updatePO(organizationId: number, poId: number, updateData: UpdatePurchaseOrderDto) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, organizationId },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Can only update POs in DRAFT status');
    }

    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        vendorId: updateData.vendorId,
        expected_delivery_date: updateData.expectedDeliveryDate
          ? new Date(updateData.expectedDeliveryDate)
          : undefined,
        manual_reference: updateData.manualReference,
        remarks: updateData.remarks,
      },
      include: {
        vendor: true,
        PurchaseOrderItem: true,
      },
    });
  }

  async deletePO(organizationId: number, poId: number) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, organizationId },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete POs in DRAFT status');
    }

    // Delete associated items first
    await this.prisma.purchaseOrderItem.deleteMany({
      where: { poId },
    });

    return this.prisma.purchaseOrder.delete({
      where: { id: poId },
    });
  }

  async findAll(organizationId: number, skip = 0, take = 10, filters: any = {}) {
    const where: any = { organizationId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        include: {
          vendor: true,
          PurchaseOrderItem: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      hasMore: skip + take < total,
    };
  }
}
