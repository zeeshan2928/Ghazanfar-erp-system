import { Test, TestingModule } from '@nestjs/testing';
import { BillsSearchService } from './bills-search.service';
import { FilterService } from '@common/services/filter.service';
import { PrismaService } from '@database/prisma.service';
import {
  FilterOperator,
  DataType,
  SearchRequestDto,
} from '@common/dto/filter.dto';
import { BadRequestException } from '@nestjs/common';

describe('BillsSearchService', () => {
  let service: BillsSearchService;

  const mockPrismaService = {
    bill: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockBills = [
    {
      id: 1,
      bill_number: 'BILL-2026-000001',
      bill_date: new Date('2026-07-01'),
      customerId: 1,
      total_amount: 50000,
      status: 'APPROVED',
      payment_method: 'CASH',
      created_by: 1,
      customer: { name: 'Makki Crockery' },
      created_by_user: { firstName: 'John', lastName: 'Doe' },
      remarks: 'Test bill',
    },
    {
      id: 2,
      bill_number: 'BILL-2026-000002',
      bill_date: new Date('2026-07-02'),
      customerId: 2,
      total_amount: 75000,
      status: 'APPROVED',
      payment_method: 'CREDIT',
      created_by: 2,
      customer: { name: 'Man Crockery' },
      created_by_user: { firstName: 'Jane', lastName: 'Smith' },
      remarks: 'Another test',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillsSearchService,
        FilterService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BillsSearchService>(BillsSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should search bills without filters', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.bill.findMany.mockResolvedValue(mockBills);
      mockPrismaService.bill.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaService.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 1 },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should search bills with bill_number filter', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'bill_number',
          operator: FilterOperator.CONTAINS,
          value: 'BILL-2026',
          dataType: DataType.TEXT,
        },
        skip: 0,
        take: 20,
      };

      mockPrismaService.bill.findMany.mockResolvedValue([mockBills[0]]);
      mockPrismaService.bill.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should search bills with status filter', async () => {
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

      mockPrismaService.bill.findMany.mockResolvedValue(mockBills);
      mockPrismaService.bill.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
    });

    it('should search bills with amount range filter', async () => {
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

      mockPrismaService.bill.findMany.mockResolvedValue(mockBills);
      mockPrismaService.bill.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(2);
    });

    it('should search bills with multiple filters combined', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'bill_number',
          operator: FilterOperator.CONTAINS,
          value: 'BILL',
          dataType: DataType.TEXT,
        },
        columnFilters: [
          {
            field: 'status',
            operator: FilterOperator.IN,
            value: ['APPROVED'],
            dataType: DataType.ENUM,
          },
          {
            field: 'amount',
            operator: FilterOperator.GT,
            value: 50000,
            dataType: DataType.NUMERIC,
          },
        ],
        skip: 0,
        take: 20,
      };

      mockPrismaService.bill.findMany.mockResolvedValue([mockBills[1]]);
      mockPrismaService.bill.count.mockResolvedValue(1);

      const result = await service.search(1, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should support pagination', async () => {
      const query: SearchRequestDto = {
        skip: 10,
        take: 20,
      };

      mockPrismaService.bill.findMany.mockResolvedValue([]);
      mockPrismaService.bill.count.mockResolvedValue(100);

      const result = await service.search(1, query);

      expect(result.skip).toBe(10);
      expect(result.take).toBe(20);
      expect(result.hasMore).toBe(true);
      expect(mockPrismaService.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 20,
        }),
      );
    });

    it('should sort by specific fields', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
        sortBy: 'bill_date',
        sortOrder: 'desc' as any,
      };

      mockPrismaService.bill.findMany.mockResolvedValue(mockBills);
      mockPrismaService.bill.count.mockResolvedValue(2);

      await service.search(1, query);

      expect(mockPrismaService.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { bill_date: 'desc' },
        }),
      );
    });

    it('should reject invalid filter operators', async () => {
      const query: SearchRequestDto = {
        primaryFilter: {
          field: 'bill_number',
          operator: FilterOperator.GT, // Not allowed for text
          value: 1000,
          dataType: DataType.NUMERIC,
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

    it('should format bill results correctly', async () => {
      const query: SearchRequestDto = {
        skip: 0,
        take: 20,
      };

      mockPrismaService.bill.findMany.mockResolvedValue(mockBills);
      mockPrismaService.bill.count.mockResolvedValue(2);

      const result = await service.search(1, query);

      expect(result.data[0]).toMatchObject({
        id: 1,
        bill_number: 'BILL-2026-000001',
        customer_name: 'Makki Crockery',
        amount: 50000,
        status: 'APPROVED',
        payment_method: 'CASH',
        employee_name: 'John Doe',
      });
    });
  });

  describe('getColumnValues', () => {
    it('should get customer values', async () => {
      const mockCustomers = [
        { id: 1, name: 'Makki Crockery' },
        { id: 2, name: 'Man Crockery' },
      ];

      const mockDistinct = [
        { customerId: 1 },
        { customerId: 2 },
      ];

      mockPrismaService.bill.findMany.mockResolvedValue(mockDistinct);
      mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);

      const result = await service.getColumnValues(1, 'customer_name');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'Makki Crockery',
        label: 'Makki Crockery',
      });
    });

    it('should get employee values', async () => {
      const mockUsers = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' },
      ];

      const mockDistinct = [
        { created_by: 1 },
        { created_by: 2 },
      ];

      mockPrismaService.bill.findMany.mockResolvedValue(mockDistinct);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getColumnValues(1, 'employee_name');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'John Doe',
        label: 'John Doe',
      });
    });

    it('should get bill number values', async () => {
      const mockDistinct = [
        { bill_number: 'BILL-2026-000001' },
        { bill_number: 'BILL-2026-000002' },
      ];

      mockPrismaService.bill.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'bill_number');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'BILL-2026-000001',
        label: 'BILL-2026-000001',
      });
    });

    it('should get status values', async () => {
      const mockDistinct = [
        { status: 'APPROVED' },
        { status: 'PENDING_APPROVAL' },
      ];

      mockPrismaService.bill.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'status');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'APPROVED',
        label: 'APPROVED',
      });
    });

    it('should get payment method values', async () => {
      const mockDistinct = [
        { payment_method: 'CASH' },
        { payment_method: 'CREDIT' },
      ];

      mockPrismaService.bill.findMany.mockResolvedValue(mockDistinct);

      const result = await service.getColumnValues(1, 'payment_method');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        value: 'CASH',
        label: 'CASH',
      });
    });

    it('should reject invalid column names', async () => {
      await expect(
        service.getColumnValues(1, 'invalid_column'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
