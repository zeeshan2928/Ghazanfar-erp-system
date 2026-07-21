/**
 * Starter Chart of Accounts template for new organizations
 *
 * Base structure (codes 1000-7100, ~30 accounts) follows the generic
 * Odoo/QuickBooks/Sage default layout. Everything from PAKISTAN-MARKET
 * ADDITIONS onward extends that same numbering scheme with accounts a
 * Pakistani retail + wholesale + light-manufacturing business actually
 * needs to post every real transaction to a proper head: FBR sales tax
 * and withholding tax accounts, bank/cash sub-accounts, raw material /
 * WIP / finished-goods inventory splits (for the BOM/manufacturing
 * flow), and the specific expense lines this business runs (utilities
 * split by type, vehicle running, commission - already partially
 * present at 2350/6250 - etc).
 *
 * `parentAccountId` here holds the PARENT'S accountCode string (not a
 * DB id) - `seedStarterCoA` below resolves codes to real ids in a
 * two-pass create. Existing codes 1000-7100 are never renumbered or
 * edited: postings already reference their real ids in production, so
 * new accounts only ever ADD codes, never reuse or shift existing ones.
 */

export const STARTER_COA = [
  // ASSETS (1000-1999)
  {
    accountCode: '1000',
    accountName: 'Cash',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    isCashAccount: true,
    parentAccountId: null,
    description: 'Cash and cash equivalents',
  },
  {
    accountCode: '1100',
    accountName: 'Accounts Receivable',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: null,
    description: 'Amounts owed by customers',
  },
  {
    accountCode: '1200',
    accountName: 'Inventory',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: null,
    description: 'Stock and merchandise held for resale',
  },
  {
    accountCode: '1500',
    accountName: 'Equipment',
    accountType: 'ASSET',
    accountCategory: 'FIXED_ASSET',
    parentAccountId: null,
    description: 'Machinery and equipment',
  },
  {
    accountCode: '1600',
    accountName: 'Accumulated Depreciation',
    accountType: 'ASSET',
    accountCategory: 'FIXED_ASSET',
    parentAccountId: null,
    description: 'Accumulated depreciation of equipment',
  },

  // LIABILITIES (2000-2999)
  {
    accountCode: '2000',
    accountName: 'Accounts Payable',
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: null,
    description: 'Amounts owed to suppliers',
  },
  {
    accountCode: '2100',
    accountName: 'Short-term Debt',
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: null,
    description: 'Loans and debt due within one year',
  },
  {
    accountCode: '2200',
    accountName: 'Long-term Debt',
    accountType: 'LIABILITY',
    accountCategory: 'LONG_TERM_LIABILITY',
    parentAccountId: null,
    description: 'Loans and debt due after one year',
  },
  {
    accountCode: '2300',
    accountName: 'Accrued Expenses',
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: null,
    description: 'Expenses owed but not yet paid',
  },

  // EQUITY (3000-3999)
  {
    accountCode: '3000',
    accountName: 'Owner Capital',
    accountType: 'EQUITY',
    accountCategory: 'OWNER_EQUITY',
    parentAccountId: null,
    description: 'Owner investment and accumulated profits',
  },
  {
    accountCode: '3100',
    accountName: 'Retained Earnings',
    accountType: 'EQUITY',
    accountCategory: 'OWNER_EQUITY',
    parentAccountId: null,
    description: 'Cumulative net income minus distributions',
  },
  {
    accountCode: '3200',
    accountName: 'Owner Drawings',
    accountType: 'EQUITY',
    accountCategory: 'OWNER_EQUITY',
    parentAccountId: null,
    description: 'Withdrawals by owner',
  },

  // REVENUE (4000-4999)
  {
    accountCode: '4000',
    accountName: 'Sales Revenue',
    accountType: 'REVENUE',
    accountCategory: 'SALES_REVENUE',
    parentAccountId: null,
    description: 'Revenue from product sales',
  },
  {
    accountCode: '4100',
    accountName: 'Service Revenue',
    accountType: 'REVENUE',
    accountCategory: 'SALES_REVENUE',
    parentAccountId: null,
    description: 'Revenue from services provided',
  },
  {
    accountCode: '4200',
    accountName: 'Interest Income',
    accountType: 'REVENUE',
    accountCategory: 'OTHER_REVENUE',
    parentAccountId: null,
    description: 'Interest earned on deposits',
  },
  {
    accountCode: '4300',
    accountName: 'Other Income',
    accountType: 'REVENUE',
    accountCategory: 'OTHER_REVENUE',
    parentAccountId: null,
    description: 'Miscellaneous income',
  },

  // EXPENSES (5000-9999)
  {
    accountCode: '5000',
    accountName: 'Cost of Goods Sold',
    accountType: 'EXPENSE',
    accountCategory: 'COGS',
    parentAccountId: null,
    description: 'Direct costs of goods sold',
  },
  {
    accountCode: '6000',
    accountName: 'Salaries and Wages',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Employee compensation',
  },
  {
    accountCode: '6100',
    accountName: 'Rent Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Rent for office and warehouse space',
  },
  {
    accountCode: '6200',
    accountName: 'Utilities',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Electricity, water, gas, internet',
  },
  {
    accountCode: '6300',
    accountName: 'Office Supplies',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Supplies and materials for operations',
  },
  {
    accountCode: '6400',
    accountName: 'Advertising and Marketing',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Marketing and promotional expenses',
  },
  {
    accountCode: '6500',
    accountName: 'Depreciation Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Depreciation of fixed assets',
  },
  {
    accountCode: '6600',
    accountName: 'Travel Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Travel and accommodation costs',
  },
  {
    accountCode: '6700',
    accountName: 'Professional Services',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Legal, accounting, consulting fees',
  },
  {
    accountCode: '6800',
    accountName: 'Insurance Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Business insurance premiums',
  },
  {
    accountCode: '6900',
    accountName: 'Maintenance and Repairs',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Upkeep and repairs of equipment',
  },
  {
    accountCode: '7000',
    accountName: 'Interest Expense',
    accountType: 'EXPENSE',
    accountCategory: 'NON_OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Interest on loans and debt',
  },
  {
    accountCode: '7100',
    accountName: 'Miscellaneous Expense',
    accountType: 'EXPENSE',
    accountCategory: 'NON_OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Other operating expenses',
  },

  // ==========================================================================
  // PAKISTAN-MARKET ADDITIONS - Sales tax, WHT, bank/cash detail, inventory
  // splits for manufacturing, and this business's specific expense heads.
  // ==========================================================================

  // ---- ASSETS: cash/bank detail (children of 1000 Cash) ----
  {
    accountCode: '1010',
    accountName: 'Cash in Hand',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    isCashAccount: true,
    parentAccountId: '1000',
    description: 'Physical cash held at counter/warehouse',
  },
  {
    accountCode: '1020',
    accountName: 'Bank Account - Operating',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    isCashAccount: true,
    parentAccountId: '1000',
    description: 'Primary current/operating bank account',
  },
  {
    accountCode: '1030',
    accountName: 'Petty Cash',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    isCashAccount: true,
    parentAccountId: '1000',
    description: 'Small day-to-day cash float',
  },

  // ---- ASSETS: receivables detail ----
  {
    accountCode: '1150',
    accountName: 'Allowance for Doubtful Accounts',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: '1100',
    description: 'Contra-asset: estimated uncollectible receivables',
  },

  // ---- ASSETS: inventory split (children of 1200 Inventory) - supports the
  // BOM/manufacturing flow (raw parts -> assembled finished goods) ----
  {
    accountCode: '1210',
    accountName: 'Inventory - Raw Materials / Spare Parts',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: '1200',
    description: 'Components and spare parts not yet assembled',
  },
  {
    accountCode: '1220',
    accountName: 'Inventory - Work in Process',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: '1200',
    description: 'Assemblies in progress via manufacturing orders',
  },
  {
    accountCode: '1230',
    accountName: 'Inventory - Finished Goods',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: '1200',
    description: 'Completed products ready for sale',
  },
  {
    accountCode: '1240',
    accountName: 'Goods in Transit',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: '1200',
    description: 'Purchased/transferred stock not yet received at a warehouse',
  },

  // ---- ASSETS: tax recoverable + advances ----
  {
    accountCode: '1310',
    accountName: 'Sales Tax Receivable (Input Tax)',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: null,
    description: 'GST/sales tax paid on purchases, recoverable from FBR against output tax',
  },
  {
    accountCode: '1320',
    accountName: 'Advance Income Tax / WHT Recoverable',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: null,
    description: 'Withholding tax deducted by customers/banks, adjustable against annual income tax',
  },
  {
    accountCode: '1330',
    accountName: 'Advances to Suppliers/Vendors',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: null,
    description: 'Advance payments made to vendors ahead of delivery',
  },
  {
    accountCode: '1340',
    accountName: 'Advances / Loans to Employees',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: null,
    description: 'Salary advances and staff loans',
  },
  {
    accountCode: '1400',
    accountName: 'Prepaid Expenses',
    accountType: 'ASSET',
    accountCategory: 'CURRENT_ASSET',
    parentAccountId: null,
    description: 'Rent, insurance, and other costs paid ahead of the period they cover',
  },

  // ---- ASSETS: fixed asset detail (children of 1500 Equipment) ----
  {
    accountCode: '1510',
    accountName: 'Furniture and Fixtures',
    accountType: 'ASSET',
    accountCategory: 'FIXED_ASSET',
    parentAccountId: '1500',
    description: 'Office and shop furniture',
  },
  {
    accountCode: '1520',
    accountName: 'Vehicles',
    accountType: 'ASSET',
    accountCategory: 'FIXED_ASSET',
    parentAccountId: '1500',
    description: 'Delivery and company vehicles',
  },
  {
    accountCode: '1530',
    accountName: 'Computers and Office Equipment',
    accountType: 'ASSET',
    accountCategory: 'FIXED_ASSET',
    parentAccountId: '1500',
    description: 'IT hardware and office equipment',
  },

  // ---- LIABILITIES: payables detail ----
  {
    accountCode: '2010',
    accountName: 'Accounts Payable - Trade',
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: '2000',
    description: 'Amounts owed to vendors for goods/services (subset of 2000)',
  },

  // ---- LIABILITIES: tax payable - the FBR-facing heads ----
  {
    accountCode: '2110',
    accountName: 'Sales Tax Payable (Output Tax)',
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: null,
    description: 'GST/sales tax collected on sales, payable to FBR net of input tax',
  },
  {
    accountCode: '2120',
    accountName: 'Withholding Tax Payable',
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: null,
    description: 'Tax withheld from vendor/employee payments, payable to FBR',
  },
  {
    accountCode: '2130',
    accountName: 'Income Tax Payable',
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: null,
    description: 'Provision for income tax due for the period',
  },

  // ---- LIABILITIES: payroll / other ----
  {
    accountCode: '2140',
    accountName: 'Salaries and Wages Payable',
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: null,
    description: 'Accrued but unpaid salaries at period end',
  },
  {
    accountCode: '2150',
    accountName: "Employees' Provident Fund Payable",
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: null,
    description: 'Employer + employee PF contributions payable',
  },
  {
    accountCode: '2160',
    accountName: 'Advance from Customers',
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: null,
    description: 'Customer payments received before goods/services delivered',
  },
  {
    accountCode: '2170',
    accountName: 'Staff Bonus Payable',
    accountType: 'LIABILITY',
    accountCategory: 'CURRENT_LIABILITY',
    parentAccountId: null,
    description: 'Approved bonuses not yet paid out',
  },

  // ---- REVENUE: sales channel + contra-revenue detail ----
  {
    accountCode: '4010',
    accountName: 'Sales Revenue - Retail',
    accountType: 'REVENUE',
    accountCategory: 'SALES_REVENUE',
    parentAccountId: '4000',
    description: 'Counter/walk-in retail sales',
  },
  {
    accountCode: '4020',
    accountName: 'Sales Revenue - Wholesale',
    accountType: 'REVENUE',
    accountCategory: 'SALES_REVENUE',
    parentAccountId: '4000',
    description: 'Bulk/dealer wholesale sales',
  },
  {
    accountCode: '4030',
    accountName: 'Sales Returns and Allowances',
    accountType: 'REVENUE',
    accountCategory: 'SALES_REVENUE',
    parentAccountId: '4000',
    description: 'Contra-revenue: customer returns and price allowances',
  },
  {
    accountCode: '4040',
    accountName: 'Sales Discounts',
    accountType: 'REVENUE',
    accountCategory: 'SALES_REVENUE',
    parentAccountId: '4000',
    description: 'Contra-revenue: discounts given on invoices',
  },
  {
    accountCode: '4400',
    accountName: 'Scrap / By-product Sales',
    accountType: 'REVENUE',
    accountCategory: 'OTHER_REVENUE',
    parentAccountId: null,
    description: 'Income from scrap material or manufacturing by-products',
  },

  // ---- COGS: manufacturing cost detail (children of 5000) ----
  {
    accountCode: '5010',
    accountName: 'Cost of Goods Sold - Raw Materials',
    accountType: 'EXPENSE',
    accountCategory: 'COGS',
    parentAccountId: '5000',
    description: 'Component/spare-part cost consumed into finished goods',
  },
  {
    accountCode: '5020',
    accountName: 'Direct Labour - Manufacturing',
    accountType: 'EXPENSE',
    accountCategory: 'COGS',
    parentAccountId: '5000',
    description: 'Wages directly tied to assembly/manufacturing output',
  },
  {
    accountCode: '5030',
    accountName: 'Manufacturing Overhead',
    accountType: 'EXPENSE',
    accountCategory: 'COGS',
    parentAccountId: '5000',
    description: 'Indirect factory costs allocated to production',
  },
  {
    accountCode: '5040',
    accountName: 'Freight In / Carriage Inward',
    accountType: 'EXPENSE',
    accountCategory: 'COGS',
    parentAccountId: '5000',
    description: 'Inbound freight to bring purchased goods to the warehouse',
  },

  // ---- OPERATING EXPENSE: utilities split (children of 6200 Utilities) ----
  {
    accountCode: '6210',
    accountName: 'Electricity Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: '6200',
    description: 'Electricity bills for shop/warehouse/office',
  },
  {
    accountCode: '6220',
    accountName: 'Gas Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: '6200',
    description: 'Gas utility bills',
  },
  {
    accountCode: '6230',
    accountName: 'Water Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: '6200',
    description: 'Water utility bills',
  },
  {
    accountCode: '6240',
    accountName: 'Telephone and Internet Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: '6200',
    description: 'Phone, mobile, and internet connectivity costs',
  },

  // ---- OPERATING EXPENSE: other specific heads ----
  {
    accountCode: '6910',
    accountName: 'Vehicle Running and Fuel Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Fuel, servicing, and running costs for company vehicles',
  },
  {
    accountCode: '6920',
    accountName: 'Bank Charges',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Bank fees, transfer charges, cheque book charges',
  },
  {
    accountCode: '6930',
    accountName: 'Withholding Tax Expense (Non-Adjustable)',
    accountType: 'EXPENSE',
    accountCategory: 'TAX_EXPENSE',
    parentAccountId: null,
    description: 'WHT portions that are a final tax, not recoverable/adjustable',
  },
  {
    accountCode: '6940',
    accountName: 'Sales Tax Expense (Non-Adjustable)',
    accountType: 'EXPENSE',
    accountCategory: 'TAX_EXPENSE',
    parentAccountId: null,
    description: 'Sales tax portions that cannot be claimed as input tax',
  },
  {
    accountCode: '6950',
    accountName: 'Entertainment Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Client/staff entertainment costs',
  },
  {
    accountCode: '6960',
    accountName: 'Printing and Stationery',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Printed materials and office stationery',
  },
  {
    accountCode: '6970',
    accountName: 'Postage and Courier Expense',
    accountType: 'EXPENSE',
    accountCategory: 'OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Courier and postal delivery costs',
  },
  {
    accountCode: '6980',
    accountName: 'Donations',
    accountType: 'EXPENSE',
    accountCategory: 'NON_OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Charitable donations',
  },
  {
    accountCode: '6990',
    accountName: 'Fines and Penalties',
    accountType: 'EXPENSE',
    accountCategory: 'NON_OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Regulatory fines and late-payment penalties',
  },
  {
    accountCode: '7200',
    accountName: 'Bad Debts Written Off',
    accountType: 'EXPENSE',
    accountCategory: 'NON_OPERATING_EXPENSE',
    parentAccountId: null,
    description: 'Receivables confirmed uncollectible and written off',
  },
];
