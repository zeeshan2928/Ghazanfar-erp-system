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

export interface CustomerSearchResult {
  id: number;
  name: string;
  customer_type: string;
  phone: string;
  email: string;
  credit_limit: number;
}

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
      customer_type: customer.customerType || 'N/A',
      phone: customer.phone || 'N/A',
      email: customer.email || 'N/A',
      credit_limit: customer.creditLimit || 0,
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
        return this.getCustomerNames(organizationId);
      case 'customer_type':
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

  private validateColumnName(columnName: string): void {
    if (!isFieldAllowed('customers', columnName)) {
      throw new BadRequestException(
        `Field '${columnName}' is not available for customers search`,
      );
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
      throw new BadRequestException(
        `Invalid field '${fieldName}' for customers search`,
      );
    }
  }
}
