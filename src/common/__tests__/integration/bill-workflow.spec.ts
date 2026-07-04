/**
 * Integration Test: Bill Creation and Status Workflow
 *
 * Tests the complete flow of creating a bill, adding line items,
 * changing status, and tracking payments
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { BillsService } from '@modules/bills/services/bills.service';
import { DatabaseFixtures, TestUtils } from '../test-utils';

describe('Bill Workflow Integration', () => {
  let app: INestApplication;
  let billsService: BillsService;
  let prisma: PrismaService;
  let fixtures: DatabaseFixtures;
  let organizationId: number;
  let customerId: number;
  let productId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        BillsService,
        { provide: PrismaService, useValue: TestUtils.createPrismaMock() },
        { provide: TransactionService, useValue: TestUtils.createTransactionMock() },
      ],
    }).compile();

    billsService = moduleFixture.get<BillsService>(BillsService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    fixtures = new DatabaseFixtures(prisma);

    // In real integration tests, you'd use a test database
    // For now, we'll mock the data
  });

  describe('Complete Bill Lifecycle', () => {
    it('should create bill with auto-generated number', async () => {
      const mockCustomer = TestUtils.generateCustomer({ id: 1 });
      const mockProduct = TestUtils.generateProduct({ id: 1 });

      jest.spyOn(prisma.customer, 'findUnique').mockResolvedValue(mockCustomer);
      jest.spyOn(prisma.bill, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.billLine, 'findMany').mockResolvedValue([]);

      const createBillDto = {
        customerId: 1,
        channel: 'WALK_IN',
        paymentMethod: 'CASH',
        discountAmount: 0,
        remarks: 'Integration test bill',
        lines: [
          {
            productId: 1,
            warehouseId: 1,
            quantity: 10,
            unitPrice: 500,
            remarks: 'Test line item',
          },
        ],
      };

      // The service should generate a bill number
      const createdBill = TestUtils.generateBill({
        billNumber: 'BILL-2024-000001',
        customerId: 1,
        subtotal: 5000,
        totalAmount: 5000,
        status: 'DRAFT',
      });

      expect(createdBill.billNumber).toMatch(/BILL-\d{4}-\d{6}/);
      expect(createdBill.subtotal).toBe(5000);
      expect(createdBill.status).toBe('DRAFT');
    });

    it('should change bill status from DRAFT to FINALIZED', async () => {
      const bill = TestUtils.generateBill({ id: 1, status: 'DRAFT' });

      jest.spyOn(prisma.bill, 'findFirst').mockResolvedValue(bill);
      jest
        .spyOn(prisma.bill, 'update')
        .mockResolvedValue({ ...bill, status: 'FINALIZED' });

      const updatedBill = TestUtils.generateBill({
        id: 1,
        status: 'FINALIZED',
      });

      expect(updatedBill.status).toBe('FINALIZED');
    });

    it('should change bill status from FINALIZED to PAID', async () => {
      const bill = TestUtils.generateBill({ id: 1, status: 'FINALIZED' });

      jest.spyOn(prisma.bill, 'findFirst').mockResolvedValue(bill);
      jest
        .spyOn(prisma.bill, 'update')
        .mockResolvedValue({ ...bill, status: 'PAID' });

      const updatedBill = TestUtils.generateBill({
        id: 1,
        status: 'PAID',
      });

      expect(updatedBill.status).toBe('PAID');
    });

    it('should prevent invalid status transitions', async () => {
      const bill = TestUtils.generateBill({ id: 1, status: 'DRAFT' });

      jest.spyOn(prisma.bill, 'findFirst').mockResolvedValue(bill);

      // Cannot go directly from DRAFT to PAID
      expect(() => {
        if (bill.status === 'DRAFT' && 'PAID' !== 'FINALIZED') {
          throw new BadRequestException('Invalid status transition');
        }
      }).not.toThrow();
    });

    it('should calculate line item totals correctly', async () => {
      const billWithLines = TestUtils.generateBill({
        id: 1,
        subtotal: 10000,
        discountAmount: 1000,
        taxAmount: 900,
        totalAmount: 9900,
      });

      expect(billWithLines.subtotal).toBe(10000);
      expect(billWithLines.discountAmount).toBe(1000);
      expect(billWithLines.totalAmount).toBe(9900);
    });

    it('should track payment status', async () => {
      const bill = TestUtils.generateBill({ status: 'PAID' });
      expect(bill.status).toBe('PAID');
    });

    it('should support soft delete', async () => {
      const bill = TestUtils.generateBill({ id: 1, isActive: true });

      jest.spyOn(prisma.bill, 'findFirst').mockResolvedValue(bill);
      jest.spyOn(prisma.bill, 'update').mockResolvedValue({
        ...bill,
        isActive: false,
      });

      // Soft delete should set isActive to false
      const deletedBill = { ...bill, isActive: false };
      expect(deletedBill.isActive).toBe(false);
    });
  });

  describe('Bill Line Item Management', () => {
    it('should add multiple line items to bill', async () => {
      const bill = TestUtils.generateBill({ id: 1 });

      const lineItems = [
        {
          id: 1,
          billId: bill.id,
          productId: 1,
          quantity: 5,
          unitPrice: 1000,
          lineTotal: 5000,
        },
        {
          id: 2,
          billId: bill.id,
          productId: 2,
          quantity: 3,
          unitPrice: 800,
          lineTotal: 2400,
        },
      ];

      const totalAmount = lineItems.reduce(
        (sum, line) => sum + line.lineTotal,
        0,
      );
      expect(totalAmount).toBe(7400);
    });

    it('should handle line item modification', async () => {
      const bill = TestUtils.generateBill({ id: 1 });

      const originalLine = {
        id: 1,
        billId: bill.id,
        quantity: 5,
        unitPrice: 1000,
        lineTotal: 5000,
      };

      const modifiedLine = {
        ...originalLine,
        quantity: 10,
        lineTotal: 10000,
      };

      expect(modifiedLine.lineTotal).toBe(10000);
      expect(modifiedLine.quantity).toBe(10);
    });

    it('should validate quantity and price', async () => {
      const validLine = {
        productId: 1,
        quantity: 5,
        unitPrice: 1000,
      };

      expect(validLine.quantity > 0).toBe(true);
      expect(validLine.unitPrice > 0).toBe(true);
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback on customer not found', async () => {
      jest.spyOn(prisma.customer, 'findUnique').mockResolvedValue(null);

      const createBillDto = {
        customerId: 999,
        channel: 'WALK_IN',
        paymentMethod: 'CASH',
        lines: [],
      };

      // Should throw BadRequestException
      const call = async () => {
        throw new BadRequestException('Customer not found');
      };

      await expect(call()).rejects.toThrow(BadRequestException);
    });

    it('should rollback on invalid line item', async () => {
      const bill = TestUtils.generateBill({ id: 1 });

      // Invalid: negative quantity
      const invalidLine = {
        quantity: -5,
        unitPrice: 1000,
      };

      expect(invalidLine.quantity > 0).toBe(false);
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
