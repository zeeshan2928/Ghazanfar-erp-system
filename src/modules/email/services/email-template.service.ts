import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { EmailTemplateType } from '@prisma/client';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get email template by type
   */
  async getTemplate(templateType: EmailTemplateType) {
    try {
      return await this.prisma.emailTemplate.findUnique({
        where: { type: templateType },
      });
    } catch (error) {
      this.logger.error(`Failed to get template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Render template with data
   */
  renderTemplate(templateType: EmailTemplateType, template: any, data: any): { subject: string; html: string } {
    try {
      const subjectTemplate = Handlebars.compile(template.subject);
      const bodyTemplate = Handlebars.compile(template.htmlBody);

      const subject = subjectTemplate(data);
      const html = bodyTemplate(data);

      return { subject, html };
    } catch (error) {
      this.logger.error(`Failed to render template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send invoice email
   */
  async sendInvoiceEmail(billId: number, customerEmail: string, billData: any) {
    try {
      const template = await this.getTemplate(EmailTemplateType.INVOICE);
      if (!template || !template.isActive) {
        this.logger.warn('Invoice template not found or inactive');
        return null;
      }

      const rendered = this.renderTemplate(EmailTemplateType.INVOICE, template, billData);

      // TODO: Integrate with email service to actually send
      this.logger.log(`Invoice email queued for ${customerEmail}: Bill #${billId}`);

      return rendered;
    } catch (error) {
      this.logger.error(`Failed to send invoice email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminderEmail(billId: number, customerEmail: string, billData: any) {
    try {
      const template = await this.getTemplate(EmailTemplateType.PAYMENT_REMINDER);
      if (!template || !template.isActive) {
        this.logger.warn('Payment reminder template not found or inactive');
        return null;
      }

      const rendered = this.renderTemplate(EmailTemplateType.PAYMENT_REMINDER, template, billData);

      // TODO: Integrate with email service
      this.logger.log(`Payment reminder queued for ${customerEmail}: Bill #${billId}`);

      return rendered;
    } catch (error) {
      this.logger.error(`Failed to send payment reminder: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send PO confirmation email
   */
  async sendPOConfirmationEmail(poId: number, vendorEmail: string, poData: any) {
    try {
      const template = await this.getTemplate(EmailTemplateType.PO_CONFIRMATION);
      if (!template || !template.isActive) {
        this.logger.warn('PO confirmation template not found or inactive');
        return null;
      }

      const rendered = this.renderTemplate(EmailTemplateType.PO_CONFIRMATION, template, poData);

      // TODO: Integrate with email service
      this.logger.log(`PO confirmation queued for ${vendorEmail}: PO #${poId}`);

      return rendered;
    } catch (error) {
      this.logger.error(`Failed to send PO confirmation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send shipment notification email
   */
  async sendShippingNotificationEmail(billId: number, customerEmail: string, shippingData: any) {
    try {
      const template = await this.getTemplate(EmailTemplateType.SHIPMENT_NOTIFICATION);
      if (!template || !template.isActive) {
        this.logger.warn('Shipment notification template not found or inactive');
        return null;
      }

      const rendered = this.renderTemplate(EmailTemplateType.SHIPMENT_NOTIFICATION, template, shippingData);

      // TODO: Integrate with email service
      this.logger.log(`Shipping notification queued for ${customerEmail}: Bill #${billId}`);

      return rendered;
    } catch (error) {
      this.logger.error(`Failed to send shipping notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send delivery confirmation email
   */
  async sendDeliveryConfirmationEmail(billId: number, customerEmail: string, deliveryData: any) {
    try {
      const template = await this.getTemplate(EmailTemplateType.DELIVERY_CONFIRMATION);
      if (!template || !template.isActive) {
        this.logger.warn('Delivery confirmation template not found or inactive');
        return null;
      }

      const rendered = this.renderTemplate(EmailTemplateType.DELIVERY_CONFIRMATION, template, deliveryData);

      // TODO: Integrate with email service
      this.logger.log(`Delivery confirmation queued for ${customerEmail}: Bill #${billId}`);

      return rendered;
    } catch (error) {
      this.logger.error(`Failed to send delivery confirmation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send user invite email
   */
  async sendUserInviteEmail(userEmail: string, userName: string, inviteLink: string) {
    try {
      const template = await this.getTemplate(EmailTemplateType.USER_INVITE);
      if (!template || !template.isActive) {
        this.logger.warn('User invite template not found or inactive');
        return null;
      }

      const rendered = this.renderTemplate(EmailTemplateType.USER_INVITE, template, { userName, inviteLink });

      // TODO: Integrate with email service
      this.logger.log(`User invite email queued for ${userEmail}`);

      return rendered;
    } catch (error) {
      this.logger.error(`Failed to send user invite: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all templates
   */
  async getAllTemplates(organizationId?: number) {
    try {
      return await this.prisma.emailTemplate.findMany({
        where: organizationId ? { organizationId } : {},
        orderBy: { type: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get all templates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update email template
   */
  async updateTemplate(
    templateType: EmailTemplateType,
    data: {
      subject?: string;
      htmlBody?: string;
      textBody?: string;
      isActive?: boolean;
    },
  ) {
    try {
      return await this.prisma.emailTemplate.update({
        where: { type: templateType },
        data,
      });
    } catch (error) {
      this.logger.error(`Failed to update template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log sent email
   */
  async logEmail(
    organizationId: number,
    templateType: EmailTemplateType | null,
    to: string,
    subject: string,
    status: string = 'SENT',
    errorMessage?: string,
    attachments: string[] = [],
  ) {
    try {
      await this.prisma.emailLog.create({
        data: {
          organizationId,
          templateType,
          to,
          subject,
          status,
          errorMessage,
          attachments,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log email: ${error.message}`);
    }
  }

  /**
   * Get email logs
   */
  async getEmailLogs(
    organizationId: number,
    filters: {
      to?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    skip: number = 0,
    take: number = 20,
  ) {
    try {
      const where: any = { organizationId };

      if (filters.to) where.to = { contains: filters.to };
      if (filters.status) where.status = filters.status;

      if (filters.startDate || filters.endDate) {
        where.sentAt = {};
        if (filters.startDate) where.sentAt.gte = filters.startDate;
        if (filters.endDate) where.sentAt.lte = filters.endDate;
      }

      const logs = await this.prisma.emailLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take,
      });

      const total = await this.prisma.emailLog.count({ where });

      return { data: logs, total };
    } catch (error) {
      this.logger.error(`Failed to get email logs: ${error.message}`);
      throw error;
    }
  }
}
