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

export interface CustomerSearchResult {
  id: number;
  name: string;
  customerType: string;
  phone: string;
  email: string;
  creditLimit: number;
}

// The fields a free-text search bar sweeps for this entity. Any word of the
// query may match any of them, which is what lets a code and a name be typed
// together in either order.
const FREE_TEXT_FIELDS = ['name', 'phone', 'email', 'address', 'city'];

@Injectable()
export class CustomersSearchService {
  constructor(
    private prisma: PrismaService,
    private filterService: FilterService,
  ) {}

  /**
   * Search customers with filters
   * Supports fuzzy matching on name
   */
  async search(
    organizationId: number,
    request: SearchRequestDto,
  ): Promise<FilterResponseDto<CustomerSearchResult>> {
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
      const allowedSortFields = ['name', 'customerType', 'createdAt'];
      if (allowedSortFields.includes(request.sortBy)) {
        orderBy = { [request.sortBy]: request.sortOrder || 'asc' };
      }
    }

    // Execute query
    const skip = request.skip || 0;
    const take = request.take || 20;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: {
          id: true,
          name: true,
          customerType: true,
          phone: true,
          email: true,
          creditLimit: true,
        },
        skip,
        take,
        orderBy,
      }),
      this.prisma.customer.count({ where }),
    ]);

    // Format results
    const data: CustomerSearchResult[] = customers.map((customer: any) => ({
      id: customer.id,
      name: customer.name,
      customerType: customer.customerType || 'N/A',
      phone: customer.phone || 'N/A',
      email: customer.email || 'N/A',
      creditLimit: customer.creditLimit || 0,
    }));

    return this.filterService.buildPaginatedResponse(data, total, skip, take);
  }

  /**
   * Get unique values for a column
   */
  async getColumnValues(organizationId: number, columnName: string): Promise<ColumnValueDto[]> {
    this.validateColumnName(columnName);

    switch (columnName) {
      case 'name':
        return this.getCustomerNames(organizationId);
      case 'customerType':
        return this.getCustomerTypes(organizationId);
      default:
        return [];
    }
  }

  private async getCustomerNames(organizationId: number): Promise<ColumnValueDto[]> {
    const results = await this.prisma.customer.findMany({
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

  private async getCustomerTypes(organizationId: number): Promise<ColumnValueDto[]> {
    const results = await this.prisma.customer.findMany({
      where: { organizationId, isActive: true },
      select: { customerType: true },
      distinct: ['customerType'],
      orderBy: { customerType: 'asc' },
    });

    return results
      .filter((r: any) => r.customerType)
      .map((r: any) => ({
        value: r.customerType,
        label: r.customerType,
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
      const mappedFilter = { ...filter };

      // Map field names to actual database columns
      switch (filter.field) {
        case 'customer_type':
          mappedFilter.field = 'customerType';
          break;
        case 'credit_limit':
          mappedFilter.field = 'creditLimit';
          break;
      }

      const condition = this.buildCondition(mappedFilter);
      if (condition) {
        where[mappedFilter.field] = condition;
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
    if (!isFieldAllowed('customers', columnName)) {
      throw new BadRequestException(`Field '${columnName}' is not available for customers search`);
    }
  }

  private validateFilter(fieldName: string, operator: FilterOperator): void {
    try {
      const allowed = getAllowedOperators('customers', fieldName);
      if (!allowed.includes(operator)) {
        throw new BadRequestException(
          `Operator '${operator}' is not allowed for field '${fieldName}'`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invalid field '${fieldName}' for customers search`);
    }
  }
}
