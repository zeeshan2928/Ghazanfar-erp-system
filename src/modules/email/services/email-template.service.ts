import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import * as Handlebars from 'handlebars';
import { EmailTemplateType } from '../types/email-template-type.enum';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get email template by type
   * NOTE: there is no EmailTemplate model in schema.prisma. Every caller
   * already handles a null/missing template gracefully (checks
   * `!template || !template.isActive`), so this returns null rather than
   * inventing a schema unilaterally - needs a product/schema decision.
   */
  async getTemplate(templateType: EmailTemplateType): Promise<any> {
    this.logger.warn(
      `getTemplate(${templateType}): no EmailTemplate model exists in schema.prisma - returning null`,
    );
    return null;
  }

  /**
   * Render template with data
   */
  renderTemplate(
    templateType: EmailTemplateType,
    template: any,
    data: any,
  ): { subject: string; html: string } {
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

      const rendered = this.renderTemplate(
        EmailTemplateType.SHIPMENT_NOTIFICATION,
        template,
        shippingData,
      );

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

      const rendered = this.renderTemplate(
        EmailTemplateType.DELIVERY_CONFIRMATION,
        template,
        deliveryData,
      );

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

      const rendered = this.renderTemplate(EmailTemplateType.USER_INVITE, template, {
        userName,
        inviteLink,
      });

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
   * NOTE: no EmailTemplate model exists in schema.prisma - see getTemplate().
   */
  async getAllTemplates(_organizationId?: number): Promise<any[]> {
    this.logger.warn('getAllTemplates(): no EmailTemplate model exists in schema.prisma');
    return [];
  }

  /**
   * Update email template
   * NOTE: no EmailTemplate model exists in schema.prisma - see getTemplate().
   */
  async updateTemplate(
    templateType: EmailTemplateType,
    _data: {
      subject?: string;
      htmlBody?: string;
      textBody?: string;
      isActive?: boolean;
    },
  ): Promise<any> {
    this.logger.warn(
      `updateTemplate(${templateType}): no EmailTemplate model exists in schema.prisma - no-op`,
    );
    return null;
  }

  /**
   * Log sent email
   * NOTE: no EmailLog model exists in schema.prisma - logging to the app
   * logger instead of persisting, so the calling flow doesn't break.
   */
  async logEmail(
    organizationId: number,
    templateType: EmailTemplateType | null,
    to: string,
    subject: string,
    status: string = 'SENT',
    errorMessage?: string,
    _attachments: string[] = [],
  ): Promise<void> {
    this.logger.log(
      `[email-log org=${organizationId}] ${status} to=${to} subject="${subject}" template=${templateType ?? 'none'}${errorMessage ? ` error=${errorMessage}` : ''}`,
    );
  }

  /**
   * Get email logs
   * NOTE: no EmailLog model exists in schema.prisma - see logEmail().
   */
  async getEmailLogs(
    _organizationId: number,
    _filters: {
      to?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    _skip: number = 0,
    _take: number = 20,
  ): Promise<{ data: any[]; total: number }> {
    this.logger.warn('getEmailLogs(): no EmailLog model exists in schema.prisma');
    return { data: [], total: 0 };
  }
}
