import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

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

    return bills.map((bill) => ({
      date: bill.bill_date,
      billNumber: bill.bill_number,
      items: bill.lines.map((line) => ({
        code: line.product.code,
        name: line.product.name,
        quantity: line.quantity,
      })),
      amount: bill.total_amount,
      channel: bill.channel,
    }));
  }
}
