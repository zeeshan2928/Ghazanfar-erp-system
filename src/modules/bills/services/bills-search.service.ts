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

export interface BillSearchResult {
  id: number;
  billNumber: string;
  customerName: string;
  amount: number;
  billDate: string;
  status: string;
  paymentMethod: string;
  employeeName: string;
  remarks: string;
}

@Injectable()
export class BillsSearchService {
  constructor(
    private prisma: PrismaService,
    private filterService: FilterService,
  ) {}

  /**
   * Search bills with filters
   * Supports primary search (billNumber) + column filters
   */
  async search(
    organizationId: number,
    request: SearchRequestDto,
  ): Promise<FilterResponseDto<BillSearchResult>> {
    // Validate filters against allowed operators
    if (request.primaryFilter) {
      this.validateFilter(request.primaryFilter.field, request.primaryFilter.operator);
    }

    if (request.columnFilters) {
      for (const filter of request.columnFilters) {
        this.validateFilter(filter.field, filter.operator);
      }
    }

    // Build where clause from filters
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

    // Build sort - only allow specific fields to prevent injection
    let orderBy: any = { createdAt: 'desc' };
    if (request.sortBy) {
      const allowedSortFields = [
        'billNumber',
        'billDate',
        'totalAmount',
        'status',
        'createdAt',
      ];
      if (allowedSortFields.includes(request.sortBy)) {
        orderBy = { [request.sortBy]: request.sortOrder || 'asc' };
      }
    }

    // Execute query with pagination
    const skip = request.skip || 0;
    const take = request.take || 20;

    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          createdByUser: { select: { firstName: true, lastName: true } },
        },
        skip,
        take,
        orderBy,
      }),
      this.prisma.bill.count({ where }),
    ]);

    // Format results
    const data: BillSearchResult[] = bills.map((bill: any) => ({
      id: bill.id,
      billNumber: bill.billNumber,
      customerName: bill.customer?.name || 'N/A',
      amount: bill.totalAmount,
      billDate: bill.billDate.toISOString().split('T')[0],
      status: bill.status,
      paymentMethod: bill.paymentMethod || 'N/A',
      employeeName: `${bill.createdByUser?.firstName || ''} ${bill.createdByUser?.lastName || ''}`.trim(),
      remarks: bill.remarks || '',
    }));

    return this.filterService.buildPaginatedResponse(data, total, skip, take);
  }

  /**
   * Get unique values for a column (for filter dropdowns)
   */
  async getColumnValues(
    organizationId: number,
    columnName: string,
  ): Promise<ColumnValueDto[]> {
    this.validateColumnName(columnName);

    switch (columnName) {
      case 'customerName':
        return this.getCustomerValues(organizationId);
      case 'employeeName':
        return this.getEmployeeValues(organizationId);
      case 'billNumber':
        return this.getBillNumberValues(organizationId);
      case 'status':
        return this.getStatusValues(organizationId);
      case 'paymentMethod':
        return this.getPaymentMethodValues(organizationId);
      default:
        return [];
    }
  }

  /**
   * Get distinct bill numbers
   */
  private async getBillNumberValues(
    organizationId: number,
  ): Promise<ColumnValueDto[]> {
    const results = await this.prisma.bill.findMany({
      where: { organizationId },
      select: { billNumber: true },
      distinct: ['billNumber'],
      orderBy: { billNumber: 'asc' },
      take: 100,
    });

    return results
      .filter((r: any) => r.billNumber != null)
      .map((r: any) => ({
        value: r.billNumber,
        label: r.billNumber,
      }));
  }

  /**
   * Get distinct order statuses
   */
  private async getStatusValues(
    organizationId: number,
  ): Promise<ColumnValueDto[]> {
    const results = await this.prisma.bill.findMany({
      where: { organizationId },
      select: { status: true },
      distinct: ['status'],
      orderBy: { status: 'asc' },
    });

    return results
      .filter((r: any) => r.status != null)
      .map((r: any) => ({
        value: r.status,
        label: r.status,
      }));
  }

  /**
   * Get distinct payment methods
   */
  private async getPaymentMethodValues(
    organizationId: number,
  ): Promise<ColumnValueDto[]> {
    const results = await this.prisma.bill.findMany({
      where: { organizationId, paymentMethod: { not: null } },
      select: { paymentMethod: true },
      distinct: ['paymentMethod'],
      orderBy: { paymentMethod: 'asc' },
      take: 100,
    });

    return results
      .filter((r: any) => r.paymentMethod != null)
      .map((r: any) => ({
        value: r.paymentMethod,
        label: r.paymentMethod,
      }));
  }

  /**
   * Get customer names for dropdown filter
   */
  private async getCustomerValues(
    organizationId: number,
  ): Promise<ColumnValueDto[]> {
    const distinctCustomers = await this.prisma.bill.findMany({
      where: { organizationId },
      select: { customerId: true },
      distinct: ['customerId'],
      orderBy: { customerId: 'asc' },
      take: 100,
    });

    const customerIds = distinctCustomers
      .map((r: any) => r.customerId)
      .filter(Boolean);

    if (customerIds.length === 0) {
      return [];
    }

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return customers.map((c: any) => ({
      value: c.name,
      label: c.name,
    }));
  }

  /**
   * Get employee names for dropdown filter
   */
  private async getEmployeeValues(
    organizationId: number,
  ): Promise<ColumnValueDto[]> {
    const distinctEmployees = await this.prisma.bill.findMany({
      where: { organizationId },
      select: { createdBy: true },
      distinct: ['createdBy'],
      orderBy: { createdBy: 'asc' },
      take: 100,
    });

    const userIds = distinctEmployees
      .map((r: any) => r.createdBy)
      .filter(Boolean);

    if (userIds.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    });

    return users.map((u: any) => ({
      value: `${u.firstName} ${u.lastName}`.trim(),
      label: `${u.firstName} ${u.lastName}`.trim(),
    }));
  }

  /**
   * Build where clauses with field name mapping
   * Maps filter field names to actual database column names
   */
  private buildWhereClauses(filters: any[]): any {
    if (!filters || filters.length === 0) {
      return {};
    }

    const where: any = {};

    for (const filter of filters) {
      switch (filter.field) {
        case 'amount':
          // Map amount to totalAmount field
          const amountCondition = this.buildCondition(filter);
          if (amountCondition) {
            where.totalAmount = amountCondition;
          }
          break;

        case 'customerName':
          // Filter by customer relationship
          const customerCondition = this.buildCustomerNameCondition(filter);
          if (customerCondition) {
            where.customer = { is: customerCondition };
          }
          break;

        case 'employeeName':
          // Filter by createdByUser relationship
          const employeeCondition = this.buildEmployeeNameCondition(filter);
          if (employeeCondition) {
            where.createdByUser = { is: employeeCondition };
          }
          break;

        default:
          // Direct field mapping for other fields
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
        return { contains: (value as string), mode: 'insensitive' };
      case 'isNotLike':
        // Fuzzy match negation
        return { not: { contains: (value as string), mode: 'insensitive' } };
    }
    return null;
  }

  /**
   * Build condition for customer name filtering
   */
  private buildCustomerNameCondition(filter: any): any {
    const condition = this.buildCondition(filter);
    if (condition && filter.field === 'customerName') {
      return { name: condition };
    }
    return condition;
  }

  /**
   * Build condition for employee name filtering
   */
  private buildEmployeeNameCondition(filter: any): any {
    const value = filter.value || '';
    const operator = filter.operator;

    // For employee names, match firstName or lastName
    const condition = this.buildCondition(filter);

    if (!condition) return null;

    if (operator === 'in') {
      return {
        OR: [
          { firstName: { in: value } },
          { lastName: { in: value } },
        ],
      };
    }

    if (operator === 'notIn') {
      return {
        AND: [
          { firstName: { notIn: value } },
          { lastName: { notIn: value } },
        ],
      };
    }

    // For contains/like operators
    return {
      OR: [
        { firstName: condition },
        { lastName: condition },
      ],
    };
  }

  /**
   * Validate that a field is allowed for bills
   */
  private validateColumnName(columnName: string): void {
    if (!isFieldAllowed('bills', columnName)) {
      throw new BadRequestException(
        `Field '${columnName}' is not available for bills search`,
      );
    }
  }

  /**
   * Validate that an operator is allowed for a field
   */
  private validateFilter(fieldName: string, operator: FilterOperator): void {
    try {
      const allowed = getAllowedOperators('bills', fieldName);
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
        `Invalid field '${fieldName}' for bills search`,
      );
    }
  }
}
