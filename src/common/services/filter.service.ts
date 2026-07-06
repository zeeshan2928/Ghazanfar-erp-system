import { Injectable } from '@nestjs/common';
import {
  FilterOperatorDto,
  FilterOperator,
  SearchRequestDto,
  FilterResponseDto,
  ColumnValueDto,
} from '../dto/filter.dto';

@Injectable()
export class FilterService {
  /**
   * Build Prisma where clause from filter specifications
   * Handles all operators and data types
   */
  buildWhereClause(filters: FilterOperatorDto[]): any {
    if (!filters || filters.length === 0) {
      return {};
    }

    const whereConditions: any = {};

    for (const filter of filters) {
      const condition = this.buildFilterCondition(filter);
      if (condition) {
        whereConditions[filter.field] = condition;
      }
    }

    return whereConditions;
  }

  /**
   * Build a single filter condition based on operator and data type
   */
  private buildFilterCondition(filter: FilterOperatorDto): any {
    const { operator, value } = filter;

    switch (operator) {
      // Text operators
      case FilterOperator.EQUALS:
        return { equals: value };

      case FilterOperator.DOES_NOT_EQUAL:
        return { not: value };

      case FilterOperator.CONTAINS:
        return { contains: value, mode: 'insensitive' };

      case FilterOperator.DOES_NOT_CONTAIN:
        return { not: { contains: value, mode: 'insensitive' } };

      case FilterOperator.BEGINS_WITH:
        return { startsWith: value, mode: 'insensitive' };

      case FilterOperator.ENDS_WITH:
        return { endsWith: value, mode: 'insensitive' };

      case FilterOperator.IS_LIKE:
        // Fuzzy search: PostgreSQL supports various approaches
        // Using 'contains' with word fragments for now
        return this.buildFuzzyMatch(value as string);

      case FilterOperator.IS_NOT_LIKE:
        return {
          not: this.buildFuzzyMatch(value as string),
        };

      // Numeric operators
      case FilterOperator.GT:
        return { gt: Number(value) };

      case FilterOperator.GTE:
        return { gte: Number(value) };

      case FilterOperator.LT:
        return { lt: Number(value) };

      case FilterOperator.LTE:
        return { lte: Number(value) };

      case FilterOperator.BETWEEN:
        if (Array.isArray(value) && value.length === 2) {
          return {
            gte: Number(value[0]),
            lte: Number(value[1]),
          };
        }
        return null;

      // List operators
      case FilterOperator.IN:
        return { in: Array.isArray(value) ? value : [value] };

      case FilterOperator.NOT_IN:
        return { notIn: Array.isArray(value) ? value : [value] };

      default:
        return null;
    }
  }

  /**
   * Build fuzzy match condition
   * Splits input into words and matches all words (order-independent)
   * Example: "mak mus" matches "Makki Crockery Lala Mausa"
   */
  private buildFuzzyMatch(searchTerm: string): any {
    if (!searchTerm) return null;

    const words = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);

    if (words.length === 0) return null;

    if (words.length === 1) {
      return { contains: words[0], mode: 'insensitive' };
    }

    // For multiple words, we need AND condition
    // Using Prisma's AND with multiple contains
    return {
      AND: words.map(word => ({
        contains: word,
        mode: 'insensitive',
      })),
    };
  }

  /**
   * Build complete query with organization scoping, filters, pagination, and sorting
   */
  async buildQuery<T>(
    model: any,
    request: SearchRequestDto,
    organizationId: number,
  ): Promise<{ data: T[]; total: number }> {
    const filters: FilterOperatorDto[] = [];

    // Add primary filter if provided
    if (request.primaryFilter) {
      filters.push(request.primaryFilter);
    }

    // Add column filters if provided
    if (request.columnFilters && request.columnFilters.length > 0) {
      filters.push(...request.columnFilters);
    }

    // Always scope to organization
    const where = {
      ...this.buildWhereClause(filters),
      organizationId,
    };

    // Build sort
    const orderBy = request.sortBy
      ? { [request.sortBy]: request.sortOrder || 'asc' }
      : { createdAt: 'desc' };

    // Execute query with pagination
    const skip = request.skip || 0;
    const take = request.take || 20;

    const [data, total] = await Promise.all([
      model.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      model.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get unique values for a column (for filter dropdown)
   * Used in column filter modals
   */
  async getColumnValues(
    model: any,
    columnName: string,
    organizationId: number,
    limit: number = 100,
  ): Promise<ColumnValueDto[]> {
    const results = await model.findMany({
      where: { organizationId },
      select: { [columnName]: true },
      distinct: [columnName],
      take: limit,
      orderBy: { [columnName]: 'asc' },
    });

    return results.map((row: any) => {
      const value = row[columnName];
      return {
        value,
        label: this.formatLabel(value),
      };
    });
  }

  /**
   * Format a value for display in dropdowns
   */
  private formatLabel(value: any): string {
    if (value === null || value === undefined) {
      return '(None)';
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    return String(value);
  }

  /**
   * Get values with counts for intelligent filter display
   */
  async getColumnValuesWithCounts(
    model: any,
    columnName: string,
    organizationId: number,
    limit: number = 100,
  ): Promise<ColumnValueDto[]> {
    const results = await model.groupBy({
      by: [columnName],
      where: { organizationId },
      _count: true,
      orderBy: { _count: { _all: 'desc' } },
      take: limit,
    });

    return results.map((row: any) => ({
      value: row[columnName],
      label: this.formatLabel(row[columnName]),
      count: row._count,
    }));
  }

  /**
   * Validate filter against allowed operators for a field
   */
  validateFilter(filter: FilterOperatorDto, allowedOperators: FilterOperator[]): boolean {
    return allowedOperators.includes(filter.operator);
  }

  /**
   * Convert search request to paginated response
   */
  buildPaginatedResponse<T>(
    data: T[],
    total: number,
    skip: number,
    take: number,
  ): FilterResponseDto<T> {
    return {
      data,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }
}
