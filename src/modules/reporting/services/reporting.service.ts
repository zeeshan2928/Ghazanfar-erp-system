import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async getGatePassAnalytics(organizationId: number, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const gatePasses = await this.prisma.gatePass.findMany({
      where: {
        organizationId,
        gatePassDate: {
          gte: startDate,
        },
      },
      include: {
        items: true,
      },
    });

    const confirmed = gatePasses.filter((gp) => gp.status === 'CONFIRMED').length;
    const pending = gatePasses.filter((gp) => gp.status === 'PENDING').length;
    const rejected = gatePasses.filter((gp) => gp.status === 'REJECTED').length;

    const fulfillmentRate = gatePasses.length > 0 ? (confirmed / gatePasses.length) * 100 : 0;

    // Calculate average fulfillment time
    let avgFulfillmentTime = 0;
    const confirmedGPs = gatePasses.filter((gp) => gp.confirmedDate && gp.createdAt);
    if (confirmedGPs.length > 0) {
      const totalTime = confirmedGPs.reduce((sum, gp) => {
        return sum + (gp.confirmedDate.getTime() - gp.createdAt.getTime());
      }, 0);
      avgFulfillmentTime = totalTime / confirmedGPs.length / (1000 * 60); // minutes
    }

    return {
      period: { startDate, endDate: new Date(), days },
      summary: {
        totalGatePasses: gatePasses.length,
        confirmed,
        pending,
        rejected,
        fulfillmentRate: parseFloat(fulfillmentRate.toFixed(2)),
        avgFulfillmentTimeMinutes: parseFloat(avgFulfillmentTime.toFixed(2)),
      },
      byStatus: {
        CONFIRMED: confirmed,
        PENDING: pending,
        REJECTED: rejected,
      },
    };
  }

  async getWarehousePerformance(organizationId: number, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const warehouses = await this.prisma.warehouse.findMany({
      where: { organizationId },
      include: {
        gatePasses: {
          where: {
            gatePassDate: {
              gte: startDate,
            },
          },
          include: {
            items: true,
          },
        },
        transfersFrom: {
          where: {
            transferDate: {
              gte: startDate,
            },
          },
          include: {
            items: true,
          },
        },
        transfersTo: {
          where: {
            transferDate: {
              gte: startDate,
            },
          },
          include: {
            items: true,
          },
        },
      },
    });

    return warehouses.map((wh) => {
      const confirmedGPs = wh.gatePasses.filter((gp) => gp.status === 'CONFIRMED').length;
      const fulfillmentRate =
        wh.gatePasses.length > 0 ? (confirmedGPs / wh.gatePasses.length) * 100 : 0;

      const itemsShipped = wh.gatePasses
        .filter((gp) => gp.status === 'CONFIRMED')
        .reduce((sum, gp) => sum + gp.items.reduce((s, item) => s + item.pickedQuantity, 0), 0);

      const itemsReceived = wh.transfersTo.reduce((sum, t) => {
        if (t.status === 'RECEIVED') {
          return sum + t.items.reduce((s, item) => s + item.quantity, 0);
        }
        return sum;
      }, 0);

      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        location: wh.location,
        gatePasses: {
          total: wh.gatePasses.length,
          confirmed: confirmedGPs,
          fulfillmentRate: parseFloat(fulfillmentRate.toFixed(2)),
        },
        inventory: {
          itemsShipped,
          itemsReceived,
          netMovement: itemsReceived - itemsShipped,
        },
      };
    });
  }

  async getStockMovement(organizationId: number, productId?: number, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        billDate: {
          gte: startDate,
        },
      },
      include: {
        lines: {
          where: productId ? { productId } : {},
          include: {
            product: true,
          },
        },
      },
    });

    const movements = bills
      .flatMap((bill) =>
        bill.lines.map((line) => ({
          date: bill.billDate,
          billNumber: bill.billNumber,
          productId: line.productId,
          productName: line.product.name,
          productCode: line.product.code,
          quantity: -line.quantity,
          type: 'SALES',
        })),
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    // Group by product
    const byProduct = {};
    movements.forEach((m) => {
      if (!byProduct[m.productId]) {
        byProduct[m.productId] = {
          productId: m.productId,
          productName: m.productName,
          productCode: m.productCode,
          totalQuantity: 0,
          transactions: [],
        };
      }
      byProduct[m.productId].totalQuantity += m.quantity;
      byProduct[m.productId].transactions.push(m);
    });

    return {
      period: { startDate, endDate: new Date(), days },
      movements: Object.values(byProduct),
    };
  }

  async getBillAnalytics(organizationId: number, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        billDate: {
          gte: startDate,
        },
      },
      include: {
        lines: true,
        customer: true,
      },
    });

    const totalBills = bills.length;
    const totalAmount = bills.reduce((sum, b) => sum + b.totalAmount, 0);
    const avgBillAmount = totalBills > 0 ? totalAmount / totalBills : 0;
    const totalDiscount = bills.reduce((sum, b) => sum + b.discountAmount, 0);

    const byChannel = {};
    bills.forEach((b) => {
      if (!byChannel[b.channel]) {
        byChannel[b.channel] = { count: 0, amount: 0 };
      }
      byChannel[b.channel].count++;
      byChannel[b.channel].amount += b.totalAmount;
    });

    return {
      period: { startDate, endDate: new Date(), days },
      summary: {
        totalBills,
        totalAmount: parseFloat((totalAmount / 100).toFixed(2)),
        avgBillAmount: parseFloat((avgBillAmount / 100).toFixed(2)),
        totalDiscountAmount: parseFloat((totalDiscount / 100).toFixed(2)),
      },
      byChannel,
    };
  }

  async getInventorySnapshot(organizationId: number) {
    const inventory = await this.prisma.inventory.findMany({
      where: { organizationId },
      include: {
        warehouse: true,
      },
    });

    const summary = {
      totalProducts: new Set(inventory.map((i) => i.productId)).size,
      totalPhysicalStock: 0,
      totalReservedStock: 0,
      totalAvailableStock: 0,
      byWarehouse: {},
    };

    inventory.forEach((item) => {
      summary.totalPhysicalStock += item.physicalOnHand;
      summary.totalReservedStock += item.reserved;
      summary.totalAvailableStock += item.available;

      if (!summary.byWarehouse[item.warehouse.id]) {
        summary.byWarehouse[item.warehouse.id] = {
          warehouseName: item.warehouse.name,
          physical: 0,
          reserved: 0,
          available: 0,
        };
      }

      summary.byWarehouse[item.warehouse.id].physical += item.physicalOnHand;
      summary.byWarehouse[item.warehouse.id].reserved += item.reserved;
      summary.byWarehouse[item.warehouse.id].available += item.available;
    });

    return {
      snapshot: summary,
      items: inventory,
    };
  }
}
