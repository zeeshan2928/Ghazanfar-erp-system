import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private prisma: PrismaService) {}

  async getVendorInvoices(organizationId: number, vendorId?: number) {
    return this.prisma.vendorInvoice.findMany({
      where: {
        organizationId,
        ...(vendorId && { vendorId }),
      },
      include: { organization: true, vendor: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoiceById(organizationId: number, invoiceId: number) {
    return this.prisma.vendorInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { organization: true, vendor: true },
    });
  }

  async updateInvoiceStatus(organizationId: number, invoiceId: number, status: string) {
    return this.prisma.vendorInvoice.update({
      where: { id: invoiceId },
      data: { status },
    });
  }

  async logInvoiceModification(
    organizationId: number,
    invoiceId: number,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    modifiedBy: number,
  ) {
    return this.prisma.invoiceModification.create({
      data: {
        organizationId,
        invoiceId,
        fieldName,
        oldValue,
        newValue,
        modifiedBy,
      },
    });
  }

  async getInvoiceModificationHistory(organizationId: number, invoiceId: number) {
    return this.prisma.invoiceModification.findMany({
      where: { organizationId, invoiceId },
      orderBy: { modifiedAt: 'desc' },
    });
  }
}
