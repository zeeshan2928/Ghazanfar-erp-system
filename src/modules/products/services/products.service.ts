import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createProduct(organizationId: number, data: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        organizationId,
        code: data.code,
        name: data.name,
        cost_price: data.costPrice ?? data.cost_price ?? 0,
        categoryId: data.categoryId,
        brandId: data.brandId,
        isActive: true,
      },
    });
  }

  async getById(organizationId: number, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async getPurchaseHistory(organizationId: number, productId: number, limit = 5) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const purchases = await this.prisma.purchaseHistory.findMany({
      where: {
        organizationId,
        productId,
      },
      orderBy: { po_date: 'desc' },
      take: limit,
      select: {
        id: true,
        vendor_name: true,
        po_number: true,
        po_date: true,
        quantity_purchased: true,
        cost_price: true,
      },
    });

    return purchases.map(p => ({
      vendor: p.vendor_name,
      poNumber: p.po_number,
      poDate: p.po_date,
      quantity: p.quantity_purchased,
      costPrice: p.cost_price,
    }));
  }
}
