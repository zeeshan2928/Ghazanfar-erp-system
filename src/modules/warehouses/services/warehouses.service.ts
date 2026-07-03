import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

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
            slug: true,
          },
        },
      },
    });

    return inventory.map((inv) => ({
      warehouseId: inv.warehouseId,
      warehouseName: inv.warehouse.name,
      warehouseSlug: inv.warehouse.slug,
      physicalOnHand: inv.physical_on_hand,
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
