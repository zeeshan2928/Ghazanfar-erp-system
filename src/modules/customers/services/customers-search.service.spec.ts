import { Test, TestingModule } from '@nestjs/testing';
import { CustomersSearchService } from './customers-search.service';
import { FilterService } from '@common/services/filter.service';
import { PrismaService } from '@database/prisma.service';
import {
  FilterOperator,
  DataType,
  SearchRequestDto,
} from '@common/dto/filter.dto';
import { BadRequestException } from '@nestjs/common';

describe('CustomersSearchService', () => {
  let service: CustomersSearchService;

  const mockPrismaService = {
    customer: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCustomers = [
    {
      id: 1,
      name: 'Makki Crockery',
      customerType: 'RETAILER',
      phone: '03001234567',
      email: 'makki@example.com',
      creditLimit: 50000,
      isActive: true,
      createdAt: new Date('2026-07-01'),
    },
    {
      id: 2,
      name: 'Man Crockery',
      customerType: 'WHOLESALER',
      phone: '03009876543',
      email: 'man@example.com',
      creditLimit: 100000,
      isActive: true,
      createdAt: new Date('2026-07-02'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersSearchService,
        FilterService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomersSearchService>(CustomersSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should search customers without filters', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrismaService.customer.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 1,
            isActive: true,
          }),
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should search customers with name filter (fuzzy)', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'name',
          operator: FilterOperator.IS_LIKE,
          value: 'Makki',
          dataType: DataType.TEXT,
        },
        skip: 0,
        take: 20,
      };

      mockPrismaService.customer.findMany.mockResolvedValue([mockCustomers[0]]);
      mockPrismaService.customer.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should search customers with customer_type filter', async () => {
      const query: SearchRequestDto = {
        columnFilters: [
          {
            field: 'customer_type',
            operator: FilterOperator.IN,
            value: ['RETAILER'],
            dataType: DataType.ENUM,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.customer.findMany.mockResolvedValue([mockCustomers[0]]);
      mockPrismaService.customer.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
    });

    it('should search customers with phone filter', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'phone',
          operator: FilterOperator.CONTAINS,
          value: '0300',
          dataType: DataType.TEXT,
        },
        skip: 0,
        take: 20,
      };

      mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrismaService.customer.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
    });

    it('should search customers with email filter', async () => {
      const query: SearchRequestDto = {
        columnFilters: [
          {
            field: 'email',
            operator: FilterOperator.CONTAINS,
            value: '@example.com',
            dataType: DataType.TEXT,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrismaService.customer.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
    });

    it('should search customers with credit_limit range filter', async () => {
      const query: SearchRequestDto = {
        columnFilters: [
          {
            field: 'credit_limit',
            operator: FilterOperator.GTE,
            value: 100000,
            dataType: DataType.NUMERIC,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.customer.findMany.mockResolvedValue([mockCustomers[1]]);
      mockPrismaService.customer.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
    });

    it('should search customers with multiple filters combined', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'name',
          operator: FilterOperator.IS_LIKE,
          value: 'Crockery',
          dataType: DataType.TEXT,
        },
        columnFilters: [
          {
            field: 'customer_type',
            operator: FilterOperator.EQUALS,
            value: 'WHOLESALER',
            dataType: DataType.ENUM,
          },
          {
            field: 'credit_limit',
            operator: FilterOperator.GT,
            value: 75000,
            dataType: DataType.NUMERIC,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.customer.findMany.mockResolvedValue([mockCustomers[1]]);
      mockPrismaService.customer.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should support pagination', async () => {
      const query: SearchRequestDto = {
        skip: 30,
        take: 10,
      };

      mockPrismaService.customer.findMany.mockResolvedValue([]);
      mockPrismaService.customer.count.mockResolvedValue(50);

      const result = await service.search(1, query);

      expect(result.skip).toBe(30);
      expect(result.take).toBe(10);
      expect(result.hasMore).toBe(true);
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 30,
          take: 10,
        }),
      );
    });

    it('should sort by name', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
        sortBy: 'name',
        sortOrder: 'asc' as any,
      };

      mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrismaService.customer.count.mockResolvedValue(2);

      await service.search(1, query);

      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('should sort by customerType', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
        sortBy: 'customerType',
        sortOrder: 'desc' as any,
      };

      mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrismaService.customer.count.mockResolvedValue(2);

      await service.search(1, query);

      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { customerType: 'desc' },
        }),
      );
    });

    it('should reject invalid filter operators', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'name',
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
            field: 'unknown_field',
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

    it('should format customer results correctly', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrismaService.customer.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data[0]).toMatchObject({
        id: 1,
        name: 'Makki Crockery',
        customer_type: 'RETAILER',
        phone: '03001234567',
        email: 'makki@example.com',
        credit_limit: 50000,
      });
    });

    it('should handle missing phone and email gracefully', async () => {
      const customersWithMissing = [
        {
          ...mockCustomers[0],
          phone: null,
          email: null,
        },
      ];

      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.customer.findMany.mockResolvedValue(
        customersWithMissing,
      );
      mockPrismaService.customer.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data[0]).toMatchObject({
        phone: 'N/A',
        email: 'N/A',
      });
    });
  });

  describe('getColumnValues', () => {
    it('should get customer name values', async () => {
      const mockDistinct = [
        { name: 'Makki Crockery' },
        { name: 'Man Crockery' },
      ];

      mockPrismaService.customer.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'name');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'Makki Crockery',
        label: 'Makki Crockery',
      });
    });

    it('should get customer type values', async () => {
      const mockDistinct = [
        { customerType: 'RETAILER' },
        { customerType: 'WHOLESALER' },
      ];

      mockPrismaService.customer.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'customer_type');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'RETAILER',
        label: 'RETAILER',
      });
    });

    it('should filter out null customer types', async () => {
      const mockDistinct = [
        { customerType: 'RETAILER' },
        { customerType: null },
        { customerType: 'WHOLESALER' },
      ];

      mockPrismaService.customer.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'customer_type');

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.value !== null)).toBe(true);
    });

    it('should reject invalid column names', async () => {
      await expect(
        service.getColumnValues(1, 'invalid_column'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
