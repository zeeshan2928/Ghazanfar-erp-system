import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import {
  CreateNotificationDto,
  SendNotificationDto,
  NotificationPreferenceDto,
} from '../dto/create-notification.dto';
import { NotificationType } from '../types/notification-type.enum';

/**
 * The Notification model now exists (prisma/schema.prisma) - persistence
 * below is real. NotificationLog/NotificationPreference still don't have
 * backing models (no email/SMS provider chosen yet), so queueEmail/queueSMS
 * and the preference get/save methods remain stubbed/log-only - that's an
 * intentionally separate, still-open product decision, not an oversight.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an in-app notification
   */
  async createNotification(organizationId: number, dto: CreateNotificationDto): Promise<any> {
    return this.prisma.notification.create({
      data: {
        organizationId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data,
      },
    });
  }

  /**
   * Send notification via email/SMS and create in-app notification
   */
  async sendNotification(organizationId: number, dto: SendNotificationDto) {
    const notification = await this.createNotification(organizationId, {
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
    });

    if (dto.email) {
      await this.queueEmail(organizationId, dto.userId, dto.type, dto.email, dto.title, dto.message);
    }

    if (dto.phoneNumber) {
      await this.queueSMS(organizationId, dto.userId, dto.type, dto.phoneNumber, dto.message);
    }

    return notification;
  }

  /**
   * Queue email for sending (async)
   * NOTE: no NotificationLog model exists in schema.prisma - logging to the
   * app logger instead of persisting.
   */
  async queueEmail(
    organizationId: number,
    userId: number,
    type: NotificationType,
    email: string,
    subject: string,
    message: string,
  ): Promise<void> {
    this.logger.log(`[email queued] org=${organizationId} to=${email} subject="${subject}"`);
  }

  /**
   * Queue SMS for sending (async)
   * NOTE: no NotificationLog model exists in schema.prisma - logging to the
   * app logger instead of persisting.
   */
  async queueSMS(
    organizationId: number,
    userId: number,
    type: NotificationType,
    phoneNumber: string,
    message: string,
  ): Promise<void> {
    this.logger.log(`[sms queued] org=${organizationId} to=${phoneNumber}`);
  }

  /**
   * Get user's notifications (paginated, unread first)
   */
  async getUserNotifications(
    organizationId: number,
    userId: number,
    skip: number = 0,
    take: number = 10,
  ) {
    const where = { organizationId, userId };
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);
    return { data, total, unreadCount };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(organizationId: number, notificationId: number): Promise<any> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, organizationId },
    });
    if (!notification) return null;

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead(organizationId: number, userId: number): Promise<any> {
    return this.prisma.notification.updateMany({
      where: { organizationId, userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(organizationId: number, notificationId: number): Promise<any> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, organizationId },
    });
    if (!notification) return null;

    return this.prisma.notification.delete({ where: { id: notificationId } });
  }

  /**
   * Get notification history with filters
   */
  async getNotificationHistory(
    organizationId: number,
    filters: any = {},
    skip: number = 0,
    take: number = 20,
  ) {
    const where: any = { organizationId };
    if (filters.type) where.type = filters.type;
    if (filters.isRead !== undefined) where.isRead = filters.isRead;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total };
  }

  /**
   * Creates an INVENTORY_LOW notification for a product, unless an unread
   * one for the same product already exists - avoids spamming the same
   * still-low product on every alert check.
   */
  async notifyLowStockOnce(organizationId: number, userId: number, productId: number, productName: string, currentAvailable: number) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        organizationId,
        userId,
        type: 'INVENTORY_LOW',
        isRead: false,
        data: { path: ['productId'], equals: productId },
      },
    });
    if (existing) return existing;

    return this.createNotification(organizationId, {
      userId,
      type: NotificationType.INVENTORY_LOW,
      title: 'Low stock alert',
      message: `${productName} is at ${currentAvailable} units - below its minimum threshold.`,
      data: { productId, currentAvailable },
    });
  }

  /**
   * Get user notification preferences
   * NOTE: no NotificationPreference model exists in schema.prisma - always
   * returns the default preference set.
   */
  async getNotificationPreferences(organizationId: number, userId: number) {
    return {
      id: 0,
      organizationId,
      userId,
      billApprovalEmail: true,
      billPaidEmail: true,
      paymentDueEmail: true,
      poApprovalEmail: true,
      poReceivedEmail: true,
      poDelayedEmail: true,
      inventoryLowEmail: true,
      inventoryLowSMS: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Save/Update user notification preferences
   * NOTE: no NotificationPreference model exists in schema.prisma - not
   * persisted.
   */
  async saveNotificationPreferences(
    organizationId: number,
    userId: number,
    dto: NotificationPreferenceDto,
  ) {
    this.logger.warn(
      'saveNotificationPreferences(): no NotificationPreference model exists in schema.prisma - not persisted',
    );
    return { organizationId, userId, ...dto };
  }

  /**
   * Notify bill approval
   */
  async notifyBillApproval(organizationId: number, billId: number, recipients: any[]) {
    try {
      for (const recipient of recipients) {
        await this.sendNotification(organizationId, {
          userId: recipient.userId,
          type: NotificationType.BILL_APPROVAL,
          title: 'Bill Approved',
          message: `Bill #${billId} has been approved and finalized.`,
          data: { billId },
          email: recipient.email,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify bill approval: ${error.message}`);
    }
  }

  /**
   * Notify PO status change
   */
  async notifyPOStatusChange(
    organizationId: number,
    poId: number,
    status: string,
    recipients: any[],
  ) {
    try {
      const typeMap: Record<string, NotificationType> = {
        APPROVED: NotificationType.PO_APPROVAL,
        RECEIVED: NotificationType.PO_RECEIVED,
        DELAYED: NotificationType.PO_DELAYED,
      };

      const type = typeMap[status] || NotificationType.PO_APPROVAL;

      for (const recipient of recipients) {
        await this.sendNotification(organizationId, {
          userId: recipient.userId,
          type,
          title: `Purchase Order ${status}`,
          message: `PO #${poId} status changed to ${status}.`,
          data: { poId, status },
          email: recipient.email,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify PO status change: ${error.message}`);
    }
  }

  /**
   * Notify low inventory
   * NOTE: NotificationType has no separate "critical" tier - both zero-stock
   * and low-stock use INVENTORY_LOW.
   */
  async notifyLowInventory(
    organizationId: number,
    productId: number,
    currentStock: number,
    recipients: any[],
  ) {
    try {
      for (const recipient of recipients) {
        await this.sendNotification(organizationId, {
          userId: recipient.userId,
          type: NotificationType.INVENTORY_LOW,
          title: 'Low Inventory Alert',
          message: `Product #${productId} has low stock (${currentStock} units).`,
          data: { productId, currentStock },
          email: recipient.email,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify low inventory: ${error.message}`);
    }
  }

  /**
   * Notify payment due
   */
  async notifyPaymentDue(
    organizationId: number,
    billId: number,
    daysUntilDue: number,
    recipients: any[],
  ) {
    try {
      for (const recipient of recipients) {
        await this.sendNotification(organizationId, {
          userId: recipient.userId,
          type: NotificationType.PAYMENT_DUE,
          title: 'Payment Due Reminder',
          message: `Payment for Bill #${billId} is due in ${daysUntilDue} days.`,
          data: { billId, daysUntilDue },
          email: recipient.email,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify payment due: ${error.message}`);
    }
  }

  /**
   * Notify PO delivery delay
   */
  async notifyPODeliveryDelay(
    organizationId: number,
    poId: number,
    daysDelayed: number,
    recipients: any[],
  ) {
    try {
      for (const recipient of recipients) {
        await this.sendNotification(organizationId, {
          userId: recipient.userId,
          type: NotificationType.PO_DELAYED,
          title: 'Purchase Order Delayed',
          message: `PO #${poId} is delayed by ${daysDelayed} days.`,
          data: { poId, daysDelayed },
          email: recipient.email,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify PO delivery delay: ${error.message}`);
    }
  }
}
