import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { RealtimeGateway } from '../gateway/realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Get current KPIs for organization
   */
  async getCurrentKPIs(organizationId: number) {
    try {
      // Get bills
      const bills = await this.prisma.bill.findMany({
        where: { organizationId },
        select: { id: true, bill_number: true, total_amount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Get purchase orders
      const purchaseOrders = await this.prisma.purchaseOrder.findMany({
        where: { organizationId },
        select: { id: true, po_number: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Calculate KPIs
      const totalSales = bills.reduce((sum, bill) => sum + Number(bill.total_amount || 0), 0);
      const totalOrders = bills.length;
      const pendingOrders = 0;
      const totalPOs = purchaseOrders.length;
      const totalPurchase = 0;

      // Get low stock items
      const lowStockCount = await this.prisma.inventory.count({
        where: {
          organizationId,
          available: {
            lt: 10, // Threshold
          },
        },
      });

      return {
        timestamp: new Date(),
        totalSales,
        totalOrders,
        pendingOrders,
        totalPOs,
        totalPurchase,
        lowStock: lowStockCount,
        recentBills: bills.slice(0, 5).map(b => ({
          id: b.id,
          billNumber: b.bill_number,
          amount: b.total_amount,
          status: b.status,
          createdAt: b.createdAt,
        })),
        recentPOs: purchaseOrders.slice(0, 5).map(po => ({
          id: po.id,
          poNumber: po.po_number,
          status: po.status,
          createdAt: po.createdAt,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get KPIs: ${error.message}`);
      return null;
    }
  }

  /**
   * Stream KPI updates at regular intervals
   */
  async streamKPIUpdates(organizationId: number, interval: number = 30000) {
    try {
      setInterval(async () => {
        const kpis = await this.getCurrentKPIs(organizationId);
        if (kpis) {
          this.realtimeGateway.broadcastKPIUpdate(organizationId, kpis);
        }
      }, interval);

      this.logger.log(`KPI streaming started for org ${organizationId} (${interval}ms interval)`);
    } catch (error) {
      this.logger.error(`Failed to start KPI streaming: ${error.message}`);
    }
  }

  /**
   * Notify all clients about bill creation
   */
  async notifyBillCreated(organizationId: number, billId: number) {
    try {
      const bill = await this.prisma.bill.findUnique({
        where: { id: billId },
        select: { id: true, bill_number: true, total_amount: true, status: true, createdAt: true },
      });

      if (bill) {
        this.realtimeGateway.notifyBillCreated(organizationId, {
          id: bill.id,
          billNumber: bill.bill_number,
          amount: bill.total_amount,
          status: bill.status,
          createdAt: bill.createdAt,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify bill created: ${error.message}`);
    }
  }

  /**
   * Notify all clients about bill status change
   */
  async notifyBillStatusChanged(
    organizationId: number,
    billId: number,
    oldStatus: string,
    newStatus: string,
    changedBy: number,
  ) {
    try {
      this.realtimeGateway.notifyBillStatusChanged(
        organizationId,
        billId,
        oldStatus,
        newStatus,
        changedBy,
        new Date(),
      );
    } catch (error) {
      this.logger.error(`Failed to notify bill status change: ${error.message}`);
    }
  }

  /**
   * Notify all clients about PO creation
   */
  async notifyPOCreated(organizationId: number, poId: number) {
    try {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: poId },
        select: { id: true, po_number: true, status: true, createdAt: true },
      });

      if (po) {
        this.realtimeGateway.notifyPOCreated(organizationId, {
          id: po.id,
          poNumber: po.po_number,
          status: po.status,
          createdAt: po.createdAt,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify PO created: ${error.message}`);
    }
  }

  /**
   * Notify all clients about PO status change
   */
  async notifyPOStatusChanged(
    organizationId: number,
    poId: number,
    oldStatus: string,
    newStatus: string,
    changedBy: number,
  ) {
    try {
      this.realtimeGateway.notifyPOStatusChanged(
        organizationId,
        poId,
        oldStatus,
        newStatus,
        changedBy,
        new Date(),
      );
    } catch (error) {
      this.logger.error(`Failed to notify PO status change: ${error.message}`);
    }
  }

  /**
   * Notify low inventory
   */
  async notifyLowInventory(organizationId: number, productId: number, currentStock: number) {
    try {
      this.realtimeGateway.notifyLowInventory(organizationId, productId, currentStock);
    } catch (error) {
      this.logger.error(`Failed to notify low inventory: ${error.message}`);
    }
  }

  /**
   * Notify payment received
   */
  async notifyPaymentReceived(
    organizationId: number,
    billId: number,
    amount: number,
    paymentMethod: string,
  ) {
    try {
      this.realtimeGateway.notifyPaymentReceived(
        organizationId,
        billId,
        amount,
        paymentMethod,
        new Date(),
      );
    } catch (error) {
      this.logger.error(`Failed to notify payment received: ${error.message}`);
    }
  }

  /**
   * Get active user count for organization
   */
  getActiveUserCount(organizationId: number): number {
    return this.realtimeGateway.getActiveConnections(organizationId);
  }
}
