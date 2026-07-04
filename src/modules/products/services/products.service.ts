import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getPurchaseHistory(organizationId: number, productId: number, limit = 5) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const purchases = await this.prisma.purchaseHistory.findMany({
      where: {
        organizationId,
        productId,
      },
      orderBy: { poDate: 'desc' },
      take: limit,
      select: {
        id: true,
        vendorName: true,
        poNumber: true,
        poDate: true,
        quantityPurchased: true,
        costPrice: true,
      },
    });

    return purchases.map((p) => ({
      vendor: p.vendorName,
      poNumber: p.poNumber,
      poDate: p.poDate,
      quantity: p.quantityPurchased,
      costPrice: p.costPrice,
    }));
  }
}
