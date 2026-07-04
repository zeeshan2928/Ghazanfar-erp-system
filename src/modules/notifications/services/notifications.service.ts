import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CreateNotificationDto, SendNotificationDto, NotificationPreferenceDto } from '../dto/create-notification.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an in-app notification
   */
  async createNotification(organizationId: number, dto: CreateNotificationDto) {
    try {
      return await this.prisma.notification.create({
        data: {
          organizationId,
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          data: dto.data || null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification via email/SMS and create in-app notification
   */
  async sendNotification(organizationId: number, dto: SendNotificationDto) {
    try {
      // Create in-app notification
      const notification = await this.createNotification(organizationId, {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data,
      });

      // Queue email if provided
      if (dto.email) {
        await this.queueEmail(organizationId, dto.userId, dto.type, dto.email, dto.title, dto.message);
      }

      // Queue SMS if provided
      if (dto.phoneNumber) {
        await this.queueSMS(organizationId, dto.userId, dto.type, dto.phoneNumber, dto.message);
      }

      return notification;
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue email for sending (async)
   */
  async queueEmail(organizationId: number, userId: number, type: NotificationType, email: string, subject: string, message: string) {
    try {
      await this.prisma.notificationLog.create({
        data: {
          organizationId,
          userId,
          type: type.toString(),
          status: 'PENDING',
          recipient: email,
          channel: 'EMAIL',
          retryCount: 0,
        },
      });
      // TODO: Integrate with email service to actually send
      this.logger.log(`Email queued for ${email}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to queue email: ${error.message}`);
    }
  }

  /**
   * Queue SMS for sending (async)
   */
  async queueSMS(organizationId: number, userId: number, type: NotificationType, phoneNumber: string, message: string) {
    try {
      await this.prisma.notificationLog.create({
        data: {
          organizationId,
          userId,
          type: type.toString(),
          status: 'PENDING',
          recipient: phoneNumber,
          channel: 'SMS',
          retryCount: 0,
        },
      });
      // TODO: Integrate with Twilio service to actually send
      this.logger.log(`SMS queued for ${phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to queue SMS: ${error.message}`);
    }
  }

  /**
   * Get user's notifications (paginated, unread first)
   */
  async getUserNotifications(organizationId: number, userId: number, skip: number = 0, take: number = 10) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: {
          organizationId,
          userId,
        },
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      });

      const total = await this.prisma.notification.count({
        where: { organizationId, userId },
      });

      return { data: notifications, total };
    } catch (error) {
      this.logger.error(`Failed to get user notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(organizationId: number, notificationId: number) {
    try {
      return await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead(organizationId: number, userId: number) {
    try {
      return await this.prisma.notification.updateMany({
        where: {
          organizationId,
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to mark all as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(organizationId: number, notificationId: number) {
    try {
      return await this.prisma.notification.delete({
        where: { id: notificationId },
      });
    } catch (error) {
      this.logger.error(`Failed to delete notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notification history with filters
   */
  async getNotificationHistory(organizationId: number, filters: any = {}, skip: number = 0, take: number = 20) {
    try {
      const where: any = { organizationId };

      if (filters.userId) where.userId = filters.userId;
      if (filters.type) where.type = filters.type;
      if (filters.isRead !== undefined) where.isRead = filters.isRead;
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
      }

      const notifications = await this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const total = await this.prisma.notification.count({ where });

      return { data: notifications, total };
    } catch (error) {
      this.logger.error(`Failed to get notification history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(organizationId: number, userId: number) {
    try {
      let preferences = await this.prisma.notificationPreference.findUnique({
        where: {
          organizationId_userId: { organizationId, userId },
        },
      });

      // Return default preferences if not found
      if (!preferences) {
        preferences = {
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

      return preferences;
    } catch (error) {
      this.logger.error(`Failed to get notification preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save/Update user notification preferences
   */
  async saveNotificationPreferences(organizationId: number, userId: number, dto: NotificationPreferenceDto) {
    try {
      return await this.prisma.notificationPreference.upsert({
        where: {
          organizationId_userId: { organizationId, userId },
        },
        create: {
          organizationId,
          userId,
          ...dto,
        },
        update: dto,
      });
    } catch (error) {
      this.logger.error(`Failed to save notification preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notify bill approval
   */
  async notifyBillApproval(organizationId: number, billId: number, recipients: any[]) {
    try {
      for (const recipient of recipients) {
        await this.sendNotification(organizationId, {
          userId: recipient.userId,
          type: NotificationType.BILL_APPROVED,
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
  async notifyPOStatusChange(organizationId: number, poId: number, status: string, recipients: any[]) {
    try {
      const typeMap = {
        APPROVED: NotificationType.PO_APPROVED,
        RECEIVED: NotificationType.PO_RECEIVED,
        DELAYED: NotificationType.PO_DELAYED,
      };

      const type = typeMap[status] || NotificationType.PO_APPROVED;

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
   */
  async notifyLowInventory(organizationId: number, productId: number, currentStock: number, recipients: any[]) {
    try {
      const type = currentStock === 0 ? NotificationType.INVENTORY_CRITICAL : NotificationType.INVENTORY_LOW;

      for (const recipient of recipients) {
        await this.sendNotification(organizationId, {
          userId: recipient.userId,
          type,
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
  async notifyPaymentDue(organizationId: number, billId: number, daysUntilDue: number, recipients: any[]) {
    try {
      for (const recipient of recipients) {
        await this.sendNotification(organizationId, {
          userId: recipient.userId,
          type: NotificationType.BILL_PAYMENT_DUE,
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
  async notifyPODeliveryDelay(organizationId: number, poId: number, daysDelayed: number, recipients: any[]) {
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
