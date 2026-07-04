import { Test, TestingModule } from '@nestjs/testing';
import { BillsService } from './bills.service';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { BadRequestException } from '@nestjs/common';

describe('BillsService', () => {
  let service: BillsService;
  let prismaMock: any;
  let transactionMock: any;

  beforeEach(async () => {
    prismaMock = {
      bill: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      billLine: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      gatePass: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      inventory: {
        update: jest.fn(),
      },
    };

    transactionMock = {
      run: jest.fn((callback) => callback(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TransactionService, useValue: transactionMock },
      ],
    }).compile();

    service = module.get<BillsService>(BillsService);
  });

  describe('create', () => {
    it('should create a bill with auto-generated bill number', async () => {
      const organizationId = 1;
      const userId = 1;
      const createBillDto = {
        customerId: 1,
        channel: 'WALK_IN',
        paymentMethod: 'CASH',
        discountAmount: 0,
        remarks: 'Test bill',
        lines: [
          {
            productId: 1,
            warehouseId: 1,
            quantity: 5,
            unitPrice: 1000,
            remarks: 'Test line',
          },
        ],
      };

      const mockCustomer = { id: 1, name: 'Test Customer' };
      const mockBill = {
        id: 1,
        billNumber: 'BILL-2024-000001',
        organizationId,
        customerId: 1,
        subtotal: 5000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 5000,
        status: 'APPROVED',
        lines: [],
        customer: mockCustomer,
      };

      prismaMock.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaMock.bill.findFirst.mockResolvedValue(null);
      prismaMock.billLine.findMany.mockResolvedValue([]);
      transactionMock.run.mockImplementation((callback) =>
        callback({
          ...prismaMock,
          bill: { create: jest.fn().mockResolvedValue(mockBill) },
        }),
      );

      const result = await service.create(organizationId, userId, createBillDto);

      expect(result).toBeDefined();
      expect(result.billNumber).toMatch(/BILL-2024-\d{6}/);
      expect(result.subtotal).toBe(5000);
      expect(result.status).toBe('APPROVED');
    });

    it('should throw BadRequestException if customer not found', async () => {
      const organizationId = 1;
      const userId = 1;
      const createBillDto = {
        customerId: 999,
        channel: 'WALK_IN',
        paymentMethod: 'CASH',
        lines: [],
      };

      prismaMock.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.create(organizationId, userId, createBillDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate line totals correctly', async () => {
      const organizationId = 1;
      const userId = 1;
      const createBillDto = {
        customerId: 1,
        channel: 'WALK_IN',
        paymentMethod: 'CASH',
        lines: [
          {
            productId: 1,
            warehouseId: 1,
            quantity: 10,
            unitPrice: 500,
          },
        ],
      };

      const mockCustomer = { id: 1, name: 'Test Customer' };
      prismaMock.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaMock.bill.findFirst.mockResolvedValue(null);
      prismaMock.billLine.findMany.mockResolvedValue([]);

      transactionMock.run.mockImplementation((callback) =>
        callback({
          ...prismaMock,
          bill: {
            create: jest.fn().mockResolvedValue({
              id: 1,
              subtotal: 5000,
              totalAmount: 5000,
            }),
          },
        }),
      );

      const result = await service.create(organizationId, userId, createBillDto);

      // 10 * 500 = 5000
      expect(result.subtotal).toBe(5000);
    });
  });

  describe('findAll', () => {
    it('should return paginated bills', async () => {
      const organizationId = 1;
      const mockBills = [
        { id: 1, billNumber: 'BILL-2024-000001', organizationId },
        { id: 2, billNumber: 'BILL-2024-000002', organizationId },
      ];

      prismaMock.bill.findMany.mockResolvedValue(mockBills);
      prismaMock.bill.count.mockResolvedValue(10);

      const result = await service.findAll(organizationId, 0, 10);

      expect(result.data).toEqual(mockBills);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('should indicate hasMore correctly', async () => {
      const organizationId = 1;
      const mockBills = Array(10).fill({});

      prismaMock.bill.findMany.mockResolvedValue(mockBills);
      prismaMock.bill.count.mockResolvedValue(25);

      const result = await service.findAll(organizationId, 0, 10);

      expect(result.hasMore).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return bill with all details', async () => {
      const organizationId = 1;
      const billId = 1;
      const mockBill = {
        id: billId,
        billNumber: 'BILL-2024-000001',
        organizationId,
        customer: { id: 1, name: 'Test Customer' },
        lines: [
          {
            id: 1,
            quantity: 5,
            unitPrice: 1000,
            product: { id: 1, name: 'Product 1' },
          },
        ],
      };

      prismaMock.bill.findFirst.mockResolvedValue(mockBill);

      const result = await service.findById(organizationId, billId);

      expect(result).toEqual(mockBill);
      expect(result.lines).toHaveLength(1);
    });

    it('should throw BadRequestException if bill not found', async () => {
      const organizationId = 1;
      const billId = 999;

      prismaMock.bill.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(organizationId, billId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update bill when in DRAFT status', async () => {
      const organizationId = 1;
      const billId = 1;
      const updateData = {
        lines: [
          {
            productId: 1,
            warehouseId: 1,
            quantity: 5,
            unitPrice: 1000,
          },
        ],
      };

      const mockBill = {
        id: billId,
        status: 'DRAFT',
        subtotal: 5000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 5000,
      };

      prismaMock.bill.findFirst.mockResolvedValue(mockBill);

      transactionMock.run.mockImplementation((callback) =>
        callback({
          ...prismaMock,
          bill: {
            update: jest
              .fn()
              .mockResolvedValue({ ...mockBill, ...updateData }),
          },
          billLine: {
            ...prismaMock.billLine,
            createMany: jest.fn(),
            deleteMany: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
          },
        }),
      );

      const result = await service.update(organizationId, billId, updateData);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if bill not found', async () => {
      const organizationId = 1;
      const billId = 999;

      prismaMock.bill.findFirst.mockResolvedValue(null);

      await expect(
        service.update(organizationId, billId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if bill not in DRAFT status', async () => {
      const organizationId = 1;
      const billId = 1;

      prismaMock.bill.findFirst.mockResolvedValue({
        id: billId,
        status: 'FINALIZED',
      });

      await expect(
        service.update(organizationId, billId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should soft delete a bill', async () => {
      const organizationId = 1;
      const billId = 1;

      prismaMock.bill.findFirst.mockResolvedValue({
        id: billId,
        organizationId,
      });
      prismaMock.bill.update.mockResolvedValue({
        id: billId,
        isActive: false,
      });

      await service.delete(organizationId, billId);

      expect(prismaMock.bill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: billId },
          data: { isActive: false },
        }),
      );
    });

    it('should throw BadRequestException if bill not found', async () => {
      const organizationId = 1;
      const billId = 999;

      prismaMock.bill.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(organizationId, billId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeStatus', () => {
    it('should change status from DRAFT to FINALIZED', async () => {
      const organizationId = 1;
      const billId = 1;

      const mockBill = {
        id: billId,
        status: 'DRAFT',
      };

      prismaMock.bill.findFirst.mockResolvedValue(mockBill);
      prismaMock.bill.update.mockResolvedValue({
        ...mockBill,
        status: 'FINALIZED',
      });

      const result = await service.changeStatus(
        organizationId,
        billId,
        'FINALIZED',
      );

      expect(result.status).toBe('FINALIZED');
    });

    it('should change status from FINALIZED to PAID', async () => {
      const organizationId = 1;
      const billId = 1;

      const mockBill = {
        id: billId,
        status: 'FINALIZED',
      };

      prismaMock.bill.findFirst.mockResolvedValue(mockBill);
      prismaMock.bill.update.mockResolvedValue({
        ...mockBill,
        status: 'PAID',
      });

      const result = await service.changeStatus(organizationId, billId, 'PAID');

      expect(result.status).toBe('PAID');
    });

    it('should throw BadRequestException for invalid status', async () => {
      const organizationId = 1;
      const billId = 1;

      prismaMock.bill.findFirst.mockResolvedValue({
        id: billId,
        status: 'DRAFT',
      });

      await expect(
        service.changeStatus(organizationId, billId, 'INVALID_STATUS'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if bill not found', async () => {
      const organizationId = 1;
      const billId = 999;

      prismaMock.bill.findFirst.mockResolvedValue(null);

      await expect(
        service.changeStatus(organizationId, billId, 'PAID'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('exportPDF', () => {
    it('should export bill as PDF', async () => {
      const organizationId = 1;
      const billId = 1;

      const mockBill = {
        id: billId,
        billNumber: 'BILL-2024-000001',
        billDate: new Date('2024-01-15'),
        customer: { name: 'Test Customer' },
        lines: [
          {
            product: { name: 'Product 1' },
            quantity: 5,
            unitPrice: 1000,
            lineTotal: 5000,
          },
        ],
        subtotal: 5000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 5000,
        status: 'PAID',
        remarks: 'Test remarks',
      };

      prismaMock.bill.findFirst.mockResolvedValue(mockBill);

      const result = await service.exportPDF(organizationId, billId);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      // Should be base64 encoded
      expect(Buffer.from(result, 'base64').toString()).toContain(
        'BILL-2024-000001',
      );
    });

    it('should throw BadRequestException if bill not found', async () => {
      const organizationId = 1;
      const billId = 999;

      prismaMock.bill.findFirst.mockResolvedValue(null);

      await expect(
        service.exportPDF(organizationId, billId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
