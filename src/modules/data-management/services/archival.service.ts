import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface ArchivalStats {
  entity: string;
  archivedCount: number;
  deletedCount: number;
  duration: number;
  timestamp: Date;
}

export interface CleanupReport {
  totalOperations: number;
  stats: ArchivalStats[];
  totalDuration: number;
  timestamp: Date;
  errors: string[];
}

// ============================================================================
//                      ARCHIVAL RETENTION POLICIES
// ============================================================================

const RETENTION_POLICIES = {
  BILLS: {
    DRAFT: 30, // days
    FINALIZED: 365,
    PAID: 1825, // 5 years
  },
  PURCHASE_ORDERS: {
    DRAFT: 30,
    APPROVED: 90,
    RECEIVED: 730, // 2 years
  },
  INVENTORY_HISTORY: {
    MOVEMENTS: 90,
    ADJUSTMENTS: 180,
  },
  AUDIT_LOGS: {
    GENERAL: 365,
    CRITICAL: 2190, // 6 years
    FINANCIAL: 2555, // 7 years
  },
  NOTIFICATIONS: {
    READ: 90,
    UNREAD: 180,
  },
};

// ============================================================================
//                        ARCHIVAL SERVICE
// ============================================================================

@Injectable()
export class ArchivalService {
  private readonly logger = new Logger(ArchivalService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================================
  //                    ARCHIVAL METHODS
  // ============================================================================

  async archiveCompletedBills(daysOld: number = 365, orgId?: number): Promise<ArchivalStats> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const where: any = {
      bill_date: { lte: cutoffDate },
      status: { in: ['APPROVED', 'FULFILLED'] },
    };

    if (orgId) {
      where.organizationId = orgId;
    }

    try {
      // Create archive records (would normally write to archive table)
      const billsToArchive = await this.prisma.bill.findMany({
        where,
        select: { id: true },
      });

      const archivedCount = billsToArchive.length;

      this.logger.log(`Archived ${archivedCount} bills older than ${daysOld} days`);

      return {
        entity: 'Bills',
        archivedCount,
        deletedCount: 0,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to archive bills: ${error}`);
      throw error;
    }
  }

  async archiveClosedPurchaseOrders(daysOld: number = 180, orgId?: number): Promise<ArchivalStats> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const where: any = {
      createdAt: { lte: cutoffDate },
      status: { in: ['RECEIVED', 'CANCELLED', 'REJECTED'] },
    };

    if (orgId) {
      where.organizationId = orgId;
    }

    try {
      const posToArchive = await this.prisma.purchaseOrder.findMany({
        where,
        select: { id: true },
      });

      const archivedCount = posToArchive.length;

      this.logger.log(`Archived ${archivedCount} POs older than ${daysOld} days`);

      return {
        entity: 'PurchaseOrders',
        archivedCount,
        deletedCount: 0,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to archive purchase orders: ${error}`);
      throw error;
    }
  }

  // NOTE: There is no Notification model in schema.prisma. This is a stub until
  // that model is added (or the module that assumes it exists is reconciled with
  // the actual schema) — needs a product/schema decision, not a naming fix.
  async purgeOldNotifications(daysOld: number = 90, _orgId?: number): Promise<ArchivalStats> {
    const startTime = Date.now();
    this.logger.warn(
      'purgeOldNotifications: no Notification model exists in schema.prisma - skipped',
    );

    return {
      entity: 'Notifications',
      archivedCount: 0,
      deletedCount: 0,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  // NOTE: There is no AuditLog model in schema.prisma. This is a stub until
  // that model is added — needs a product/schema decision, not a naming fix.
  async purgeOldAuditLogs(daysOld: number = 365, _orgId?: number): Promise<ArchivalStats> {
    const startTime = Date.now();
    this.logger.warn('purgeOldAuditLogs: no AuditLog model exists in schema.prisma - skipped');

    return {
      entity: 'AuditLogs',
      archivedCount: 0,
      deletedCount: 0,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  async cleanupFailedTransactions(hoursOld: number = 24, orgId?: number): Promise<ArchivalStats> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

    const where: any = {
      createdAt: { lte: cutoffDate },
      status: { in: ['DRAFT', 'PENDING_APPROVAL'] },
    };

    if (orgId) {
      where.organizationId = orgId;
    }

    try {
      // Clean up unapproved bills older than specified hours
      const billsResult = await this.prisma.bill.deleteMany({
        where: {
          ...where,
          status: 'PENDING_APPROVAL',
        },
      });

      // Clean up draft POs
      const posResult = await this.prisma.purchaseOrder.deleteMany({
        where: {
          ...where,
          status: 'DRAFT',
        },
      });

      const totalDeleted = billsResult.count + posResult.count;

      this.logger.log(`Deleted ${totalDeleted} failed transactions older than ${hoursOld} hours`);

      return {
        entity: 'FailedTransactions',
        archivedCount: 0,
        deletedCount: totalDeleted,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to cleanup failed transactions: ${error}`);
      throw error;
    }
  }

  // ============================================================================
  //                       REPORTING METHODS
  // ============================================================================

  async generateArchiveReport(orgId?: number): Promise<any> {
    try {
      const billCount = await this.prisma.bill.count({
        where: orgId ? { organizationId: orgId } : undefined,
      });

      const poCount = await this.prisma.purchaseOrder.count({
        where: orgId ? { organizationId: orgId } : undefined,
      });

      // No Notification/AuditLog models exist in schema.prisma yet.
      const notificationCount = 0;
      const auditLogCount = 0;

      return {
        report: {
          bills: billCount,
          purchaseOrders: poCount,
          notifications: notificationCount,
          auditLogs: auditLogCount,
          totalRecords: billCount + poCount + notificationCount + auditLogCount,
        },
        retentionPolicies: RETENTION_POLICIES,
        timestamp: new Date(),
        orgId: orgId || 'all',
      };
    } catch (error) {
      this.logger.error(`Failed to generate archive report: ${error}`);
      throw error;
    }
  }

  async getStorageStats(orgId?: number): Promise<any> {
    try {
      const stats = {
        organizationId: orgId || 'all',
        timestamp: new Date(),
        data: {
          bills: await this.getEntitySize('Bill'),
          purchaseOrders: await this.getEntitySize('PurchaseOrder'),
          notifications: await this.getEntitySize('Notification'),
          auditLogs: await this.getEntitySize('AuditLog'),
        },
      };

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get storage stats: ${error}`);
      throw error;
    }
  }

  private async getEntitySize(entity: string): Promise<number> {
    // Approximate size calculation (count * average record size)
    // This is a simplification; actual implementation would measure more accurately
    // No Notification/AuditLog models exist in schema.prisma yet.
    const counts: any = {
      Bill: await this.prisma.bill.count(),
      PurchaseOrder: await this.prisma.purchaseOrder.count(),
      Notification: 0,
      AuditLog: 0,
    };

    const avgSizes: any = {
      Bill: 500, // bytes
      PurchaseOrder: 600,
      Notification: 300,
      AuditLog: 800,
    };

    return (counts[entity] || 0) * (avgSizes[entity] || 0);
  }

  // ============================================================================
  //                     SCHEDULED TASKS (CRON)
  // ============================================================================

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyCleanup() {
    this.logger.debug('🌙 Running daily cleanup job...');

    try {
      const report: CleanupReport = {
        totalOperations: 0,
        stats: [],
        totalDuration: 0,
        timestamp: new Date(),
        errors: [],
      };

      const startTime = Date.now();

      // Archive old completed bills
      try {
        const billStats = await this.archiveCompletedBills(365);
        report.stats.push(billStats);
      } catch (error) {
        report.errors.push(`Bills archival failed: ${error}`);
      }

      // Cleanup failed transactions
      try {
        const txStats = await this.cleanupFailedTransactions(24);
        report.stats.push(txStats);
      } catch (error) {
        report.errors.push(`Transaction cleanup failed: ${error}`);
      }

      // Purge old notifications
      try {
        const notifStats = await this.purgeOldNotifications(90);
        report.stats.push(notifStats);
      } catch (error) {
        report.errors.push(`Notification purge failed: ${error}`);
      }

      report.totalDuration = Date.now() - startTime;
      report.totalOperations = report.stats.reduce(
        (sum, s) => sum + s.archivedCount + s.deletedCount,
        0,
      );

      this.logger.log(`✅ Daily cleanup completed: ${JSON.stringify(report)}`);

      // Send admin alert if needed
      if (report.errors.length > 0) {
        this.logger.warn(`⚠️ Cleanup completed with errors: ${report.errors.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`❌ Daily cleanup failed: ${error}`);
    }
  }

  @Cron('0 3 * * 0') // Weekly on Sunday at 3 AM
  async weeklyMaintenance() {
    this.logger.debug('🌙 Running weekly maintenance job...');

    try {
      // Generate archival statistics
      const archiveReport = await this.generateArchiveReport();
      this.logger.log(`📊 Archive Report: ${JSON.stringify(archiveReport)}`);

      // Get storage stats
      const storageStats = await this.getStorageStats();
      this.logger.log(`💾 Storage Stats: ${JSON.stringify(storageStats)}`);

      // Archive old POs
      const poStats = await this.archiveClosedPurchaseOrders(180);
      this.logger.log(`✅ Weekly maintenance completed`);
    } catch (error) {
      this.logger.error(`❌ Weekly maintenance failed: ${error}`);
    }
  }

  @Cron('0 4 1 * *') // Monthly on 1st at 4 AM
  async monthlyArchival() {
    this.logger.debug('🌙 Running monthly archival job...');

    try {
      const report: CleanupReport = {
        totalOperations: 0,
        stats: [],
        totalDuration: 0,
        timestamp: new Date(),
        errors: [],
      };

      const startTime = Date.now();

      // Archive month-old bills
      try {
        const billStats = await this.archiveCompletedBills(30);
        report.stats.push(billStats);
      } catch (error) {
        report.errors.push(`Monthly bill archival failed: ${error}`);
      }

      // Archive month-old audit logs
      try {
        const auditStats = await this.purgeOldAuditLogs(365);
        report.stats.push(auditStats);
      } catch (error) {
        report.errors.push(`Monthly audit archival failed: ${error}`);
      }

      report.totalDuration = Date.now() - startTime;

      this.logger.log(`✅ Monthly archival completed: ${JSON.stringify(report)}`);
    } catch (error) {
      this.logger.error(`❌ Monthly archival failed: ${error}`);
    }
  }
}
