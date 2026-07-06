import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/create-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: number, createDto: CreateCategoryDto) {
    return this.prisma.productCategory.create({
      data: {
        organizationId,
        name: createDto.name,
        description: createDto.description,
      },
    });
  }

  async findAll(organizationId: number, includeInactive = false) {
    return this.prisma.productCategory.findMany({
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
    return this.prisma.productCategory.findFirst({
      where: { id, organizationId },
      include: {
        products: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async update(organizationId: number, id: number, updateDto: UpdateCategoryDto) {
    return this.prisma.productCategory.update({
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
    return this.prisma.productCategory.delete({
      where: { id },
    });
  }
}
