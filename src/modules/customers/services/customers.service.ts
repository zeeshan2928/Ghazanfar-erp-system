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
      orderBy: { billDate: 'desc' },
      take: limit,
    });

    return bills.map((bill) => ({
      date: bill.billDate,
      billNumber: bill.billNumber,
      items: bill.lines.map((line) => ({
        code: line.product.code,
        name: line.product.name,
        quantity: line.quantity,
      })),
      amount: bill.totalAmount,
      channel: bill.channel,
    }));
  }
}
