import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { FilterService } from '@common/services/filter.service';
import {
  SearchRequestDto,
  FilterResponseDto,
  FilterOperator,
  ColumnValueDto,
} from '@common/dto/filter.dto';
import { getAllowedOperators, isFieldAllowed } from '@common/config/filter-config';

export interface InventorySearchResult {
  id: number;
  stockId: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  dateReceived: string;
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

    // Build where clause with field mapping
    const filters = [];
    if (request.primaryFilter) {
      filters.push(request.primaryFilter);
    }
    if (request.columnFilters) {
      filters.push(...request.columnFilters);
    }

    const whereBase = this.buildWhereClauses(filters);
    const where = {
      ...whereBase,
      organizationId,
    };

    // Build sort
    let orderBy: any = { updatedAt: 'desc' };
    if (request.sortBy) {
      const allowedSortFields = ['quantity', 'dateReceived', 'updatedAt'];
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
      stockId: `INV-${inv.id}`,
      productName: 'N/A',
      warehouseName: inv.warehouse?.name || 'N/A',
      quantity: inv.available,
      dateReceived: inv.updatedAt.toISOString().split('T')[0],
    }));

    return this.filterService.buildPaginatedResponse(data, total, skip, take);
  }

  /**
   * Get unique values for a column
   */
  async getColumnValues(organizationId: number, columnName: string): Promise<ColumnValueDto[]> {
    this.validateColumnName(columnName);

    switch (columnName) {
      case 'productName':
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

  /**
   * Build where clauses with field name mapping
   */
  private buildWhereClauses(filters: any[]): any {
    if (!filters || filters.length === 0) {
      return {};
    }

    const where: any = {};

    for (const filter of filters) {
      switch (filter.field) {
        case 'productName':
          // Skip productName as product relationship is not available in Inventory
          continue;

        case 'warehouse':
          // Filter by warehouse relationship
          const warehouseCondition = this.buildCondition(filter);
          if (warehouseCondition) {
            where.warehouse = { is: { name: warehouseCondition } };
          }
          break;

        case 'quantity':
          // Map to available quantity
          const quantityCondition = this.buildCondition(filter);
          if (quantityCondition) {
            where.available = quantityCondition;
          }
          break;

        case 'dateReceived':
          // Skip dateReceived as it's not a field on Inventory
          continue;

        case 'stockId':
          // Skip stockId as it's generated (INV-{id})
          continue;

        default:
          const condition = this.buildCondition(filter);
          if (condition) {
            where[filter.field] = condition;
          }
      }
    }

    return where;
  }

  /**
   * Build a single filter condition
   */
  private buildCondition(filter: any): any {
    const { operator, value } = filter;

    switch (operator) {
      case 'equals':
        return { equals: value };
      case 'doesNotEqual':
        return { not: value };
      case 'contains':
        return { contains: value, mode: 'insensitive' };
      case 'doesNotContain':
        return { not: { contains: value, mode: 'insensitive' } };
      case 'beginsWith':
        return { startsWith: value, mode: 'insensitive' };
      case 'endsWith':
        return { endsWith: value, mode: 'insensitive' };
      case 'in':
        return { in: Array.isArray(value) ? value : [value] };
      case 'notIn':
        return { notIn: Array.isArray(value) ? value : [value] };
      case 'gt':
        return { gt: Number(value) };
      case 'gte':
        return { gte: Number(value) };
      case 'lt':
        return { lt: Number(value) };
      case 'lte':
        return { lte: Number(value) };
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return { gte: Number(value[0]), lte: Number(value[1]) };
        }
        break;
      case 'isLike':
        // Fuzzy match - treat as contains search
        return { contains: value as string, mode: 'insensitive' };
      case 'isNotLike':
        // Fuzzy match negation
        return { not: { contains: value as string, mode: 'insensitive' } };
    }
    return null;
  }

  private validateColumnName(columnName: string): void {
    if (!isFieldAllowed('stock', columnName)) {
      throw new BadRequestException(`Field '${columnName}' is not available for stock search`);
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
      throw new BadRequestException(`Invalid field '${fieldName}' for stock search`);
    }
  }
}
