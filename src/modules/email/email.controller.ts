import { Controller, Get, Post, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { EmailTemplateService } from './services/email-template.service';
import { EmailTemplateType } from './types/email-template-type.enum';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('email')
@UseGuards(JwtGuard)
export class EmailController {
  constructor(private emailService: EmailTemplateService) {}

  /**
   * Get all email templates
   */
  @Get('templates')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('email.view')
  async getTemplates(@OrgContext() orgContext?: any) {
    return this.emailService.getAllTemplates(orgContext?.organizationId);
  }

  /**
   * Get specific template
   */
  @Get('templates/:type')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('email.view')
  async getTemplate(@Param('type') type: string) {
    try {
      return await this.emailService.getTemplate(type as EmailTemplateType);
    } catch (error) {
      return { error: 'Template not found' };
    }
  }

  /**
   * Update email template
   */
  @Put('templates/:type')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('email.edit_templates')
  async updateTemplate(
    @Param('type') type: string,
    @Body()
    updateData: { subject?: string; htmlBody?: string; textBody?: string; isActive?: boolean },
  ) {
    try {
      return await this.emailService.updateTemplate(type as EmailTemplateType, updateData);
    } catch (error) {
      return { error: 'Failed to update template' };
    }
  }

  /**
   * Preview rendered email (with sample data)
   */
  @Post('preview/:type')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('email.view')
  async previewTemplate(@Param('type') type: string, @Body() sampleData: any) {
    try {
      const template = await this.emailService.getTemplate(type as EmailTemplateType);
      if (!template) {
        return { error: 'Template not found' };
      }

      const rendered = this.emailService.renderTemplate(
        type as EmailTemplateType,
        template,
        sampleData,
      );
      return rendered;
    } catch (error) {
      return { error: 'Failed to preview template' };
    }
  }

  /**
   * Send test email to user's email
   */
  @Post('send-test')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('email.edit_templates')
  async sendTestEmail(
    @Body() { templateType, testEmail }: { templateType: EmailTemplateType; testEmail: string },
    @OrgContext() orgContext?: any,
  ) {
    try {
      // Sample data for different template types
      const sampleDataMap = {
        INVOICE: {
          billNumber: 'INV-001',
          customerName: 'John Doe',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [{ name: 'Product 1', qty: 2, price: 1000, total: 2000 }],
          subtotal: 2000,
          tax: 200,
          totalAmount: 2200,
        },
        PAYMENT_REMINDER: {
          billNumber: 'INV-001',
          amount: 2200,
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          daysOverdue: 0,
        },
        PO_CONFIRMATION: {
          poNumber: 'PO-001',
          vendorName: 'Supplier Inc',
          totalAmount: 5000,
          expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        },
        SHIPMENT_NOTIFICATION: {
          trackingNumber: 'TRACK123456',
          estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        },
        DELIVERY_CONFIRMATION: {
          deliveryDate: new Date().toISOString().split('T')[0],
          location: 'Main Warehouse',
        },
        USER_INVITE: {
          userName: 'New User',
          inviteLink: 'https://example.com/invite/abc123',
        },
        BILL_APPROVAL: {
          billNumber: 'INV-001',
          amount: 2200,
          approvedBy: 'Manager Name',
        },
        PO_APPROVAL: {
          poNumber: 'PO-001',
          amount: 5000,
          approvedBy: 'Manager Name',
        },
      };

      const template = await this.emailService.getTemplate(templateType);
      if (!template) {
        return { error: 'Template not found' };
      }

      const sampleData = sampleDataMap[templateType] || {};
      const rendered = this.emailService.renderTemplate(templateType, template, sampleData);

      // Log the email
      await this.emailService.logEmail(
        orgContext?.organizationId,
        templateType,
        testEmail,
        rendered.subject,
        'SENT_TEST',
      );

      // In a real scenario, actually send the email here
      return {
        success: true,
        message: 'Test email prepared (not actually sent in this version)',
        emailPreview: rendered,
      };
    } catch (error) {
      return { error: 'Failed to send test email' };
    }
  }

  /**
   * Get email logs
   */
  @Get('logs')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('email.view')
  async getEmailLogs(
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;

    const filters = {
      to,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.emailService.getEmailLogs(orgContext?.organizationId, filters, skipNum, takeNum);
  }
}
