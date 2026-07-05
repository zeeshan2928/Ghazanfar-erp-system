import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log create operation
   */
  async logCreate(
    organizationId: number,
    entity: string,
    entityId: number,
    newData: any,
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          entity,
          entityId,
          action: AuditAction.INVOICE_APPROVED,
          newData,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log create: ${error.message}`);
    }
  }

  /**
   * Log update operation with field-level changes
   */
  async logUpdate(
    organizationId: number,
    entity: string,
    entityId: number,
    oldData: any,
    newData: any,
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      // Calculate field-level changes
      const changes = this.calculateChanges(oldData, newData);

      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          entity,
          entityId,
          action: AuditAction.MODIFICATION_APPROVED,
          changes,
          oldData,
          newData,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log update: ${error.message}`);
    }
  }

  /**
   * Log delete operation
   */
  async logDelete(
    organizationId: number,
    entity: string,
    entityId: number,
    deletedData: any,
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          entity,
          entityId,
          action: AuditAction.ADJUSTMENT_MADE,
          oldData: deletedData,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log delete: ${error.message}`);
    }
  }

  /**
   * Log status change
   */
  async logStatusChange(
    organizationId: number,
    entity: string,
    entityId: number,
    oldStatus: string,
    newStatus: string,
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          entity,
          entityId,
          action: AuditAction.MODIFICATION_APPROVED,
          changes: {
            status: { oldValue: oldStatus, newValue: newStatus },
          },
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log status change: ${error.message}`);
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(
    organizationId: number,
    filters: {
      entity?: string;
      entityId?: number;
      userId?: number;
      action?: AuditAction;
      startDate?: Date;
      endDate?: Date;
    },
    skip: number = 0,
    take: number = 20,
  ) {
    try {
      const where: any = { organizationId };

      if (filters.entity) where.entity = filters.entity;
      if (filters.entityId) where.entityId = filters.entityId;
      if (filters.userId) where.userId = filters.userId;
      if (filters.action) where.action = filters.action;

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const total = await this.prisma.auditLog.count({ where });

      return { data: logs, total };
    } catch (error) {
      this.logger.error(`Failed to get audit logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get full history of changes for a specific entity
   */
  async getEntityHistory(organizationId: number, entity: string, entityId: number) {
    try {
      return await this.prisma.auditLog.findMany({
        where: {
          organizationId,
          entity,
          entityId,
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get entity history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's audit log (all actions by a user)
   */
  async getUserAuditLog(organizationId: number, userId: number, skip: number = 0, take: number = 20) {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          organizationId,
          userId,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const total = await this.prisma.auditLog.count({
        where: { organizationId, userId },
      });

      return { data: logs, total };
    } catch (error) {
      this.logger.error(`Failed to get user audit log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get summary of all changes in a date range
   */
  async getChangesSummary(organizationId: number, startDate: Date, endDate: Date) {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group by entity and action
      const summary = {
        totalChanges: logs.length,
        byEntity: {},
        byAction: {},
        byUser: {},
      };

      for (const log of logs) {
        // By Entity
        if (!summary.byEntity[log.entity]) {
          summary.byEntity[log.entity] = 0;
        }
        summary.byEntity[log.entity]++;

        // By Action
        if (!summary.byAction[log.action]) {
          summary.byAction[log.action] = 0;
        }
        summary.byAction[log.action]++;

        // By User
        if (log.userId) {
          if (!summary.byUser[log.userId]) {
            summary.byUser[log.userId] = 0;
          }
          summary.byUser[log.userId]++;
        }
      }

      return summary;
    } catch (error) {
      this.logger.error(`Failed to get changes summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get top changed entities
   */
  async getTopChangedEntities(organizationId: number, limit: number = 10) {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit * 10, // Get more to group by
      });

      const entityCounts = {};
      for (const log of logs) {
        if (!entityCounts[log.entity]) {
          entityCounts[log.entity] = 0;
        }
        entityCounts[log.entity]++;
      }

      return Object.entries(entityCounts)
        .map(([entity, count]: any) => ({ entity, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to get top changed entities: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user activity report
   */
  async getUserActivityReport(organizationId: number, startDate: Date, endDate: Date) {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const userActivity = {};
      for (const log of logs) {
        if (log.userId) {
          if (!userActivity[log.userId]) {
            userActivity[log.userId] = {
              userId: log.userId,
              totalActions: 0,
              creates: 0,
              updates: 0,
              deletes: 0,
              statusChanges: 0,
            };
          }

          userActivity[log.userId].totalActions++;
          if (log.action === AuditAction.INVOICE_APPROVED) userActivity[log.userId].creates++;
          if (log.action === AuditAction.MODIFICATION_APPROVED) userActivity[log.userId].updates++;
          if (log.action === AuditAction.ADJUSTMENT_MADE) userActivity[log.userId].deletes++;
          if (log.action === AuditAction.MODIFICATION_APPROVED) userActivity[log.userId].statusChanges++;
        }
      }

      return Object.values(userActivity);
    } catch (error) {
      this.logger.error(`Failed to get user activity report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate field-level changes
   */
  private calculateChanges(oldData: any, newData: any): any {
    const changes = {};

    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

    for (const key of allKeys) {
      const oldValue = oldData?.[key];
      const newValue = newData?.[key];

      if (oldValue !== newValue) {
        changes[key] = { oldValue, newValue };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}
