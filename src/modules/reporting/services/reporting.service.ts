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

  async getSalesReport(organizationId: number, startDate: Date, endDate: Date) {
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        billDate: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        lines: {
          include: { product: true },
        },
      },
      orderBy: { billDate: 'desc' },
    });

    const totalSales = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    const customerCount = new Set(bills.map((b) => b.customerId)).size;

    // Group by date for monthly breakdown
    const monthlyData = new Map<string, number>();
    bills.forEach((bill) => {
      const monthKey = bill.billDate.toISOString().slice(0, 7); // YYYY-MM
      const current = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, current + (bill.totalAmount || 0));
    });

    return {
      period: { startDate, endDate },
      totalSales: totalSales,
      numberOfBills: bills.length,
      numberOfCustomers: customerCount,
      averageBillValue: bills.length > 0 ? totalSales / bills.length : 0,
      monthlyBreakdown: Object.fromEntries(monthlyData),
      topCustomers: this.getTopCustomers(bills, 5),
    };
  }

  async getVendorReport(organizationId: number, startDate: Date, endDate: Date) {
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        poDate: { gte: startDate, lte: endDate },
      },
      include: {
        vendor: true,
        items: true,
        PurchaseOrderReceipt: true,
      },
      orderBy: { poDate: 'desc' },
    });

    const totalPurchases = purchaseOrders.reduce((sum: number, po: any) => sum + (Number(po.totalAmount) || 0), 0);
    const vendorCount = new Set(purchaseOrders.map((po) => po.vendorId)).size;

    // Calculate vendor performance scores
    const vendorMetrics = new Map<number, any>();
    purchaseOrders.forEach((po) => {
      if (!po.vendorId) return;

      const current = vendorMetrics.get(po.vendorId) || {
        vendorId: po.vendorId,
        vendorName: po.vendor?.name,
        totalOrders: 0,
        completedOrders: 0,
        totalAmount: 0,
      };

      current.totalOrders++;
      current.totalAmount += po.totalAmount || 0;
      if (po.status === 'RECEIVED') {
        current.completedOrders++;
      }

      vendorMetrics.set(po.vendorId, current);
    });

    const vendors = Array.from(vendorMetrics.values()).map((v) => ({
      ...v,
      performanceScore: v.totalOrders > 0 ? ((v.completedOrders / v.totalOrders) * 100).toFixed(2) : 0,
    }));

    return {
      period: { startDate, endDate },
      totalPurchases: totalPurchases,
      numberOfPOs: purchaseOrders.length,
      numberOfVendors: vendorCount,
      averagePOValue: purchaseOrders.length > 0 ? totalPurchases / purchaseOrders.length : 0,
      vendorPerformance: vendors.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 10),
    };
  }

  async getInventoryReport(organizationId: number) {
    const inventories = await this.prisma.inventory.findMany({
      where: { organizationId },
      include: {
        warehouse: true,
      },
    });

    let totalValue = 0;
    let lowStockCount = 0;
    const stockLevels: any[] = [];

    inventories.forEach((inv) => {
      const value = (inv.available + inv.reserved);
      totalValue += value;

      stockLevels.push({
        productId: inv.productId,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse?.name,
        quantity: inv.available + inv.reserved,
      });
    });

    return {
      timestamp: new Date(),
      totalInventoryValue: totalValue,
      numberOfProducts: new Set(inventories.map((i) => i.productId)).size,
      numberOfWarehouses: new Set(inventories.map((i) => i.warehouseId)).size,
      lowStockAlerts: lowStockCount,
      stockLevels: stockLevels.sort((a, b) => b.quantity - a.quantity).slice(0, 50),
    };
  }

  async getCustomerReport(organizationId: number, startDate: Date, endDate: Date) {
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        billDate: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        lines: true,
      },
      orderBy: { billDate: 'desc' },
    });

    // Group by customer
    const customerMap = new Map<number, any>();
    bills.forEach((bill) => {
      if (!bill.customerId) return;

      const current = customerMap.get(bill.customerId) || {
        customerId: bill.customerId,
        customerName: bill.customer?.name,
        totalSales: 0,
        numberOfOrders: 0,
      };

      current.numberOfOrders++;
      current.totalSales += bill.totalAmount || 0;

      customerMap.set(bill.customerId, current);
    });

    const customers = Array.from(customerMap.values());
    const totalSales = customers.reduce((sum, c) => sum + c.totalSales, 0);

    return {
      period: { startDate, endDate },
      totalSales: totalSales,
      numberOfCustomers: customers.length,
      repeatCustomers: customers.filter((c) => c.numberOfOrders > 1).length,
      averageCustomerValue: customers.length > 0 ? totalSales / customers.length : 0,
      topCustomers: customers
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 10)
        .map((c) => ({
          ...c,
          marketShare: ((c.totalSales / totalSales) * 100).toFixed(2),
        })),
    };
  }

  private getTopCustomers(bills: any[], limit: number) {
    const customerMap = new Map<number, any>();

    bills.forEach((bill) => {
      if (!bill.customerId) return;
      const current = customerMap.get(bill.customerId) || {
        customerId: bill.customerId,
        customerName: bill.customer?.name,
        totalSales: 0,
      };
      current.totalSales += bill.totalAmount || 0;
      customerMap.set(bill.customerId, current);
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit);
  }

  async getCommissionReport(organizationId: number, startDate: Date, endDate: Date) {
    const commissions = await this.prisma.commissionCalculation.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        employee: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCommission = commissions.reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);
    const salesmanMetrics = new Map<number, any>();

    commissions.forEach((c) => {
      if (!c.employeeId) return;
      const current = salesmanMetrics.get(c.employeeId) || {
        employeeId: c.employeeId,
        employeeName: c.employee?.firstName,
        totalCommission: 0,
        commissionsEarned: 0,
      };
      current.totalCommission += Number(c.commissionAmount) || 0;
      current.commissionsEarned++;
      salesmanMetrics.set(c.employeeId, current);
    });

    return {
      period: { startDate, endDate },
      totalCommission: parseFloat((totalCommission / 100).toFixed(2)),
      numberOfCommissions: commissions.length,
      topSalesmen: Array.from(salesmanMetrics.values())
        .sort((a, b) => b.totalCommission - a.totalCommission)
        .slice(0, 10),
    };
  }

  async getWarehouseTransferAnalytics(organizationId: number, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transfers = await this.prisma.warehouseTransfer.findMany({
      where: {
        organizationId,
        transferDate: { gte: startDate },
      },
      include: {
        items: true,
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    const completed = transfers.filter((t) => t.status === 'RECEIVED').length;
    const pending = transfers.filter((t) => t.status === 'PENDING').length;
    const inTransit = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
    const rejected = transfers.filter((t) => t.status === 'REJECTED').length;

    const totalItems = transfers.reduce((sum, t) => sum + t.quantity, 0);
    const completionRate = transfers.length > 0 ? (completed / transfers.length) * 100 : 0;

    // Calculate average transfer time (using createdAt to transferDate as proxy)
    let avgTransferTime = 0;
    const completedTransfers = transfers.filter((t) => t.status === 'RECEIVED' && t.transferDate);
    if (completedTransfers.length > 0) {
      const totalTime = completedTransfers.reduce((sum, t) => {
        return sum + (t.createdAt.getTime() - t.transferDate.getTime());
      }, 0);
      avgTransferTime = totalTime / completedTransfers.length / (1000 * 60 * 60); // hours
    }

    return {
      period: { startDate, endDate: new Date(), days },
      summary: {
        totalTransfers: transfers.length,
        completed,
        pending,
        inTransit,
        rejected,
        totalItems,
        completionRate: parseFloat(completionRate.toFixed(2)),
        avgTransferTimeHours: parseFloat(avgTransferTime.toFixed(2)),
      },
      byStatus: {
        RECEIVED: completed,
        PENDING: pending,
        IN_TRANSIT: inTransit,
        REJECTED: rejected,
      },
    };
  }

  async getProductPerformance(organizationId: number, startDate: Date, endDate: Date) {
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        billDate: { gte: startDate, lte: endDate },
      },
      include: {
        lines: {
          include: { product: true },
        },
      },
    });

    const productMetrics = new Map<number, any>();

    bills.forEach((bill) => {
      bill.lines.forEach((line) => {
        if (!line.productId) return;
        const current = productMetrics.get(line.productId) || {
          productId: line.productId,
          productName: line.product.name,
          productCode: line.product.code,
          totalQuantity: 0,
          totalRevenue: 0,
          numberOfTransactions: 0,
        };
        current.totalQuantity += line.quantity;
        current.totalRevenue += line.lineTotal;
        current.numberOfTransactions++;
        productMetrics.set(line.productId, current);
      });
    });

    const products = Array.from(productMetrics.values())
      .map((p) => ({
        ...p,
        avgQuantityPerTransaction: parseFloat((p.totalQuantity / p.numberOfTransactions).toFixed(2)),
        avgRevenuePerTransaction: parseFloat((p.totalRevenue / p.numberOfTransactions / 100).toFixed(2)),
        totalRevenue: parseFloat((p.totalRevenue / 100).toFixed(2)),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      period: { startDate, endDate },
      totalProducts: products.length,
      topProducts: products.slice(0, 20),
    };
  }

  async getDailySalesTrend(organizationId: number, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        billDate: { gte: startDate },
      },
      orderBy: { billDate: 'asc' },
    });

    const dailyData = new Map<string, any>();

    bills.forEach((bill) => {
      const dateKey = bill.billDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const current = dailyData.get(dateKey) || {
        date: dateKey,
        sales: 0,
        billCount: 0,
      };
      current.sales += bill.totalAmount || 0;
      current.billCount++;
      dailyData.set(dateKey, current);
    });

    const trend = Array.from(dailyData.values())
      .map((d) => ({
        ...d,
        sales: parseFloat((d.sales / 100).toFixed(2)),
        avgBillValue: parseFloat((d.sales / d.billCount / 100).toFixed(2)),
      }));

    return {
      period: { startDate, endDate: new Date(), days },
      dailyTrend: trend,
    };
  }

  async getGateFulfillmentByCustomer(organizationId: number, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const gatePasses = await this.prisma.gatePass.findMany({
      where: {
        organizationId,
        gatePassDate: { gte: startDate },
      },
      include: {
        bill: {
          include: { customer: true },
        },
      },
    });

    const customerMetrics = new Map<number, any>();

    gatePasses.forEach((gp) => {
      if (!gp.bill?.customerId) return;
      const current = customerMetrics.get(gp.bill.customerId) || {
        customerId: gp.bill.customerId,
        customerName: gp.bill.customer?.name,
        totalGatePasses: 0,
        confirmedGatePasses: 0,
      };
      current.totalGatePasses++;
      if (gp.status === 'CONFIRMED') {
        current.confirmedGatePasses++;
      }
      customerMetrics.set(gp.bill.customerId, current);
    });

    return {
      period: { startDate, endDate: new Date(), days },
      summary: Array.from(customerMetrics.values())
        .map((c) => ({
          ...c,
          fulfillmentRate: parseFloat(((c.confirmedGatePasses / c.totalGatePasses) * 100).toFixed(2)),
        }))
        .sort((a, b) => b.fulfillmentRate - a.fulfillmentRate),
    };
  }
}
