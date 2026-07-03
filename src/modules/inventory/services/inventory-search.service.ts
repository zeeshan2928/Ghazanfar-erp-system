import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { FilterService } from '@common/services/filter.service';
import {
  SearchRequestDto,
  FilterResponseDto,
  FilterOperator,
  ColumnValueDto,
} from '@common/dto/filter.dto';
import {
  getAllowedOperators,
  isFieldAllowed,
} from '@common/config/filter-config';

export interface InventorySearchResult {
  id: number;
  stock_id: string;
  product_name: string;
  warehouse_name: string;
  quantity: number;
  date_received: string;
}

@Injectable()
export class InventorySearchService {
  constructor(
    private prisma: PrismaService,
    private filterService: FilterService,
  ) {}

  /**
   * Search inventory with filters
   */
  async search(
    organizationId: number,
    request: SearchRequestDto,
  ): Promise<FilterResponseDto<InventorySearchResult>> {
    // Validate filters
    if (request.primaryFilter) {
      this.validateFilter(request.primaryFilter.field, request.primaryFilter.operator);
    }

    if (request.columnFilters) {
      for (const filter of request.columnFilters) {
        this.validateFilter(filter.field, filter.operator);
      }
    }

    // Build where clause
    const filters = [];
    if (request.primaryFilter) {
      filters.push(request.primaryFilter);
    }
    if (request.columnFilters) {
      filters.push(...request.columnFilters);
    }

    const where = {
      ...this.filterService.buildWhereClause(filters),
      organizationId,
    };

    // Build sort
    let orderBy: any = { createdAt: 'desc' };
    if (request.sortBy) {
      const allowedSortFields = ['quantity', 'date_received', 'createdAt'];
      if (allowedSortFields.includes(request.sortBy)) {
        orderBy = { [request.sortBy]: request.sortOrder || 'asc' };
      }
    }

    // Execute query
    const skip = request.skip || 0;
    const take = request.take || 20;

    const [inventories, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          product: { select: { name: true } },
          warehouse: { select: { name: true } },
        },
        skip,
        take,
        orderBy,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    // Format results
    const data: InventorySearchResult[] = inventories.map((inv: any) => ({
      id: inv.id,
      stock_id: `INV-${inv.id}`,
      product_name: inv.product?.name || 'N/A',
      warehouse_name: inv.warehouse?.name || 'N/A',
      quantity: inv.quantity,
      date_received: inv.createdAt.toISOString().split('T')[0],
    }));

    return this.filterService.buildPaginatedResponse(data, total, skip, take);
  }

  /**
   * Get unique values for a column
   */
  async getColumnValues(
    organizationId: number,
    columnName: string,
  ): Promise<ColumnValueDto[]> {
    this.validateColumnName(columnName);

    switch (columnName) {
      case 'product_name':
        return this.getProductNames(organizationId);
      case 'warehouse':
        return this.getWarehouseNames(organizationId);
      default:
        return [];
    }
  }

  private async getProductNames(organizationId: number): Promise<ColumnValueDto[]> {
    const distinctProducts = await this.prisma.inventory.findMany({
      where: { organizationId },
      select: { productId: true },
      distinct: ['productId'],
      take: 100,
    });

    const productIds = distinctProducts.map((r: any) => r.productId).filter(Boolean);
    if (productIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return products.map((p: any) => ({
      value: p.name,
      label: p.name,
    }));
  }

  private async getWarehouseNames(organizationId: number): Promise<ColumnValueDto[]> {
    const distinctWarehouses = await this.prisma.inventory.findMany({
      where: { organizationId },
      select: { warehouseId: true },
      distinct: ['warehouseId'],
      take: 100,
    });

    const warehouseIds = distinctWarehouses.map((r: any) => r.warehouseId).filter(Boolean);
    if (warehouseIds.length === 0) return [];

    const warehouses = await this.prisma.warehouse.findMany({
      where: { id: { in: warehouseIds } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return warehouses.map((w: any) => ({
      value: w.name,
      label: w.name,
    }));
  }

  private validateColumnName(columnName: string): void {
    if (!isFieldAllowed('stock', columnName)) {
      throw new BadRequestException(
        `Field '${columnName}' is not available for stock search`,
      );
    }
  }

  private validateFilter(fieldName: string, operator: FilterOperator): void {
    try {
      const allowed = getAllowedOperators('stock', fieldName);
      if (!allowed.includes(operator)) {
        throw new BadRequestException(
          `Operator '${operator}' is not allowed for field '${fieldName}'`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Invalid field '${fieldName}' for stock search`,
      );
    }
  }
}
