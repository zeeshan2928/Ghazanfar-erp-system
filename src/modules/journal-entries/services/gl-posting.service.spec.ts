import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GLPostingService } from './gl-posting.service';
import { GL_UTILS } from '../../../common/utils/gl.utils';

describe('GLPostingService', () => {
  let service: GLPostingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GLPostingService,
        {
          provide: PrismaService,
          useValue: {
            journalEntry: { findFirst: jest.fn(), update: jest.fn() },
            gLPosting: { create: jest.fn(), aggregate: jest.fn() },
            chartOfAccount: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<GLPostingService>(GLPostingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('validateEntry', () => {
    it('should throw if less than 2 lines', () => {
      const lines = [{ debitAmount: 1000, creditAmount: 0 } as any];
      expect(() => (service as any).validateEntry(lines)).toThrow(
        'at least 2 lines',
      );
    });

    it('should throw if debit != credit (unbalanced)', () => {
      const lines = [
        { debitAmount: 1000, creditAmount: 0, lineNumber: 1 } as any,
        { debitAmount: 0, creditAmount: 500, lineNumber: 2 } as any,
      ];
      expect(() => (service as any).validateEntry(lines)).toThrow('balanced');
    });

    it('should throw if line has both debit and credit', () => {
      const lines = [
        {
          debitAmount: 1000,
          creditAmount: 500,
          lineNumber: 1,
        } as any,
        { debitAmount: 0, creditAmount: 0, lineNumber: 2 } as any,
      ];
      expect(() => (service as any).validateEntry(lines)).toThrow(
        'both debit and credit',
      );
    });

    it('should throw if line has zero amount on both sides', () => {
      const lines = [
        { debitAmount: 1000, creditAmount: 0, lineNumber: 1 } as any,
        { debitAmount: 0, creditAmount: 0, lineNumber: 2 } as any,
      ];
      expect(() => (service as any).validateEntry(lines)).toThrow('zero amount');
    });

    it('should pass for valid balanced entry', () => {
      const lines = [
        { debitAmount: 1000, creditAmount: 0, lineNumber: 1 } as any,
        { debitAmount: 0, creditAmount: 1000, lineNumber: 2 } as any,
      ];
      expect(() => (service as any).validateEntry(lines)).not.toThrow();
    });

    it('should pass for multi-line balanced entry', () => {
      const lines = [
        { debitAmount: 1000, creditAmount: 0, lineNumber: 1 } as any,
        { debitAmount: 500, creditAmount: 0, lineNumber: 2 } as any,
        { debitAmount: 0, creditAmount: 1500, lineNumber: 3 } as any,
      ];
      expect(() => (service as any).validateEntry(lines)).not.toThrow();
    });
  });

  describe('GL_UTILS.validateBalanced', () => {
    it('should throw if totals not equal', () => {
      expect(() => GL_UTILS.validateBalanced(1000, 500)).toThrow('not balanced');
    });

    it('should not throw if balanced', () => {
      expect(() => GL_UTILS.validateBalanced(1000, 1000)).not.toThrow();
    });

    it('should handle zero balances', () => {
      expect(() => GL_UTILS.validateBalanced(0, 0)).not.toThrow();
    });
  });

  describe('GL_UTILS.getNormalBalance', () => {
    it('should return debit for ASSET', () => {
      expect(GL_UTILS.getNormalBalance('ASSET')).toBe('debit');
    });

    it('should return debit for EXPENSE', () => {
      expect(GL_UTILS.getNormalBalance('EXPENSE')).toBe('debit');
    });

    it('should return credit for LIABILITY', () => {
      expect(GL_UTILS.getNormalBalance('LIABILITY')).toBe('credit');
    });

    it('should return credit for EQUITY', () => {
      expect(GL_UTILS.getNormalBalance('EQUITY')).toBe('credit');
    });

    it('should return credit for REVENUE', () => {
      expect(GL_UTILS.getNormalBalance('REVENUE')).toBe('credit');
    });
  });

  describe('GL_UTILS.calculateBalance', () => {
    it('should calculate balance for debit-normal account (ASSET)', () => {
      // ASSET: balance = debit - credit
      const balance = GL_UTILS.calculateBalance('ASSET', 5000, 2000);
      expect(balance).toBe(3000);
    });

    it('should calculate balance for credit-normal account (LIABILITY)', () => {
      // LIABILITY: balance = credit - debit
      const balance = GL_UTILS.calculateBalance('LIABILITY', 2000, 5000);
      expect(balance).toBe(3000);
    });

    it('should return zero for empty accounts', () => {
      expect(GL_UTILS.calculateBalance('ASSET', 0, 0)).toBe(0);
    });

    it('should handle negative balances (overdraft)', () => {
      const balance = GL_UTILS.calculateBalance('ASSET', 1000, 2000);
      expect(balance).toBe(-1000);
    });
  });

  describe('GL_UTILS.getAgingBucket', () => {
    it('should return current for non-overdue', () => {
      expect(GL_UTILS.getAgingBucket(-5)).toBe('current');
      expect(GL_UTILS.getAgingBucket(0)).toBe('current');
    });

    it('should return 0-30 for 1-30 days overdue', () => {
      expect(GL_UTILS.getAgingBucket(1)).toBe('0-30');
      expect(GL_UTILS.getAgingBucket(30)).toBe('0-30');
    });

    it('should return 31-60 for 31-60 days overdue', () => {
      expect(GL_UTILS.getAgingBucket(31)).toBe('31-60');
      expect(GL_UTILS.getAgingBucket(60)).toBe('31-60');
    });

    it('should return 61-90 for 61-90 days overdue', () => {
      expect(GL_UTILS.getAgingBucket(61)).toBe('61-90');
      expect(GL_UTILS.getAgingBucket(90)).toBe('61-90');
    });

    it('should return 90+ for > 90 days overdue', () => {
      expect(GL_UTILS.getAgingBucket(91)).toBe('90+');
      expect(GL_UTILS.getAgingBucket(365)).toBe('90+');
    });
  });

  describe('GL_UTILS.formatCurrency', () => {
    it('should convert cents to currency string', () => {
      expect(GL_UTILS.formatCurrency(100000)).toBe('1,000.00');
      expect(GL_UTILS.formatCurrency(1000)).toBe('10.00');
      expect(GL_UTILS.formatCurrency(50)).toBe('0.50');
    });

    it('should handle zero', () => {
      expect(GL_UTILS.formatCurrency(0)).toBe('0.00');
    });

    it('should handle large amounts', () => {
      expect(GL_UTILS.formatCurrency(1000000000)).toBe('10,000,000.00');
    });
  });

  describe('GL_UTILS.centsToDecimal and decimalToCents', () => {
    it('should convert between cents and decimal', () => {
      expect(GL_UTILS.centsToDecimal(10000)).toBe(100);
      expect(GL_UTILS.decimalToCents(100)).toBe(10000);
    });

    it('should handle rounding in decimalToCents', () => {
      // 99.999 cents -> 10000 (rounded)
      expect(GL_UTILS.decimalToCents(100.001)).toBe(10000);
    });

    it('should be reversible', () => {
      const cents = 123456;
      const decimal = GL_UTILS.centsToDecimal(cents);
      const backToCents = GL_UTILS.decimalToCents(decimal);
      expect(backToCents).toBe(cents);
    });
  });

  describe('GL_UTILS.calculateDaysOverdue', () => {
    it('should calculate days correctly', () => {
      const dueDate = new Date('2026-07-01');
      const asOfDate = new Date('2026-07-11'); // 10 days later
      const daysOverdue = GL_UTILS.calculateDaysOverdue(dueDate, asOfDate);
      expect(daysOverdue).toBe(10);
    });

    it('should return 0 for same day', () => {
      const dueDate = new Date('2026-07-06');
      const asOfDate = new Date('2026-07-06');
      const daysOverdue = GL_UTILS.calculateDaysOverdue(dueDate, asOfDate);
      expect(daysOverdue).toBe(0);
    });

    it('should return negative for future dates', () => {
      const dueDate = new Date('2026-07-11');
      const asOfDate = new Date('2026-07-06');
      const daysOverdue = GL_UTILS.calculateDaysOverdue(dueDate, asOfDate);
      expect(daysOverdue).toBeLessThan(0);
    });
  });

  describe('GL_UTILS.isBalanceSheetAccount', () => {
    it('should identify balance sheet accounts', () => {
      expect(GL_UTILS.isBalanceSheetAccount('ASSET')).toBe(true);
      expect(GL_UTILS.isBalanceSheetAccount('LIABILITY')).toBe(true);
      expect(GL_UTILS.isBalanceSheetAccount('EQUITY')).toBe(true);
    });

    it('should identify income statement accounts', () => {
      expect(GL_UTILS.isBalanceSheetAccount('REVENUE')).toBe(false);
      expect(GL_UTILS.isBalanceSheetAccount('EXPENSE')).toBe(false);
    });
  });
});
