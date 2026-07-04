import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrdersSearchService } from './purchase-orders-search.service';
import { FilterService } from '@common/services/filter.service';
import { PrismaService } from '@database/prisma.service';
import {
  FilterOperator,
  DataType,
  SearchRequestDto,
} from '@common/dto/filter.dto';
import { BadRequestException } from '@nestjs/common';

describe('PurchaseOrdersSearchService', () => {
  let service: PurchaseOrdersSearchService;

  const mockPrismaService = {
    purchaseOrder: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockPurchaseOrders = [
    {
      id: 1,
      po_number: 'PO-2026-0001',
      vendorId: 1,
      status: 'PENDING',
      total_amount: 50000,
      expected_delivery_date: new Date('2026-07-15'),
      createdAt: new Date('2026-07-01'),
      vendor: { name: 'Supplier A' },
    },
    {
      id: 2,
      po_number: 'PO-2026-0002',
      vendorId: 2,
      status: 'APPROVED',
      total_amount: 75000,
      expected_delivery_date: new Date('2026-07-20'),
      createdAt: new Date('2026-07-02'),
      vendor: { name: 'Supplier B' },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersSearchService,
        FilterService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PurchaseOrdersSearchService>(
      PurchaseOrdersSearchService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should search purchase orders without filters', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(
        mockPurchaseOrders,
      );
      mockPrismaService.purchaseOrder.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 1 }),
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should search purchase orders with po_number filter', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'po_number',
          operator: FilterOperator.CONTAINS,
          value: 'PO-2026',
          dataType: DataType.TEXT,
        },
        skip: 0,
        take: 20,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(
        mockPurchaseOrders,
      );
      mockPrismaService.purchaseOrder.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should search purchase orders with status filter', async () => {
      const query: SearchRequestDto = {
        columnFilters: [
          {
            field: 'status',
            operator: FilterOperator.IN,
            value: ['APPROVED'],
            dataType: DataType.ENUM,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        mockPurchaseOrders[1],
      ]);
      mockPrismaService.purchaseOrder.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
    });

    it('should search purchase orders with vendor filter', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'vendor_name',
          operator: FilterOperator.CONTAINS,
          value: 'Supplier A',
          dataType: DataType.TEXT,
        },
        skip: 0,
        take: 20,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        mockPurchaseOrders[0],
      ]);
      mockPrismaService.purchaseOrder.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
    });

    it('should search purchase orders with amount filter', async () => {
      const query: SearchRequestDto = {
        columnFilters: [
          {
            field: 'amount',
            operator: FilterOperator.BETWEEN,
            value: [50000, 80000],
            dataType: DataType.NUMERIC,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(
        mockPurchaseOrders,
      );
      mockPrismaService.purchaseOrder.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
    });

    it('should search purchase orders with multiple filters combined', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'po_number',
          operator: FilterOperator.BEGINS_WITH,
          value: 'PO-2026',
          dataType: DataType.TEXT,
        },
        columnFilters: [
          {
            field: 'status',
            operator: FilterOperator.EQUALS,
            value: 'PENDING',
            dataType: DataType.ENUM,
          },
          {
            field: 'amount',
            operator: FilterOperator.LT,
            value: 60000,
            dataType: DataType.NUMERIC,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        mockPurchaseOrders[0],
      ]);
      mockPrismaService.purchaseOrder.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should support pagination', async () => {
      const query: SearchRequestDto = {
        skip: 50,
        take: 25,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);
      mockPrismaService.purchaseOrder.count.mockResolvedValue(200);

      const result = await service.search(1, query);

      expect(result.skip).toBe(50);
      expect(result.take).toBe(25);
      expect(result.hasMore).toBe(true);
      expect(mockPrismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 25,
        }),
      );
    });

    it('should sort by po_number', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
        sortBy: 'po_number',
        sortOrder: 'asc' as any,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(
        mockPurchaseOrders,
      );
      mockPrismaService.purchaseOrder.count.mockResolvedValue(2);

      await service.search(1, query);

      expect(mockPrismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { po_number: 'asc' },
        }),
      );
    });

    it('should sort by status', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
        sortBy: 'status',
        sortOrder: 'desc' as any,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(
        mockPurchaseOrders,
      );
      mockPrismaService.purchaseOrder.count.mockResolvedValue(2);

      await service.search(1, query);

      expect(mockPrismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { status: 'desc' },
        }),
      );
    });

    it('should reject invalid filter operators', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'po_number',
          operator: FilterOperator.BETWEEN, // Not allowed for text
          value: [1, 2],
          dataType: DataType.TEXT,
        },
      };

      await expect(service.search(1, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid field names', async () => {
      const query: SearchRequestDto = {
        columnFilters: [
          {
            field: 'invalid_field',
            operator: FilterOperator.EQUALS,
            value: 'test',
            dataType: DataType.TEXT,
          },
        ],
      };

      await expect(service.search(1, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should format purchase order results correctly', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(
        mockPurchaseOrders,
      );
      mockPrismaService.purchaseOrder.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data[0]).toMatchObject({
        id: 1,
        po_number: 'PO-2026-0001',
        vendor_name: 'Supplier A',
        status: 'PENDING',
        amount: 50000,
      });
      expect(result.data[0].created_date).toBeDefined();
      expect(result.data[0].expected_delivery_date).toBeDefined();
    });

    it('should handle missing expected_delivery_date gracefully', async () => {
      const poWithoutDate = [
        {
          ...mockPurchaseOrders[0],
          expected_delivery_date: null,
        },
      ];

      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(
        poWithoutDate,
      );
      mockPrismaService.purchaseOrder.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data[0]).toMatchObject({
        expected_delivery_date: 'N/A',
      });
    });
  });

  describe('getColumnValues', () => {
    it('should get po_number values', async () => {
      const mockDistinct = [
        { po_number: 'PO-2026-0001' },
        { po_number: 'PO-2026-0002' },
      ];

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'po_number');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'PO-2026-0001',
        label: 'PO-2026-0001',
      });
    });

    it('should get vendor_name values', async () => {
      const mockDistinct = [
        { vendor: { name: 'Supplier A' } },
        { vendor: { name: 'Supplier B' } },
      ];

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'vendor_name');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'Supplier A',
        label: 'Supplier A',
      });
    });

    it('should filter out null vendor names', async () => {
      const mockDistinct = [
        { vendor: { name: 'Supplier A' } },
        { vendor: null },
        { vendor: { name: 'Supplier B' } },
      ];

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'vendor_name');

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.value !== null)).toBe(true);
    });

    it('should get status values', async () => {
      const mockDistinct = [
        { status: 'PENDING' },
        { status: 'APPROVED' },
        { status: 'RECEIVED' },
      ];

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'status');

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        value: 'PENDING',
        label: 'PENDING',
      });
    });

    it('should reject invalid column names', async () => {
      await expect(
        service.getColumnValues(1, 'invalid_column'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
