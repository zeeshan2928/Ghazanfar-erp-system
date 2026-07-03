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

export interface PurchaseOrderSearchResult {
  id: number;
  po_number: string;
  vendor_name: string;
  status: string;
  created_date: string;
  amount: number;
  expected_delivery_date: string;
}

@Injectable()
export class PurchaseOrdersSearchService {
  constructor(
    private prisma: PrismaService,
    private filterService: FilterService,
  ) {}

  /**
   * Search purchase orders with filters
   */
  async search(
    organizationId: number,
    request: SearchRequestDto,
  ): Promise<FilterResponseDto<PurchaseOrderSearchResult>> {
    // Validate filters
    if (request.primaryFilter) {
      this.validateFilter(
        request.primaryFilter.field,
        request.primaryFilter.operator,
      );
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
      const allowedSortFields = ['po_number', 'status', 'createdAt'];
      if (allowedSortFields.includes(request.sortBy)) {
        orderBy = { [request.sortBy]: request.sortOrder || 'asc' };
      }
    }

    // Execute query
    const skip = request.skip || 0;
    const take = request.take || 20;

    const [pos, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: { select: { name: true } },
        },
        skip,
        take,
        orderBy,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    // Format results
    const data: PurchaseOrderSearchResult[] = pos.map((po: any) => ({
      id: po.id,
      po_number: po.po_number,
      vendor_name: po.vendor?.name || 'N/A',
      status: po.status,
      created_date: po.createdAt.toISOString().split('T')[0],
      amount: po.total_amount || 0,
      expected_delivery_date: po.expected_delivery_date
        ? po.expected_delivery_date.toISOString().split('T')[0]
        : 'N/A',
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
      case 'po_number':
        return this.getPoNumbers(organizationId);
      case 'vendor_name':
        return this.getVendorNames(organizationId);
      case 'status':
        return this.getStatuses(organizationId);
      default:
        return [];
    }
  }

  private async getPoNumbers(organizationId: number): Promise<ColumnValueDto[]> {
    const results = await this.prisma.purchaseOrder.findMany({
      where: { organizationId },
      select: { po_number: true },
      distinct: ['po_number'],
      orderBy: { po_number: 'asc' },
      take: 100,
    });

    return results.map((r: any) => ({
      value: r.po_number,
      label: r.po_number,
    }));
  }

  private async getVendorNames(organizationId: number): Promise<ColumnValueDto[]> {
    const results = await this.prisma.purchaseOrder.findMany({
      where: { organizationId },
      select: { vendor: { select: { name: true } } },
      distinct: ['vendorId'],
      orderBy: { vendorId: 'asc' },
      take: 100,
    });

    return results
      .filter((r: any) => r.vendor?.name)
      .map((r: any) => ({
        value: r.vendor.name,
        label: r.vendor.name,
      }));
  }

  private async getStatuses(organizationId: number): Promise<ColumnValueDto[]> {
    const results = await this.prisma.purchaseOrder.findMany({
      where: { organizationId },
      select: { status: true },
      distinct: ['status'],
      orderBy: { status: 'asc' },
    });

    return results.map((r: any) => ({
      value: r.status,
      label: r.status,
    }));
  }

  private validateColumnName(columnName: string): void {
    if (!isFieldAllowed('purchase_orders', columnName)) {
      throw new BadRequestException(
        `Field '${columnName}' is not available for purchase orders search`,
      );
    }
  }

  private validateFilter(fieldName: string, operator: FilterOperator): void {
    try {
      const allowed = getAllowedOperators('purchase_orders', fieldName);
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
        `Invalid field '${fieldName}' for purchase orders search`,
      );
    }
  }
}
