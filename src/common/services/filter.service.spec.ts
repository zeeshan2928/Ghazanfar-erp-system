import { Test, TestingModule } from '@nestjs/testing';
import { FilterService } from './filter.service';
import { PrismaService } from '../../database/prisma.service';
import {
  FilterOperatorDto,
  FilterOperator,
  DataType,
} from '../dto/filter.dto';

describe('FilterService', () => {
  let service: FilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilterService,
        {
          provide: PrismaService,
          useValue: {
            bill: {
              findMany: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            },
            product: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FilterService>(FilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildWhereClause', () => {
    it('should return empty object for no filters', () => {
      const result = service.buildWhereClause([]);
      expect(result).toEqual({});
    });

    it('should build equals condition', () => {
      const filter: FilterOperatorDto = {
        field: 'status',
        operator: FilterOperator.EQUALS,
        value: 'PAID',
        dataType: DataType.ENUM,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.status).toEqual({ equals: 'PAID' });
    });

    it('should build does not equal condition', () => {
      const filter: FilterOperatorDto = {
        field: 'status',
        operator: FilterOperator.DOES_NOT_EQUAL,
        value: 'PENDING',
        dataType: DataType.ENUM,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.status).toEqual({ not: 'PENDING' });
    });

    it('should build contains condition (case-insensitive)', () => {
      const filter: FilterOperatorDto = {
        field: 'customer_name',
        operator: FilterOperator.CONTAINS,
        value: 'Crockery',
        dataType: DataType.TEXT,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.customer_name).toEqual({
        contains: 'Crockery',
        mode: 'insensitive',
      });
    });

    it('should build does not contain condition', () => {
      const filter: FilterOperatorDto = {
        field: 'customer_name',
        operator: FilterOperator.DOES_NOT_CONTAIN,
        value: 'test',
        dataType: DataType.TEXT,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.customer_name.not.contains).toBe('test');
    });

    it('should build begins with condition', () => {
      const filter: FilterOperatorDto = {
        field: 'bill_number',
        operator: FilterOperator.BEGINS_WITH,
        value: '1001',
        dataType: DataType.TEXT,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.bill_number).toEqual({
        startsWith: '1001',
        mode: 'insensitive',
      });
    });

    it('should build ends with condition', () => {
      const filter: FilterOperatorDto = {
        field: 'email',
        operator: FilterOperator.ENDS_WITH,
        value: '@gmail.com',
        dataType: DataType.TEXT,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.email).toEqual({
        endsWith: '@gmail.com',
        mode: 'insensitive',
      });
    });

    it('should build fuzzy match for single word', () => {
      const filter: FilterOperatorDto = {
        field: 'name',
        operator: FilterOperator.IS_LIKE,
        value: 'makki',
        dataType: DataType.TEXT,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.name).toEqual({
        contains: 'makki',
        mode: 'insensitive',
      });
    });

    it('should build fuzzy match for multiple words (all must match)', () => {
      const filter: FilterOperatorDto = {
        field: 'name',
        operator: FilterOperator.IS_LIKE,
        value: 'mak mus',
        dataType: DataType.TEXT,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.name.AND).toBeDefined();
      expect(result.name.AND).toHaveLength(2);
      expect(result.name.AND[0]).toEqual({
        contains: 'mak',
        mode: 'insensitive',
      });
      expect(result.name.AND[1]).toEqual({
        contains: 'mus',
        mode: 'insensitive',
      });
    });

    it('should build greater than condition', () => {
      const filter: FilterOperatorDto = {
        field: 'amount',
        operator: FilterOperator.GT,
        value: 50000,
        dataType: DataType.NUMERIC,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.amount).toEqual({ gt: 50000 });
    });

    it('should build greater than or equal condition', () => {
      const filter: FilterOperatorDto = {
        field: 'amount',
        operator: FilterOperator.GTE,
        value: 50000,
        dataType: DataType.NUMERIC,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.amount).toEqual({ gte: 50000 });
    });

    it('should build less than condition', () => {
      const filter: FilterOperatorDto = {
        field: 'amount',
        operator: FilterOperator.LT,
        value: 100000,
        dataType: DataType.NUMERIC,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.amount).toEqual({ lt: 100000 });
    });

    it('should build less than or equal condition', () => {
      const filter: FilterOperatorDto = {
        field: 'amount',
        operator: FilterOperator.LTE,
        value: 100000,
        dataType: DataType.NUMERIC,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.amount).toEqual({ lte: 100000 });
    });

    it('should build between condition with range', () => {
      const filter: FilterOperatorDto = {
        field: 'amount',
        operator: FilterOperator.BETWEEN,
        value: [50000, 100000],
        dataType: DataType.NUMERIC,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.amount).toEqual({
        gte: 50000,
        lte: 100000,
      });
    });

    it('should build in condition with array', () => {
      const filter: FilterOperatorDto = {
        field: 'status',
        operator: FilterOperator.IN,
        value: ['PAID', 'PENDING'],
        dataType: DataType.ENUM,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.status).toEqual({
        in: ['PAID', 'PENDING'],
      });
    });

    it('should build not in condition', () => {
      const filter: FilterOperatorDto = {
        field: 'status',
        operator: FilterOperator.NOT_IN,
        value: ['REJECTED', 'CANCELLED'],
        dataType: DataType.ENUM,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.status).toEqual({
        notIn: ['REJECTED', 'CANCELLED'],
      });
    });

    it('should combine multiple filters', () => {
      const filters: FilterOperatorDto[] = [
        {
          field: 'status',
          operator: FilterOperator.EQUALS,
          value: 'PAID',
          dataType: DataType.ENUM,
        },
        {
          field: 'amount',
          operator: FilterOperator.GT,
          value: 50000,
          dataType: DataType.NUMERIC,
        },
      ];

      const result = service.buildWhereClause(filters);
      expect(result.status).toEqual({ equals: 'PAID' });
      expect(result.amount).toEqual({ gt: 50000 });
    });
  });

  describe('buildPaginatedResponse', () => {
    it('should create paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = service.buildPaginatedResponse(data, 100, 0, 20);

      expect(response.data).toEqual(data);
      expect(response.total).toBe(100);
      expect(response.skip).toBe(0);
      expect(response.take).toBe(20);
      expect(response.hasMore).toBe(true);
    });

    it('should indicate hasMore false when at end', () => {
      const data = [{ id: 1 }];
      const response = service.buildPaginatedResponse(data, 21, 20, 20);

      expect(response.hasMore).toBe(false);
    });
  });

  describe('validateFilter', () => {
    it('should validate allowed operators', () => {
      const filter: FilterOperatorDto = {
        field: 'name',
        operator: FilterOperator.CONTAINS,
        value: 'test',
        dataType: DataType.TEXT,
      };

      const allowed = [
        FilterOperator.CONTAINS,
        FilterOperator.EQUALS,
        FilterOperator.IS_LIKE,
      ];

      expect(service.validateFilter(filter, allowed)).toBe(true);
    });

    it('should reject disallowed operators', () => {
      const filter: FilterOperatorDto = {
        field: 'name',
        operator: FilterOperator.GT,
        value: 10,
        dataType: DataType.NUMERIC,
      };

      const allowed = [FilterOperator.EQUALS, FilterOperator.IN];

      expect(service.validateFilter(filter, allowed)).toBe(false);
    });
  });

  describe('fuzzy search edge cases', () => {
    it('should handle empty fuzzy search', () => {
      const filter: FilterOperatorDto = {
        field: 'name',
        operator: FilterOperator.IS_LIKE,
        value: '   ',
        dataType: DataType.TEXT,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.name).toBeUndefined();
    });

    it('should handle extra spaces in fuzzy search', () => {
      const filter: FilterOperatorDto = {
        field: 'name',
        operator: FilterOperator.IS_LIKE,
        value: '  mak   mus  ',
        dataType: DataType.TEXT,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.name.AND).toHaveLength(2);
      expect(result.name.AND[0].contains).toBe('mak');
      expect(result.name.AND[1].contains).toBe('mus');
    });

    it('should be case-insensitive for fuzzy search', () => {
      const filter: FilterOperatorDto = {
        field: 'name',
        operator: FilterOperator.IS_LIKE,
        value: 'MAKKI',
        dataType: DataType.TEXT,
      };

      const result = service.buildWhereClause([filter]);
      expect(result.name).toEqual({
        contains: 'makki',
        mode: 'insensitive',
      });
    });
  });
});
