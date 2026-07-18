import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(organizationId: number, data: CreateCustomerDto) {
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
        creditLimit: data.creditLimit ?? 0,
        isActive: true,
      },
    });
  }

  async update(organizationId: number, customerId: number, data: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Same empty-string-vs-null distinction as createCustomer: an empty
    // string would collide with the @@unique([organizationId, email])
    // constraint the moment a second customer clears their email. undefined
    // (field not sent) leaves the column untouched.
    const email = data.email === '' ? null : data.email;

    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        name: data.name,
        phone: data.phone,
        email,
        address: data.address,
        city: data.city,
        customerType: data.customerType,
        creditLimit: data.creditLimit,
      },
    });
  }

  // Soft-delete, same convention as Vendor.deactivate() - deactivated
  // customers stop appearing in search (customers-search.service.ts already
  // filters isActive: true) but the record and its bill history stay intact.
  async deactivate(organizationId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data: { isActive: false },
    });
  }

  // Outstanding = unpaid balance across every non-cancelled bill. Used by the
  // invoice screen's credit-limit indicator so a salesman can see exposure
  // before adding another sale for this customer.
  async getCreditStatus(organizationId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const bills = await this.prisma.bill.findMany({
      where: { organizationId, customerId, status: { not: 'CANCELLED' } },
      select: { total_amount: true, amount_paid: true },
    });

    const outstandingBalance = bills.reduce(
      (sum, bill) => sum + Math.max(0, bill.total_amount - bill.amount_paid),
      0,
    );

    return {
      creditLimit: customer.creditLimit,
      outstandingBalance,
      availableCredit: customer.creditLimit - outstandingBalance,
    };
  }

  // Full running-balance statement across every non-cancelled bill, oldest
  // first - the "customer ledger" opened from the invoice screen.
  async getLedger(organizationId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const bills = await this.prisma.bill.findMany({
      where: { organizationId, customerId, status: { not: 'CANCELLED' } },
      orderBy: { bill_date: 'asc' },
      select: {
        id: true,
        bill_number: true,
        bill_date: true,
        total_amount: true,
        amount_paid: true,
        status: true,
      },
    });

    let runningBalance = 0;
    const entries = bills.map(bill => {
      const outstanding = bill.total_amount - bill.amount_paid;
      runningBalance += outstanding;
      return {
        billId: bill.id,
        billNumber: bill.bill_number,
        billDate: bill.bill_date,
        totalAmount: bill.total_amount,
        amountPaid: bill.amount_paid,
        outstanding,
        runningBalance,
        status: bill.status,
      };
    });

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        creditLimit: customer.creditLimit,
      },
      entries,
      totalOutstanding: runningBalance,
    };
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
