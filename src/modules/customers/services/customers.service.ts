import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(organizationId: number, data: any) {
    return this.prisma.customer.create({
      data: {
        organizationId,
        name: data.name,
        phone: data.phone || '',
        // Empty string would collide with the @@unique([organizationId,
        // email]) constraint the moment a second customer is created
        // without one (walk-ins almost never have an email) - null doesn't,
        // since SQL treats every NULL as distinct for uniqueness purposes.
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        customerType: data.customerType || 'RETAIL',
        creditLimit: parseInt(data.creditLimit || data.credit_limit) || 0,
        isActive: true,
      },
    });
  }

  async getSaleHistory(organizationId: number, customerId: number, limit = 10) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        customerId,
        isActive: true,
      },
      include: {
        lines: {
          include: {
            product: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { bill_date: 'desc' },
      take: limit,
    });

    return bills.map(bill => ({
      date: bill.bill_date,
      billNumber: bill.bill_number,
      items: bill.lines.map(line => ({
        code: line.product.code,
        name: line.product.name,
        quantity: line.quantity,
      })),
      amount: bill.total_amount,
      channel: bill.channel,
    }));
  }

  /**
   * How many times, when, and at what price this specific customer has
   * bought this specific product before - shown live in the invoice
   * product picker as the user arrows through the product list.
   */
  async getProductPurchaseHistory(
    organizationId: number,
    customerId: number,
    productId: number,
    limit = 5,
  ) {
    const lines = await this.prisma.billLine.findMany({
      where: {
        organizationId,
        productId,
        bill: {
          customerId,
          isActive: true,
        },
      },
      include: {
        bill: {
          select: { bill_number: true, bill_date: true },
        },
      },
      orderBy: {
        bill: { bill_date: 'desc' },
      },
      take: limit,
    });

    return lines.map(line => ({
      date: line.bill.bill_date,
      billNumber: line.bill.bill_number,
      quantity: line.quantity,
      unitPrice: line.unit_price,
    }));
  }
}
