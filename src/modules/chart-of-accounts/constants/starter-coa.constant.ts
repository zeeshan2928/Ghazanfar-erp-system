/**
 * Starter Chart of Accounts template for new organizations
 * Standard structure with ~30 common accounts
 */

export const STARTER_COA = [
  // ASSETS (1000-1999)
  {
    accountCode: '1000',
    accountName: 'Cash',
    accountType: 'ASSET',
    parentAccountId: null,
    description: 'Cash and cash equivalents',
  },
  {
    accountCode: '1100',
    accountName: 'Accounts Receivable',
    accountType: 'ASSET',
    parentAccountId: null,
    description: 'Amounts owed by customers',
  },
  {
    accountCode: '1200',
    accountName: 'Inventory',
    accountType: 'ASSET',
    parentAccountId: null,
    description: 'Stock and merchandise held for resale',
  },
  {
    accountCode: '1500',
    accountName: 'Equipment',
    accountType: 'ASSET',
    parentAccountId: null,
    description: 'Machinery and equipment',
  },
  {
    accountCode: '1600',
    accountName: 'Accumulated Depreciation',
    accountType: 'ASSET',
    parentAccountId: null,
    description: 'Accumulated depreciation of equipment',
  },

  // LIABILITIES (2000-2999)
  {
    accountCode: '2000',
    accountName: 'Accounts Payable',
    accountType: 'LIABILITY',
    parentAccountId: null,
    description: 'Amounts owed to suppliers',
  },
  {
    accountCode: '2100',
    accountName: 'Short-term Debt',
    accountType: 'LIABILITY',
    parentAccountId: null,
    description: 'Loans and debt due within one year',
  },
  {
    accountCode: '2200',
    accountName: 'Long-term Debt',
    accountType: 'LIABILITY',
    parentAccountId: null,
    description: 'Loans and debt due after one year',
  },
  {
    accountCode: '2300',
    accountName: 'Accrued Expenses',
    accountType: 'LIABILITY',
    parentAccountId: null,
    description: 'Expenses owed but not yet paid',
  },

  // EQUITY (3000-3999)
  {
    accountCode: '3000',
    accountName: 'Owner Capital',
    accountType: 'EQUITY',
    parentAccountId: null,
    description: 'Owner investment and accumulated profits',
  },
  {
    accountCode: '3100',
    accountName: 'Retained Earnings',
    accountType: 'EQUITY',
    parentAccountId: null,
    description: 'Cumulative net income minus distributions',
  },
  {
    accountCode: '3200',
    accountName: 'Owner Drawings',
    accountType: 'EQUITY',
    parentAccountId: null,
    description: 'Withdrawals by owner',
  },

  // REVENUE (4000-4999)
  {
    accountCode: '4000',
    accountName: 'Sales Revenue',
    accountType: 'REVENUE',
    parentAccountId: null,
    description: 'Revenue from product sales',
  },
  {
    accountCode: '4100',
    accountName: 'Service Revenue',
    accountType: 'REVENUE',
    parentAccountId: null,
    description: 'Revenue from services provided',
  },
  {
    accountCode: '4200',
    accountName: 'Interest Income',
    accountType: 'REVENUE',
    parentAccountId: null,
    description: 'Interest earned on deposits',
  },
  {
    accountCode: '4300',
    accountName: 'Other Income',
    accountType: 'REVENUE',
    parentAccountId: null,
    description: 'Miscellaneous income',
  },

  // EXPENSES (5000-9999)
  {
    accountCode: '5000',
    accountName: 'Cost of Goods Sold',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Direct costs of goods sold',
  },
  {
    accountCode: '6000',
    accountName: 'Salaries and Wages',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Employee compensation',
  },
  {
    accountCode: '6100',
    accountName: 'Rent Expense',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Rent for office and warehouse space',
  },
  {
    accountCode: '6200',
    accountName: 'Utilities',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Electricity, water, gas, internet',
  },
  {
    accountCode: '6300',
    accountName: 'Office Supplies',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Supplies and materials for operations',
  },
  {
    accountCode: '6400',
    accountName: 'Advertising and Marketing',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Marketing and promotional expenses',
  },
  {
    accountCode: '6500',
    accountName: 'Depreciation Expense',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Depreciation of fixed assets',
  },
  {
    accountCode: '6600',
    accountName: 'Travel Expense',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Travel and accommodation costs',
  },
  {
    accountCode: '6700',
    accountName: 'Professional Services',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Legal, accounting, consulting fees',
  },
  {
    accountCode: '6800',
    accountName: 'Insurance Expense',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Business insurance premiums',
  },
  {
    accountCode: '6900',
    accountName: 'Maintenance and Repairs',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Upkeep and repairs of equipment',
  },
  {
    accountCode: '7000',
    accountName: 'Interest Expense',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Interest on loans and debt',
  },
  {
    accountCode: '7100',
    accountName: 'Miscellaneous Expense',
    accountType: 'EXPENSE',
    parentAccountId: null,
    description: 'Other operating expenses',
  },
];
