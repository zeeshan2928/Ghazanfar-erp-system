import { Injectable, BadRequestException } from '@nestjs/common';
import { expandMultiWordContains, tokenSearchWhere, isFuzzyOperator } from '@common/search/token-search';
import { PrismaService } from '@database/prisma.service';
import { FilterService } from '@common/services/filter.service';
import {
  SearchRequestDto,
  FilterResponseDto,
  FilterOperator,
  ColumnValueDto,
} from '@common/dto/filter.dto';
import { getAllowedOperators, isFieldAllowed } from '@common/config/filter-config';

export interface ProductSearchResult {
  id: number;
  name: string;
  code: string;
  brand_name: string;
  category_name: string;
  cost_price: number;
  stock_level: string;
  brand: { id: number; name: string } | null;
  category: { id: number; name: string } | null;
  totalStock: number;
  salePrice: number | null;
  commissionRate: number | null;
}

// The fields a free-text search bar sweeps for this entity. Any word of the
// query may match any of them, which is what lets a code and a name be typed
// together in either order.
const FREE_TEXT_FIELDS = ['name', 'code', 'description', 'brand.name', 'category.name'];

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

    // Build where clause with field mapping.
    //
    // The free-text search bar (primaryFilter, operator `isLike`) sweeps EVERY
    // searchable field of the record, not just the one column it nominates -
    // otherwise "1218 grind" finds nothing, because 1218 lives in `code` and
    // "grind" in `name`. An explicitly chosen COLUMN filter still means that
    // column, and is left alone.
    const freeText =
      request.primaryFilter && isFuzzyOperator(request.primaryFilter.operator)
        ? tokenSearchWhere(String(request.primaryFilter.value ?? ''), FREE_TEXT_FIELDS)
        : undefined;

    const filters = [];
    if (request.primaryFilter && !freeText) {
      filters.push(request.primaryFilter);
    }
    if (request.columnFilters) {
      filters.push(...request.columnFilters);
    }

    const whereBase = { ...this.buildWhereClauses(filters), ...(freeText ?? {}) };
    const where = {
      ...whereBase,
      organizationId,
      isActive: true,
    };

    // Build sort
    let orderBy: any = { createdAt: 'desc' };
    if (request.sortBy) {
      const fieldMap: any = {
        name: 'name',
        code: 'code',
        cost_price: 'cost_price',
        createdAt: 'createdAt',
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
        include: { brand: true, category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    const productIds = products.map((p: any) => p.id);
    const [stockByProduct, pricesByProduct, commissionsByProduct] = await Promise.all([
      this.getTotalStockByProduct(organizationId, productIds),
      this.getCurrentSalePriceByProduct(productIds),
      this.getCurrentCommissionByProduct(organizationId, productIds),
    ]);

    // Format results
    const data: ProductSearchResult[] = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      code: product.code,
      brand_name: product.brand?.name || 'N/A',
      category_name: product.category?.name || 'N/A',
      // cost_price is a Prisma Decimal object - convert explicitly so the
      // declared `number` type here is actually true, and so the JSON
      // response carries a real number rather than Decimal's toJSON() string.
      cost_price: Number(product.cost_price),
      stock_level: this.getStockLevel(stockByProduct.get(product.id) || 0),
      brand: product.brand ? { id: product.brand.id, name: product.brand.name } : null,
      category: product.category ? { id: product.category.id, name: product.category.name } : null,
      totalStock: stockByProduct.get(product.id) || 0,
      salePrice: pricesByProduct.get(product.id) ?? null,
      commissionRate: commissionsByProduct.get(product.id) ?? null,
    }));

    return this.filterService.buildPaginatedResponse(data, total, skip, take);
  }

  /** Sums `available` stock across every warehouse, per product. */
  private async getTotalStockByProduct(
    organizationId: number,
    productIds: number[],
  ): Promise<Map<number, number>> {
    if (productIds.length === 0) return new Map();
    const grouped = await this.prisma.inventory.groupBy({
      by: ['productId'],
      where: { organizationId, productId: { in: productIds } },
      _sum: { available: true },
    });
    return new Map(grouped.map((g: any) => [g.productId, g._sum.available || 0]));
  }

  /**
   * The invoice picker needs one representative "sale price" per product.
   * Uses the COUNTER/RETAIL price tier as the baseline shown in the picker -
   * the actual invoice can still price differently per channel/customer via
   * ProductPrice directly; this is just a display convenience.
   */
  private async getCurrentSalePriceByProduct(productIds: number[]): Promise<Map<number, number>> {
    if (productIds.length === 0) return new Map();
    const now = new Date();
    const prices = await this.prisma.productPrice.findMany({
      where: {
        productId: { in: productIds },
        channel: 'COUNTER',
        customerType: 'RETAIL',
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    const result = new Map<number, number>();
    for (const price of prices) {
      if (!result.has(price.productId)) {
        result.set(price.productId, price.price);
      }
    }
    return result;
  }

  private async getCurrentCommissionByProduct(
    organizationId: number,
    productIds: number[],
  ): Promise<Map<number, number>> {
    if (productIds.length === 0) return new Map();
    const now = new Date();
    const commissions = await this.prisma.productCommission.findMany({
      where: {
        organizationId,
        productId: { in: productIds },
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    const result = new Map<number, number>();
    for (const commission of commissions) {
      if (!result.has(commission.productId)) {
        result.set(commission.productId, Number(commission.commissionRate));
      }
    }
    return result;
  }

  /**
   * Get unique values for a column
   */
  async getColumnValues(organizationId: number, columnName: string): Promise<ColumnValueDto[]> {
    this.validateColumnName(columnName);

    switch (columnName) {
      case 'name':
        return this.getProductNames(organizationId);
      case 'code':
        return this.getProductCodes(organizationId);
      case 'brand':
        return this.getBrandValues(organizationId);
      case 'category':
        return this.getCategoryValues(organizationId);
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

  private async getBrandValues(organizationId: number): Promise<ColumnValueDto[]> {
    const brands = await this.prisma.brand.findMany({
      where: { organizationId, isActive: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    return brands.map((b: any) => ({ value: b.name, label: b.name }));
  }

  private async getCategoryValues(organizationId: number): Promise<ColumnValueDto[]> {
    const categories = await this.prisma.productCategory.findMany({
      where: { organizationId, isActive: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    return categories.map((c: any) => ({ value: c.name, label: c.name }));
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
      const condition = this.buildCondition({ ...filter });
      if (!condition) continue;

      // brand/category filter values are names (see getBrandValues/
      // getCategoryValues), so filter through the relation rather than a
      // scalar column.
      if (filter.field === 'brand') {
        where.brand = { name: condition };
      } else if (filter.field === 'category') {
        where.category = { name: condition };
      } else {
        where[filter.field] = condition;
      }
    }

    // The universal search rule: a query of several words matches when EVERY
    // word is present, in any order. Applied here, to the finished clause, so
    // the rule is stated once rather than inside each field-mapping switch.
    return expandMultiWordContains(where);
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
    if (!isFieldAllowed('products', columnName)) {
      throw new BadRequestException(`Field '${columnName}' is not available for products search`);
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
      throw new BadRequestException(`Invalid field '${fieldName}' for products search`);
    }
  }
}
