import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: number, createWarehouseDto: CreateWarehouseDto) {
    const slug =
      createWarehouseDto.slug ||
      createWarehouseDto.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const existing = await this.prisma.warehouse.findUnique({
      where: {
        organizationId_slug: { organizationId, slug },
      },
    });

    if (existing) {
      throw new BadRequestException(`Warehouse with slug '${slug}' already exists`);
    }

    return this.prisma.warehouse.create({
      data: {
        organizationId,
        name: createWarehouseDto.name,
        slug,
        location: createWarehouseDto.location,
      },
    });
  }

  async getStockByProduct(organizationId: number, productId: number) {
    const inventory = await this.prisma.inventory.findMany({
      where: {
        organizationId,
        productId,
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return inventory.map(inv => ({
      warehouseId: inv.warehouseId,
      warehouseName: inv.warehouse.name,
      physical_on_hand: inv.physical_on_hand,
      reserved: inv.reserved,
      available: inv.physical_on_hand - inv.reserved,
    }));
  }

  async getAll(organizationId: number) {
    return this.prisma.warehouse.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
