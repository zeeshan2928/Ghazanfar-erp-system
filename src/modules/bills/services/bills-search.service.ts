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
  bill_number: string;
  customer_name: string;
  amount: number;
  bill_date: string;
  status: string;
  payment_method: string;
  employee_name: string;
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
   * Supports primary search (bill_number) + column filters
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

    const where = {
      ...this.filterService.buildWhereClause(filters),
      organizationId,
    };

    // Build sort - only allow specific fields to prevent injection
    let orderBy: any = { createdAt: 'desc' };
    if (request.sortBy) {
      const allowedSortFields = [
        'bill_number',
        'bill_date',
        'total_amount',
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
          created_by_user: { select: { firstName: true, lastName: true } },
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
      bill_number: bill.bill_number,
      customer_name: bill.customer?.name || 'N/A',
      amount: bill.total_amount,
      bill_date: bill.bill_date.toISOString().split('T')[0],
      status: bill.status,
      payment_method: bill.payment_method || 'N/A',
      employee_name: `${bill.created_by_user?.firstName || ''} ${bill.created_by_user?.lastName || ''}`.trim(),
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
      case 'customer_name':
        return this.getCustomerValues(organizationId);
      case 'employee_name':
        return this.getEmployeeValues(organizationId);
      case 'bill_number':
        return this.getBillNumberValues(organizationId);
      case 'status':
        return this.getStatusValues(organizationId);
      case 'payment_method':
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
      select: { bill_number: true },
      distinct: ['bill_number'],
      orderBy: { bill_number: 'asc' },
      take: 100,
    });

    return results
      .filter((r: any) => r.bill_number != null)
      .map((r: any) => ({
        value: r.bill_number,
        label: r.bill_number,
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
      where: { organizationId, payment_method: { not: null } },
      select: { payment_method: true },
      distinct: ['payment_method'],
      orderBy: { payment_method: 'asc' },
      take: 100,
    });

    return results
      .filter((r: any) => r.payment_method != null)
      .map((r: any) => ({
        value: r.payment_method,
        label: r.payment_method,
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
      select: { created_by: true },
      distinct: ['created_by'],
      orderBy: { created_by: 'asc' },
      take: 100,
    });

    const userIds = distinctEmployees
      .map((r: any) => r.created_by)
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
