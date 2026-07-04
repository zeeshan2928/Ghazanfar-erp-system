import { Test, TestingModule } from '@nestjs/testing';
import { ProductsSearchService } from './products-search.service';
import { FilterService } from '@common/services/filter.service';
import { PrismaService } from '@database/prisma.service';
import {
  FilterOperator,
  DataType,
  SearchRequestDto,
} from '@common/dto/filter.dto';
import { BadRequestException } from '@nestjs/common';

describe('ProductsSearchService', () => {
  let service: ProductsSearchService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockProducts = [
    {
      id: 1,
      name: 'Makki Crockery',
      code: 'MCR-001',
      cost_price: 500,
      isActive: true,
      createdAt: new Date('2026-07-01'),
    },
    {
      id: 2,
      name: 'Steel Plates',
      code: 'STL-002',
      cost_price: 1200,
      isActive: true,
      createdAt: new Date('2026-07-02'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsSearchService,
        FilterService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsSearchService>(ProductsSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should search products without filters', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 1 }),
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should search products with name filter', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'name',
          operator: FilterOperator.CONTAINS,
          value: 'Crockery',
          dataType: DataType.TEXT,
        },
        skip: 0,
        take: 20,
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should search products with code filter', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'code',
          operator: FilterOperator.BEGINS_WITH,
          value: 'STL',
          dataType: DataType.TEXT,
        },
        skip: 0,
        take: 20,
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[1]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
    });

    it('should search products with cost_price range filter', async () => {
      const query: SearchRequestDto = {
        columnFilters: [
          {
            field: 'cost_price',
            operator: FilterOperator.BETWEEN,
            value: [400, 600],
            dataType: DataType.NUMERIC,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
    });

    it('should search products with multiple filters combined', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'name',
          operator: FilterOperator.IS_LIKE,
          value: 'Steel',
          dataType: DataType.TEXT,
        },
        columnFilters: [
          {
            field: 'cost_price',
            operator: FilterOperator.GT,
            value: 1000,
            dataType: DataType.NUMERIC,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[1]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should support pagination', async () => {
      const query: SearchRequestDto = {
        skip: 5,
        take: 25,
      };

      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(100);

      const result = await service.search(1, query);

      expect(result.skip).toBe(5);
      expect(result.take).toBe(25);
      expect(result.hasMore).toBe(true);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 25,
        }),
      );
    });

    it('should sort by specific fields', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
        sortBy: 'cost_price',
        sortOrder: 'asc' as any,
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      await service.search(1, query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { cost_price: 'asc' },
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

    it('should format product results correctly', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data[0]).toMatchObject({
        id: 1,
        name: 'Makki Crockery',
        code: 'MCR-001',
        cost_price: 500,
        brand_name: 'N/A',
        category_name: 'N/A',
        stock_level: 'out',
      });
    });
  });

  describe('getColumnValues', () => {
    it('should get product name values', async () => {
      const mockDistinct = [
        { name: 'Makki Crockery' },
        { name: 'Steel Plates' },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'name');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'Makki Crockery',
        label: 'Makki Crockery',
      });
    });

    it('should get product code values', async () => {
      const mockDistinct = [
        { code: 'MCR-001' },
        { code: 'STL-002' },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'code');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'MCR-001',
        label: 'MCR-001',
      });
    });

    it('should get stock level values', async () => {
      const result = await service.getColumnValues(1, 'stock_level');

      expect(result).toHaveLength(4);
      expect(result).toContainEqual({
        value: 'low',
        label: 'Low Stock',
      });
      expect(result).toContainEqual({
        value: 'out',
        label: 'Out of Stock',
      });
    });

    it('should get empty array for brand (not yet implemented)', async () => {
      const result = await service.getColumnValues(1, 'brand');

      expect(result).toEqual([]);
    });

    it('should get empty array for category (not yet implemented)', async () => {
      const result = await service.getColumnValues(1, 'category');

      expect(result).toEqual([]);
    });

    it('should reject invalid column names', async () => {
      await expect(
        service.getColumnValues(1, 'invalid_column'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
