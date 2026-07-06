import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

/**
 * NOTE: this entire service is built against Prisma models that don't exist
 * anywhere in schema.prisma (VendorInvoice, InvoiceModification) - same
 * "built against a schema that was never created" pattern found across ~9
 * other places in the 2026-07-06 audit. Confirmed dead code: InvoicesModule
 * has no controller and nothing else in the codebase injects InvoicesService.
 * Stubbed to log a warning and return safe defaults rather than crash, in
 * case this is ever wired up before the schema decision is made.
 */
@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private prisma: PrismaService) {}

  async getVendorInvoices(organizationId: number, vendorId?: number): Promise<any[]> {
    this.logger.warn('getVendorInvoices(): no VendorInvoice model exists in schema.prisma');
    return [];
  }

  async getInvoiceById(organizationId: number, invoiceId: number): Promise<any> {
    this.logger.warn('getInvoiceById(): no VendorInvoice model exists in schema.prisma');
    return null;
  }

  async updateInvoiceStatus(
    organizationId: number,
    invoiceId: number,
    status: string,
  ): Promise<any> {
    this.logger.warn('updateInvoiceStatus(): no VendorInvoice model exists in schema.prisma');
    return null;
  }

  async logInvoiceModification(
    organizationId: number,
    invoiceId: number,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    modifiedBy: number,
  ): Promise<any> {
    this.logger.warn(
      'logInvoiceModification(): no InvoiceModification model exists in schema.prisma',
    );
    return null;
  }

  async getInvoiceModificationHistory(
    organizationId: number,
    invoiceId: number,
  ): Promise<any[]> {
    this.logger.warn(
      'getInvoiceModificationHistory(): no InvoiceModification model exists in schema.prisma',
    );
    return [];
  }
}
