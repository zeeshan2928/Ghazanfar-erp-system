import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from '../dto/create-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: number, createDto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: {
        organizationId,
        name: createDto.name,
      },
    });
  }

  async findAll(organizationId: number, includeInactive = false) {
    return this.prisma.brand.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        products: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: number, id: number) {
    return this.prisma.brand.findFirst({
      where: { id, organizationId },
      include: {
        products: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async update(organizationId: number, id: number, updateDto: UpdateBrandDto) {
    return this.prisma.brand.update({
      where: { id },
      data: updateDto,
      include: {
        products: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async remove(organizationId: number, id: number) {
    return this.prisma.brand.delete({
      where: { id },
    });
  }
}
