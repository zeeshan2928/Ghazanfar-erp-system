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
        contactPerson: createDto.contact_person,
        address: createDto.address,
      },
      include: {
        products: true,
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
          products: true,
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
        products: true,
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
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
      data: updateDto,
      include: { products: true },
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
          unitPrice: addDto.unit_price,
          leadTimeDays: addDto.lead_time_days || 7,
          lastPurchaseDate: new Date(),
        },
      });
    }

    // Create new relationship
    return this.prisma.productVendor.create({
      data: {
        organizationId,
        productId: addDto.productId,
        vendorId: vendorId,
        unitPrice: addDto.unit_price,
        leadTimeDays: addDto.lead_time_days || 7,
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
