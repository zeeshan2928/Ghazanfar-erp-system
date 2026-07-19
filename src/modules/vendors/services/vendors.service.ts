import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateVendorDto, UpdateVendorDto, AddProductToVendorDto } from '../dto/vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: number, createDto: CreateVendorDto) {
    const existing = await this.prisma.vendor.findFirst({
      where: {
        organizationId,
        name: createDto.name,
      },
    });

    if (existing) {
      throw new BadRequestException(`Vendor "${createDto.name}" already exists`);
    }

    return this.prisma.vendor.create({
      data: {
        organizationId,
        name: createDto.name,
        email: createDto.email,
        phone: createDto.phone,
        contact_person: createDto.contactPerson,
        address: createDto.address,
        cityId: createDto.cityId ?? null,
        paymentTerms: createDto.paymentTerms,
        creditLimit: createDto.creditLimit ?? 0,
        taxNumber: createDto.taxNumber,
        tags: createDto.tags ?? [],
      },
      include: {
        Product: true,
        city: { include: { province: true } },
      },
    });
  }

  async list(organizationId: number, skip = 0, take = 10) {
    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where: { organizationId, isActive: true },
        skip,
        take,
        include: {
          Product: true,
          city: { include: { province: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendor.count({
        where: { organizationId, isActive: true },
      }),
    ]);

    return {
      data,
      total,
      page: Math.floor(skip / take) + 1,
      hasMore: skip + take < total,
    };
  }

  async getById(organizationId: number, vendorId: number) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, organizationId },
      include: {
        ProductVendor: { include: { product: true }, orderBy: { createdAt: 'desc' } },
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        city: { include: { province: true } },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async update(organizationId: number, vendorId: number, updateDto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, organizationId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        name: updateDto.name,
        email: updateDto.email,
        phone: updateDto.phone,
        contact_person: updateDto.contactPerson,
        address: updateDto.address,
        cityId: updateDto.cityId,
        paymentTerms: updateDto.paymentTerms,
        creditLimit: updateDto.creditLimit,
        taxNumber: updateDto.taxNumber,
        tags: updateDto.tags,
      },
      include: { ProductVendor: { include: { product: true } }, city: { include: { province: true } } },
    });
  }

  async addProduct(organizationId: number, vendorId: number, addDto: AddProductToVendorDto) {
    const [vendor, product] = await Promise.all([
      this.prisma.vendor.findFirst({
        where: { id: vendorId, organizationId },
      }),
      this.prisma.product.findFirst({
        where: { id: addDto.productId, organizationId },
      }),
    ]);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.productVendor.findFirst({
      where: {
        productId: addDto.productId,
        vendorId: vendorId,
      },
    });

    if (existing) {
      // Update existing relationship
      return this.prisma.productVendor.update({
        where: { id: existing.id },
        data: {
          unit_price: addDto.unitPrice,
          lead_time_days: addDto.leadTimeDays || 7,
          last_purchase_date: new Date(),
        },
      });
    }

    // Create new relationship
    return this.prisma.productVendor.create({
      data: {
        productId: addDto.productId,
        vendorId: vendorId,
        unit_price: addDto.unitPrice,
        lead_time_days: addDto.leadTimeDays || 7,
      },
    });
  }

  async removeProduct(organizationId: number, vendorId: number, productId: number) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, organizationId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const pv = await this.prisma.productVendor.findFirst({
      where: { productId, vendorId },
    });

    if (!pv) {
      throw new NotFoundException('Product-Vendor relationship not found');
    }

    await this.prisma.productVendor.delete({
      where: { id: pv.id },
    });

    return { message: 'Product removed from vendor' };
  }

  /**
   * On-time delivery %, average lead time, and price trend per product -
   * everything is derived from data that already exists (PurchaseOrder's
   * expected/actual delivery dates, PurchaseHistory rows keyed by vendor
   * name) rather than needing new tracking fields.
   */
  async getScorecard(organizationId: number, vendorId: number) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, organizationId } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const deliveredPOs = await this.prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        vendorId,
        status: { in: ['PARTIAL_RECEIVED', 'RECEIVED'] },
        actual_delivery_date: { not: null },
      },
      select: { po_number: true, expected_delivery_date: true, actual_delivery_date: true, createdAt: true },
    });

    let onTimeCount = 0;
    let totalLeadDays = 0;
    let leadDaysSamples = 0;

    for (const po of deliveredPOs) {
      if (po.expected_delivery_date && po.actual_delivery_date! <= po.expected_delivery_date) {
        onTimeCount++;
      }
      if (po.actual_delivery_date) {
        const days = Math.round((po.actual_delivery_date.getTime() - po.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        totalLeadDays += days;
        leadDaysSamples++;
      }
    }

    const onTimeDeliveryPercent = deliveredPOs.length > 0 ? Math.round((onTimeCount / deliveredPOs.length) * 100) : null;
    const averageLeadTimeDays = leadDaysSamples > 0 ? Math.round(totalLeadDays / leadDaysSamples) : null;

    const vendorProducts = await this.prisma.productVendor.findMany({
      where: { vendorId },
      include: { product: true },
    });

    const priceTrend = await Promise.all(
      vendorProducts.map(async pv => {
        const history = await this.prisma.purchaseHistory.findMany({
          where: { productId: pv.productId, organizationId, vendor_name: vendor.name },
          orderBy: { po_date: 'desc' },
          take: 10,
        });
        return {
          productId: pv.productId,
          productName: pv.product.name,
          currentPrice: pv.unit_price,
          history: history.map(h => ({ date: h.po_date, price: h.cost_price, poNumber: h.po_number, quantity: h.quantity_purchased })),
        };
      }),
    );

    return {
      vendorId,
      vendorName: vendor.name,
      totalDeliveredPOs: deliveredPOs.length,
      onTimeDeliveryPercent,
      averageLeadTimeDays,
      priceTrend,
    };
  }

  async deactivate(organizationId: number, vendorId: number) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, organizationId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { isActive: false },
    });
  }
}
