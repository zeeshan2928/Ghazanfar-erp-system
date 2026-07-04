import { Test, TestingModule } from '@nestjs/testing';
import { InventorySearchService } from './inventory-search.service';
import { FilterService } from '@common/services/filter.service';
import { PrismaService } from '@database/prisma.service';
import {
  FilterOperator,
  DataType,
  SearchRequestDto,
} from '@common/dto/filter.dto';
import { BadRequestException } from '@nestjs/common';

describe('InventorySearchService', () => {
  let service: InventorySearchService;

  const mockPrismaService = {
    inventory: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    warehouse: {
      findMany: jest.fn(),
    },
  };

  const mockInventories = [
    {
      id: 1,
      productId: 1,
      warehouseId: 1,
      quantity: 100,
      createdAt: new Date('2026-07-01'),
      product: { name: 'Makki Crockery' },
      warehouse: { name: 'Main Warehouse' },
    },
    {
      id: 2,
      productId: 2,
      warehouseId: 2,
      quantity: 50,
      createdAt: new Date('2026-07-02'),
      product: { name: 'Steel Plates' },
      warehouse: { name: 'Secondary Warehouse' },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventorySearchService,
        FilterService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventorySearchService>(InventorySearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should search inventory without filters', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.inventory.findMany.mockResolvedValue(mockInventories);
      mockPrismaService.inventory.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaService.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 1 }),
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should search inventory with product_name filter', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'product_name',
          operator: FilterOperator.CONTAINS,
          value: 'Crockery',
          dataType: DataType.TEXT,
        },
        skip: 0,
        take: 20,
      };

      mockPrismaService.inventory.findMany.mockResolvedValue([
        mockInventories[0],
      ]);
      mockPrismaService.inventory.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should search inventory with warehouse filter', async () => {
      const query: SearchRequestDto = {
        columnFilters: [
          {
            field: 'warehouse',
            operator: FilterOperator.EQUALS,
            value: 'Main Warehouse',
            dataType: DataType.TEXT,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.inventory.findMany.mockResolvedValue([
        mockInventories[0],
      ]);
      mockPrismaService.inventory.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
    });

    it('should search inventory with quantity range filter', async () => {
      const query: SearchRequestDto = {
        columnFilters: [
          {
            field: 'quantity',
            operator: FilterOperator.BETWEEN,
            value: [40, 100],
            dataType: DataType.NUMERIC,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.inventory.findMany.mockResolvedValue(mockInventories);
      mockPrismaService.inventory.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
    });

    it('should search inventory with multiple filters combined', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'product_name',
          operator: FilterOperator.IS_LIKE,
          value: 'Steel',
          dataType: DataType.TEXT,
        },
        columnFilters: [
          {
            field: 'quantity',
            operator: FilterOperator.LT,
            value: 75,
            dataType: DataType.NUMERIC,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.inventory.findMany.mockResolvedValue([
        mockInventories[1],
      ]);
      mockPrismaService.inventory.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should support pagination', async () => {
      const query: SearchRequestDto = {
        skip: 20,
        take: 15,
      };

      mockPrismaService.inventory.findMany.mockResolvedValue([]);
      mockPrismaService.inventory.count.mockResolvedValue(50);

      const result = await service.search(1, query);

      expect(result.skip).toBe(20);
      expect(result.take).toBe(15);
      expect(result.hasMore).toBe(true);
      expect(mockPrismaService.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 15,
        }),
      );
    });

    it('should sort by quantity', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
        sortBy: 'quantity',
        sortOrder: 'desc' as any,
      };

      mockPrismaService.inventory.findMany.mockResolvedValue(mockInventories);
      mockPrismaService.inventory.count.mockResolvedValue(2);

      await service.search(1, query);

      expect(mockPrismaService.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { quantity: 'desc' },
        }),
      );
    });

    it('should reject invalid filter operators', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'product_name',
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
            field: 'nonexistent_field',
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

    it('should format inventory results correctly', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.inventory.findMany.mockResolvedValue(mockInventories);
      mockPrismaService.inventory.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data[0]).toMatchObject({
        id: 1,
        stock_id: 'INV-1',
        product_name: 'Makki Crockery',
        warehouse_name: 'Main Warehouse',
        quantity: 100,
      });
      expect(result.data[0].date_received).toBeDefined();
    });
  });

  describe('getColumnValues', () => {
    it('should get product names from inventory', async () => {
      const mockDistinctProducts = [
        { productId: 1 },
        { productId: 2 },
      ];

      const mockProducts = [
        { id: 1, name: 'Makki Crockery' },
        { id: 2, name: 'Steel Plates' },
      ];

      mockPrismaService.inventory.findMany.mockResolvedValue(
        mockDistinctProducts,
      );
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getColumnValues(1, 'product_name');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'Makki Crockery',
        label: 'Makki Crockery',
      });
    });

    it('should get warehouse names from inventory', async () => {
      const mockDistinctWarehouses = [
        { warehouseId: 1 },
        { warehouseId: 2 },
      ];

      const mockWarehouses = [
        { id: 1, name: 'Main Warehouse' },
        { id: 2, name: 'Secondary Warehouse' },
      ];

      mockPrismaService.inventory.findMany.mockResolvedValue(
        mockDistinctWarehouses,
      );
      mockPrismaService.warehouse.findMany.mockResolvedValue(mockWarehouses);

      const result = await service.getColumnValues(1, 'warehouse');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'Main Warehouse',
        label: 'Main Warehouse',
      });
    });

    it('should return empty array when no warehouses found', async () => {
      mockPrismaService.inventory.findMany.mockResolvedValue([]);

      const result = await service.getColumnValues(1, 'warehouse');

      expect(result).toEqual([]);
    });

    it('should reject invalid column names', async () => {
      await expect(
        service.getColumnValues(1, 'invalid_column'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
