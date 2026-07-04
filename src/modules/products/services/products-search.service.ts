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

export interface ProductSearchResult {
  id: number;
  name: string;
  code: string;
  brand_name: string;
  category_name: string;
  cost_price: number;
  stock_level: string;
}

@Injectable()
export class ProductsSearchService {
  constructor(
    private prisma: PrismaService,
    private filterService: FilterService,
  ) {}

  /**
   * Search products with filters
   * Supports fuzzy matching on name and code
   */
  async search(
    organizationId: number,
    request: SearchRequestDto,
  ): Promise<FilterResponseDto<ProductSearchResult>> {
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
      isActive: true,
    };

    // Build sort
    let orderBy: any = { createdAt: 'desc' };
    if (request.sortBy) {
      const fieldMap: any = {
        'name': 'name',
        'code': 'code',
        'cost_price': 'costPrice',
        'createdAt': 'createdAt'
      };
      const dbField = fieldMap[request.sortBy];
      if (dbField) {
        orderBy = { [dbField]: request.sortOrder || 'asc' };
      }
    }

    // Execute query
    const skip = request.skip || 0;
    const take = request.take || 20;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Format results
    const data: ProductSearchResult[] = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      code: product.code,
      brand_name: 'N/A',
      category_name: 'N/A',
      cost_price: product.costPrice,
      stock_level: this.getStockLevel(0), // TODO: fetch from inventory
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
      case 'name':
        return this.getProductNames(organizationId);
      case 'code':
        return this.getProductCodes(organizationId);
      case 'brand':
        return []; // Brand model not yet implemented
      case 'category':
        return []; // Category model not yet implemented
      case 'stock_level':
        return this.getStockLevelValues();
      default:
        return [];
    }
  }

  private async getProductNames(organizationId: number): Promise<ColumnValueDto[]> {
    const results = await this.prisma.product.findMany({
      where: { organizationId, isActive: true },
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
      take: 100,
    });

    return results.map((r: any) => ({
      value: r.name,
      label: r.name,
    }));
  }

  private async getProductCodes(organizationId: number): Promise<ColumnValueDto[]> {
    const results = await this.prisma.product.findMany({
      where: { organizationId, isActive: true },
      select: { code: true },
      distinct: ['code'],
      orderBy: { code: 'asc' },
      take: 100,
    });

    return results.map((r: any) => ({
      value: r.code,
      label: r.code,
    }));
  }

  private getStockLevelValues(): ColumnValueDto[] {
    return [
      { value: 'low', label: 'Low Stock' },
      { value: 'medium', label: 'Medium Stock' },
      { value: 'high', label: 'High Stock' },
      { value: 'out', label: 'Out of Stock' },
    ];
  }

  private getStockLevel(quantity: number): string {
    if (quantity === 0) return 'out';
    if (quantity <= 10) return 'low';
    if (quantity <= 50) return 'medium';
    return 'high';
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
      // Skip brand and category as they're not yet implemented
      if (filter.field === 'brand' || filter.field === 'category') {
        continue;
      }

      const condition = this.buildCondition({ ...filter });
      if (condition) {
        where[filter.field] = condition;
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
        return { contains: (value as string), mode: 'insensitive' };
      case 'isNotLike':
        // Fuzzy match negation
        return { not: { contains: (value as string), mode: 'insensitive' } };
    }
    return null;
  }

  private validateColumnName(columnName: string): void {
    if (!isFieldAllowed('products', columnName)) {
      throw new BadRequestException(
        `Field '${columnName}' is not available for products search`,
      );
    }
  }

  private validateFilter(fieldName: string, operator: FilterOperator): void {
    try {
      const allowed = getAllowedOperators('products', fieldName);
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
        `Invalid field '${fieldName}' for products search`,
      );
    }
  }
}
