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
        gate_pass_date: {
          gte: startDate,
        },
      },
      include: {
        items: true,
      },
    });

    const confirmed = gatePasses.filter(gp => gp.status === 'CONFIRMED').length;
    const pending = gatePasses.filter(gp => gp.status === 'PENDING').length;
    const rejected = gatePasses.filter(gp => gp.status === 'REJECTED').length;

    const fulfillmentRate = gatePasses.length > 0 ? (confirmed / gatePasses.length) * 100 : 0;

    // Calculate average fulfillment time
    let avgFulfillmentTime = 0;
    const confirmedGPs = gatePasses.filter(gp => gp.confirmed_date && gp.createdAt);
    if (confirmedGPs.length > 0) {
      const totalTime = confirmedGPs.reduce((sum, gp) => {
        return sum + (gp.confirmed_date.getTime() - gp.createdAt.getTime());
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
            gate_pass_date: {
              gte: startDate,
            },
          },
          include: {
            items: true,
          },
        },
        warehouseTransfersFrom: {
          where: {
            transfer_date: {
              gte: startDate,
            },
          },
          include: {
            items: true,
          },
        },
        warehouseTransfersTo: {
          where: {
            transfer_date: {
              gte: startDate,
            },
          },
          include: {
            items: true,
          },
        },
      },
    });

    return warehouses.map(wh => {
      const confirmedGPs = wh.gatePasses.filter(gp => gp.status === 'CONFIRMED').length;
      const fulfillmentRate =
        wh.gatePasses.length > 0 ? (confirmedGPs / wh.gatePasses.length) * 100 : 0;

      const itemsShipped = wh.gatePasses
        .filter(gp => gp.status === 'CONFIRMED')
        .reduce((sum, gp) => sum + gp.items.reduce((s, item) => s + item.picked_quantity, 0), 0);

      const itemsReceived = wh.warehouseTransfersTo.reduce((sum, t) => {
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
        bill_date: {
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
      .flatMap(bill =>
        bill.lines.map(line => ({
          date: bill.bill_date,
          bill_number: bill.bill_number,
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
    movements.forEach(m => {
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
        bill_date: {
          gte: startDate,
        },
      },
      include: {
        lines: true,
        customer: true,
      },
    });

    const totalBills = bills.length;
    const totalAmount = bills.reduce((sum, b) => sum + b.total_amount, 0);
    const avgBillAmount = totalBills > 0 ? totalAmount / totalBills : 0;
    const totalDiscount = bills.reduce((sum, b) => sum + b.discount_amount, 0);

    const byChannel = {};
    bills.forEach(b => {
      if (!byChannel[b.channel]) {
        byChannel[b.channel] = { count: 0, amount: 0 };
      }
      byChannel[b.channel].count++;
      byChannel[b.channel].amount += b.total_amount;
    });

    return {
      period: { startDate, endDate: new Date(), days },
      // Bill.total_amount is stored in whole currency units (whatever the
      // salesman types as unitPrice x quantity, e.g. 100 means 100 rupees,
      // not cents) - these fields previously divided by 100 on the mistaken
      // assumption the column held cents, silently reporting figures 100x
      // too small.
      summary: {
        totalBills,
        total_amount: totalAmount,
        avgBillAmount,
        totalDiscountAmount: totalDiscount,
      },
      byChannel,
    };
  }

  // Count + total amount of bills grouped by status, for the Sales
  // Dashboard's status pie chart.
  async getBillStatusBreakdown(organizationId: number, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bills = await this.prisma.bill.findMany({
      where: { organizationId, bill_date: { gte: startDate } },
      select: { status: true, total_amount: true },
    });

    const byStatus = new Map<string, { count: number; amount: number }>();
    bills.forEach(bill => {
      const current = byStatus.get(bill.status) || { count: 0, amount: 0 };
      current.count++;
      current.amount += bill.total_amount;
      byStatus.set(bill.status, current);
    });

    return {
      period: { startDate, endDate: new Date(), days },
      totalBills: bills.length,
      byStatus: Array.from(byStatus.entries()).map(([status, data]) => ({ status, ...data })),
    };
  }

  // Count of sales orders grouped by status (DRAFT/CONFIRMED/CONVERTED/
  // CANCELLED) - the Sales Dashboard's funnel chart. Sales Orders are
  // optional/secondary to direct invoicing in this business, so this can
  // legitimately be all zeros if nobody uses them.
  async getSalesOrderStatusBreakdown(organizationId: number) {
    const orders = await this.prisma.salesOrder.findMany({
      where: { organizationId },
      select: { status: true },
    });

    const byStatus = new Map<string, number>();
    orders.forEach(o => byStatus.set(o.status, (byStatus.get(o.status) || 0) + 1));

    return {
      totalOrders: orders.length,
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
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
      totalProducts: new Set(inventory.map(i => i.productId)).size,
      totalPhysicalStock: 0,
      totalReservedStock: 0,
      totalAvailableStock: 0,
      byWarehouse: {},
    };

    inventory.forEach(item => {
      summary.totalPhysicalStock += item.physical_on_hand;
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

      summary.byWarehouse[item.warehouse.id].physical += item.physical_on_hand;
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
        bill_date: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        lines: {
          include: { product: true },
        },
      },
      orderBy: { bill_date: 'desc' },
    });

    const totalSales = bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
    const customerCount = new Set(bills.map(b => b.customerId)).size;

    // Group by date for monthly breakdown
    const monthlyData = new Map<string, number>();
    bills.forEach(bill => {
      const monthKey = bill.bill_date.toISOString().slice(0, 7); // YYYY-MM
      const current = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, current + (bill.total_amount || 0));
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
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        vendor: true,
        PurchaseOrderItem: true,
        PurchaseOrderReceipt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPurchases = purchaseOrders.reduce(
      (sum: number, po: any) => sum + (Number(po.po_amount) || 0),
      0,
    );
    const vendorCount = new Set(purchaseOrders.map(po => po.vendorId)).size;

    // Calculate vendor performance scores
    const vendorMetrics = new Map<number, any>();
    purchaseOrders.forEach((po: any) => {
      if (!po.vendorId) return;

      const current = vendorMetrics.get(po.vendorId) || {
        vendorId: po.vendorId,
        vendorName: po.vendor?.name,
        totalOrders: 0,
        completedOrders: 0,
        totalAmount: 0,
      };

      current.totalOrders++;
      current.totalAmount += po.po_amount || 0;
      if (po.status === 'RECEIVED') {
        current.completedOrders++;
      }

      vendorMetrics.set(po.vendorId, current);
    });

    const vendors = Array.from(vendorMetrics.values()).map(v => ({
      ...v,
      performanceScore:
        v.totalOrders > 0 ? ((v.completedOrders / v.totalOrders) * 100).toFixed(2) : 0,
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

  // Count + total po_amount grouped by status - the Purchasing Dashboard's
  // status pie chart.
  async getPurchaseOrderStatusBreakdown(organizationId: number, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pos = await this.prisma.purchaseOrder.findMany({
      where: { organizationId, createdAt: { gte: startDate } },
      select: { status: true, po_amount: true },
    });

    const byStatus = new Map<string, { count: number; amount: number }>();
    pos.forEach(po => {
      const current = byStatus.get(po.status) || { count: 0, amount: 0 };
      current.count++;
      current.amount += po.po_amount;
      byStatus.set(po.status, current);
    });

    return {
      period: { startDate, endDate: new Date(), days },
      totalPOs: pos.length,
      byStatus: Array.from(byStatus.entries()).map(([status, data]) => ({ status, ...data })),
    };
  }

  async getInventoryReport(organizationId: number) {
    const inventories = await this.prisma.inventory.findMany({
      where: { organizationId },
      include: {
        warehouse: true,
        Product: { select: { cost_price: true } },
      },
    });

    let totalValue = 0;
    const lowStockCount = 0;
    const stockLevels: any[] = [];

    inventories.forEach(inv => {
      // Value = on-hand quantity (available + reserved is still physically
      // in the warehouse) x unit cost - previously this summed raw
      // quantity with no cost multiplication at all, so "totalInventoryValue"
      // was actually just a unit count mislabeled as money.
      const quantity = inv.available + inv.reserved;
      // cost_price is a Prisma Decimal object - `number * Decimal` is NaN.
      const value = quantity * Number(inv.Product?.cost_price ?? 0);
      totalValue += value;

      stockLevels.push({
        productId: inv.productId,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse?.name,
        quantity,
        value,
      });
    });

    return {
      timestamp: new Date(),
      totalInventoryValue: totalValue,
      numberOfProducts: new Set(inventories.map(i => i.productId)).size,
      numberOfWarehouses: new Set(inventories.map(i => i.warehouseId)).size,
      lowStockAlerts: lowStockCount,
      stockLevels: stockLevels.sort((a, b) => b.quantity - a.quantity).slice(0, 50),
    };
  }

  async getCustomerReport(organizationId: number, startDate: Date, endDate: Date) {
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        bill_date: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        lines: true,
      },
      orderBy: { bill_date: 'desc' },
    });

    // Group by customer
    const customerMap = new Map<number, any>();
    bills.forEach(bill => {
      if (!bill.customerId) return;

      const current = customerMap.get(bill.customerId) || {
        customerId: bill.customerId,
        customerName: bill.customer?.name,
        totalSales: 0,
        numberOfOrders: 0,
      };

      current.numberOfOrders++;
      current.totalSales += bill.total_amount || 0;

      customerMap.set(bill.customerId, current);
    });

    const customers = Array.from(customerMap.values());
    const totalSales = customers.reduce((sum, c) => sum + c.totalSales, 0);

    return {
      period: { startDate, endDate },
      totalSales: totalSales,
      numberOfCustomers: customers.length,
      repeatCustomers: customers.filter(c => c.numberOfOrders > 1).length,
      averageCustomerValue: customers.length > 0 ? totalSales / customers.length : 0,
      topCustomers: customers
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 10)
        .map(c => ({
          ...c,
          marketShare: ((c.totalSales / totalSales) * 100).toFixed(2),
        })),
    };
  }

  private getTopCustomers(bills: any[], limit: number) {
    const customerMap = new Map<number, any>();

    bills.forEach(bill => {
      if (!bill.customerId) return;
      const current = customerMap.get(bill.customerId) || {
        customerId: bill.customerId,
        customerName: bill.customer?.name,
        totalSales: 0,
      };
      current.totalSales += bill.total_amount || 0;
      customerMap.set(bill.customerId, current);
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit);
  }

  // Real sales activity per salesman, independent of whether a commission
  // calculation has been run for the period (CommissionCalculation only
  // exists once someone triggers /commission/calculate - this reads
  // straight from Bill so performance shows up immediately after a sale).
  async getSalesmanPerformanceReport(organizationId: number, startDate: Date, endDate: Date) {
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        bill_date: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        salesman: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const bySalesman = new Map<number, any>();
    bills.forEach(bill => {
      const key = bill.salesmanId;
      const current = bySalesman.get(key) || {
        salesmanId: key,
        salesmanName: bill.salesman ? `${bill.salesman.firstName} ${bill.salesman.lastName}` : `#${key}`,
        totalSales: 0,
        billCount: 0,
      };
      current.totalSales += bill.total_amount;
      current.billCount++;
      bySalesman.set(key, current);
    });

    const bySalesmanArray = Array.from(bySalesman.values()).map(s => ({
      ...s,
      avgBillAmount: s.billCount > 0 ? s.totalSales / s.billCount : 0,
    }));

    return {
      period: { startDate, endDate },
      totalSales: bills.reduce((sum, b) => sum + b.total_amount, 0),
      totalBills: bills.length,
      bySalesman: bySalesmanArray.sort((a, b) => b.totalSales - a.totalSales),
    };
  }

  async getCommissionReport(organizationId: number, startDate: Date, endDate: Date) {
    const commissions = await this.prisma.commissionCalculation.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        salesperson: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCommission = commissions.reduce(
      (sum, c) => sum + (Number(c.commissionAmount) || 0),
      0,
    );
    const salesmanMetrics = new Map<number, any>();

    commissions.forEach(c => {
      if (!c.salesPersonId) return;
      const current = salesmanMetrics.get(c.salesPersonId) || {
        employeeId: c.salesPersonId,
        employeeName: c.salesperson?.firstName,
        totalCommission: 0,
        commissionsEarned: 0,
      };
      current.totalCommission += Number(c.commissionAmount) || 0;
      current.commissionsEarned++;
      salesmanMetrics.set(c.salesPersonId, current);
    });

    return {
      period: { startDate, endDate },
      // commissionAmount = baseSales x rate, and baseSales is itself whole
      // currency units (see getBillAnalytics) - no cents conversion needed.
      totalCommission,
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
        transfer_date: { gte: startDate },
      },
      include: {
        items: true,
        from_warehouse: true,
        to_warehouse: true,
      },
    });

    const completed = transfers.filter(t => t.status === 'RECEIVED').length;
    const pending = transfers.filter(t => t.status === 'PENDING').length;
    const inTransit = transfers.filter(t => t.status === 'IN_TRANSIT').length;
    const rejected = transfers.filter(t => t.status === 'REJECTED').length;

    const totalItems = transfers.reduce(
      (sum, t) => sum + t.items.reduce((s, item) => s + item.quantity, 0),
      0,
    );
    const completionRate = transfers.length > 0 ? (completed / transfers.length) * 100 : 0;

    // Calculate average transfer time (using createdAt to transfer_date as proxy)
    let avgTransferTime = 0;
    const completedTransfers = transfers.filter(t => t.status === 'RECEIVED' && t.transfer_date);
    if (completedTransfers.length > 0) {
      const totalTime = completedTransfers.reduce((sum, t) => {
        return sum + (t.createdAt.getTime() - t.transfer_date.getTime());
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
        bill_date: { gte: startDate, lte: endDate },
      },
      include: {
        lines: {
          include: { product: true },
        },
      },
    });

    const productMetrics = new Map<number, any>();

    bills.forEach(bill => {
      bill.lines.forEach(line => {
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
        current.totalRevenue += line.line_total;
        current.numberOfTransactions++;
        productMetrics.set(line.productId, current);
      });
    });

    const products = Array.from(productMetrics.values())
      .map(p => ({
        ...p,
        avgQuantityPerTransaction: parseFloat(
          (p.totalQuantity / p.numberOfTransactions).toFixed(2),
        ),
        // line_total (source of totalRevenue) is whole currency units, not
        // cents - see getBillAnalytics.
        avgRevenuePerTransaction: parseFloat(
          (p.totalRevenue / p.numberOfTransactions).toFixed(2),
        ),
        totalRevenue: p.totalRevenue,
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
        bill_date: { gte: startDate },
      },
      orderBy: { bill_date: 'asc' },
    });

    const dailyData = new Map<string, any>();

    bills.forEach(bill => {
      const dateKey = bill.bill_date.toISOString().split('T')[0]; // YYYY-MM-DD
      const current = dailyData.get(dateKey) || {
        date: dateKey,
        sales: 0,
        billCount: 0,
      };
      current.sales += bill.total_amount || 0;
      current.billCount++;
      dailyData.set(dateKey, current);
    });

    // bill.total_amount is whole currency units, not cents - see getBillAnalytics.
    const trend = Array.from(dailyData.values()).map(d => ({
      ...d,
      sales: d.sales,
      avgBillValue: parseFloat((d.sales / d.billCount).toFixed(2)),
    }));

    return {
      period: { startDate, endDate: new Date(), days },
      dailyTrend: trend,
    };
  }

  // 12-month sales total per year, for the last N years - the default
  // landing dashboard's "this year vs last 2 years" comparison chart.
  async getYearlyMonthlyComparison(organizationId: number, years = 3) {
    const currentYear = new Date().getFullYear();
    const earliestYear = currentYear - (years - 1);
    const rangeStart = new Date(earliestYear, 0, 1);

    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        bill_date: { gte: rangeStart },
        status: { not: 'CANCELLED' },
      },
      select: { bill_date: true, total_amount: true },
    });

    const totalsByYearMonth = new Map<string, number>();
    bills.forEach(bill => {
      const year = bill.bill_date.getFullYear();
      const month = bill.bill_date.getMonth();
      const key = `${year}-${month}`;
      totalsByYearMonth.set(key, (totalsByYearMonth.get(key) || 0) + bill.total_amount);
    });

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearList: number[] = [];
    for (let y = earliestYear; y <= currentYear; y++) yearList.push(y);

    const rows = monthLabels.map((label, monthIndex) => {
      const row: any = { month: label };
      yearList.forEach(year => {
        row[String(year)] = totalsByYearMonth.get(`${year}-${monthIndex}`) || 0;
      });
      return row;
    });

    return { years: yearList, rows };
  }

  // Today's collected sales, broken down by how the customer paid - the
  // default landing dashboard's "live cash collection" pie chart.
  async getTodayCashCollection(organizationId: number) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        bill_date: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
      select: { total_amount: true, payment_method: true },
    });

    const byMethod = new Map<string, number>();
    bills.forEach(bill => {
      const method = bill.payment_method || 'UNSPECIFIED';
      byMethod.set(method, (byMethod.get(method) || 0) + bill.total_amount);
    });

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalCollected: bills.reduce((sum, b) => sum + b.total_amount, 0),
      billCount: bills.length,
      byMethod: Array.from(byMethod.entries()).map(([method, amount]) => ({ method, amount })),
    };
  }

  // Expense breakdown by account category (OPERATING_EXPENSE,
  // NON_OPERATING_EXPENSE, TAX_EXPENSE, COGS) for a period - reads posted
  // GL activity, the same source of truth the Income Statement uses, but
  // shaped for a simple pie/bar rather than a full statement.
  async getExpenseBreakdown(organizationId: number, from: Date, to: Date) {
    const expenseAccounts = await this.prisma.chartOfAccount.findMany({
      where: { organizationId, isActive: true, accountType: 'EXPENSE' },
    });

    const postings = await this.prisma.gLPosting.findMany({
      where: {
        organizationId,
        accountId: { in: expenseAccounts.map(a => a.id) },
        postingDate: { gte: from, lte: to },
      },
      select: { accountId: true, debitAmount: true, creditAmount: true },
    });

    const accountById = new Map(expenseAccounts.map(a => [a.id, a]));
    const byCategory = new Map<string, number>();
    const byAccount = new Map<number, { accountName: string; accountCode: string; amount: number }>();

    postings.forEach(p => {
      const account = accountById.get(p.accountId);
      if (!account) return;
      // Expense accounts increase with debits - net debit is the real spend.
      const amount = p.debitAmount - p.creditAmount;
      const category = account.accountCategory || 'UNCATEGORIZED';
      byCategory.set(category, (byCategory.get(category) || 0) + amount);

      const existing = byAccount.get(account.id) || { accountName: account.accountName, accountCode: account.accountCode, amount: 0 };
      existing.amount += amount;
      byAccount.set(account.id, existing);
    });

    const totalExpense = Array.from(byCategory.values()).reduce((sum, v) => sum + v, 0);

    return {
      period: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] },
      totalExpense,
      byCategory: Array.from(byCategory.entries()).map(([category, amount]) => ({ category, amount })),
      byAccount: Array.from(byAccount.values()).sort((a, b) => b.amount - a.amount),
    };
  }

  // Monthly expense totals for the last N months - the expense trend line.
  async getExpenseTrend(organizationId: number, months = 6) {
    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - (months - 1));
    rangeStart.setDate(1);
    rangeStart.setHours(0, 0, 0, 0);

    const expenseAccounts = await this.prisma.chartOfAccount.findMany({
      where: { organizationId, isActive: true, accountType: 'EXPENSE' },
      select: { id: true },
    });

    const postings = await this.prisma.gLPosting.findMany({
      where: {
        organizationId,
        accountId: { in: expenseAccounts.map(a => a.id) },
        postingDate: { gte: rangeStart },
      },
      select: { postingDate: true, debitAmount: true, creditAmount: true },
    });

    const byMonth = new Map<string, number>();
    postings.forEach(p => {
      const key = `${p.postingDate.getFullYear()}-${String(p.postingDate.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) || 0) + (p.debitAmount - p.creditAmount));
    });

    const trend: { month: string; amount: number }[] = [];
    const cursor = new Date(rangeStart);
    for (let i = 0; i < months; i++) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      trend.push({ month: key, amount: byMonth.get(key) || 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { months: trend };
  }

  async getGateFulfillmentByCustomer(organizationId: number, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const gatePasses = await this.prisma.gatePass.findMany({
      where: {
        organizationId,
        gate_pass_date: { gte: startDate },
      },
      include: {
        bill: {
          include: { customer: true },
        },
      },
    });

    const customerMetrics = new Map<number, any>();

    gatePasses.forEach(gp => {
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
        .map(c => ({
          ...c,
          fulfillmentRate: parseFloat(
            ((c.confirmedGatePasses / c.totalGatePasses) * 100).toFixed(2),
          ),
        }))
        .sort((a, b) => b.fulfillmentRate - a.fulfillmentRate),
    };
  }
}
