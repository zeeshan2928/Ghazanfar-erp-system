import { AccountType } from '@prisma/client';

/**
 * GL utilities for accounting operations
 */

export const GL_UTILS = {
  /**
   * Get the normal balance type for an account type
   * ASSET, EXPENSE = debit normal (positive = debit)
   * LIABILITY, EQUITY, REVENUE = credit normal (positive = credit)
   */
  getNormalBalance(accountType: AccountType): 'debit' | 'credit' {
    switch (accountType) {
      case 'ASSET':
      case 'EXPENSE':
        return 'debit';
      case 'LIABILITY':
      case 'EQUITY':
      case 'REVENUE':
        return 'credit';
      default:
        return 'debit';
    }
  },

  /**
   * Determine if an account is a balance sheet account (accumulates over time)
   * vs income statement account (resets annually)
   */
  isBalanceSheetAccount(accountType: AccountType): boolean {
    return ['ASSET', 'LIABILITY', 'EQUITY'].includes(accountType);
  },

  /**
   * Determine if an account is an income statement account
   */
  isIncomeStatementAccount(accountType: AccountType): boolean {
    return ['REVENUE', 'EXPENSE'].includes(accountType);
  },

  /**
   * Format cents as currency string for display
   */
  formatCurrency(cents: number, decimalPlaces = 2): string {
    const value = cents / 100;
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  },

  /**
   * Convert cents to decimal number
   */
  centsToDecimal(cents: number): number {
    return cents / 100;
  },

  /**
   * Convert decimal to cents (integer)
   */
  decimalToCents(decimal: number): number {
    return Math.round(decimal * 100);
  },

  /**
   * Calculate days overdue from due date
   */
  calculateDaysOverdue(dueDate: Date, asOfDate: Date = new Date()): number {
    const diffTime = asOfDate.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Determine aging bucket (0-30, 31-60, 61-90, 90+)
   */
  getAgingBucket(daysOverdue: number): string {
    if (daysOverdue <= 0) return 'current';
    if (daysOverdue <= 30) return '0-30';
    if (daysOverdue <= 60) return '31-60';
    if (daysOverdue <= 90) return '61-90';
    return '90+';
  },

  /**
   * Validate that a journal entry is balanced
   * @param debitTotal sum of all debit amounts
   * @param creditTotal sum of all credit amounts
   * @throws Error if not balanced
   */
  validateBalanced(debitTotal: number, creditTotal: number): void {
    if (debitTotal !== creditTotal) {
      throw new Error(
        `Journal entry not balanced. Debits: ${GL_UTILS.formatCurrency(debitTotal)}, Credits: ${GL_UTILS.formatCurrency(creditTotal)}`,
      );
    }
  },

  /**
   * Calculate account balance from debit and credit amounts, accounting for account type
   */
  calculateBalance(
    accountType: AccountType,
    debitAmount: number,
    creditAmount: number,
  ): number {
    const normalBalance = GL_UTILS.getNormalBalance(accountType);
    if (normalBalance === 'debit') {
      return debitAmount - creditAmount;
    } else {
      return creditAmount - debitAmount;
    }
  },
};
