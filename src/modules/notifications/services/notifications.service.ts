import { Injectable, Logger } from '@nestjs/common';
import {
  CreateNotificationDto,
  SendNotificationDto,
  NotificationPreferenceDto,
} from '../dto/create-notification.dto';
import { NotificationType } from '../types/notification-type.enum';

/**
 * NOTE: the Notification/NotificationLog/NotificationPreference persistence
 * methods below are built against Prisma models that don't exist anywhere in
 * schema.prisma - same "built against a schema that was never created"
 * pattern found across ~9 other places in the 2026-07-06 audit (also true of
 * archival.service.ts's notification purge, which was stubbed the same day).
 * NotificationsModule is registered with a live controller, so these are
 * reachable via HTTP even though nothing persists. Stubbed to log and return
 * safe defaults rather than crash - needs a product/schema decision (add the
 * models, or drop the feature) before this is genuinely functional.
 *
 * Separately, and independent of the above: notifyBillApproval/
 * notifyPOStatusChange/notifyPaymentDue used NotificationType values that
 * don't exist in the real enum (BILL_APPROVED, PO_APPROVED, BILL_PAYMENT_DUE,
 * INVENTORY_CRITICAL - real values are BILL_APPROVAL, PO_APPROVAL,
 * PAYMENT_DUE, and INVENTORY_LOW has no separate "critical" tier). Those were
 * genuine bugs, fixed below regardless of the missing-schema issue.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * Create an in-app notification
   */
  async createNotification(organizationId: number, dto: CreateNotificationDto): Promise<any> {
    this.logger.warn('createNotification(): no Notification model exists in schema.prisma');
    return null;
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
    this.logger.warn('getUserNotifications(): no Notification model exists in schema.prisma');
    return { data: [], total: 0 };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(organizationId: number, notificationId: number): Promise<any> {
    this.logger.warn('markAsRead(): no Notification model exists in schema.prisma');
    return null;
  }

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead(organizationId: number, userId: number): Promise<any> {
    this.logger.warn('markAllAsRead(): no Notification model exists in schema.prisma');
    return { count: 0 };
  }

  /**
   * Delete notification
   */
  async deleteNotification(organizationId: number, notificationId: number): Promise<any> {
    this.logger.warn('deleteNotification(): no Notification model exists in schema.prisma');
    return null;
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
    this.logger.warn('getNotificationHistory(): no Notification model exists in schema.prisma');
    return { data: [], total: 0 };
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
