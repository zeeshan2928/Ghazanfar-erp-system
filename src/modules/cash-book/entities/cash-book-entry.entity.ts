export enum CashBookCategory {
  SALES_RECEIPT = 'SALES_RECEIPT',
  PURCHASE_PAYMENT = 'PURCHASE_PAYMENT',
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  LOAN_PAYMENT = 'LOAN_PAYMENT',
  LOAN_RECEIVED = 'LOAN_RECEIVED',
  EQUIPMENT = 'EQUIPMENT',
  OTHER_INCOME = 'OTHER_INCOME',
  OTHER_EXPENSE = 'OTHER_EXPENSE',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CREDIT = 'CREDIT',
}

export enum EntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  RECONCILED = 'RECONCILED',
  CANCELLED = 'CANCELLED',
}

export interface ICashBookEntry {
  id: number;
  organizationId: number;
  date: Date;
  amount: number; // in smallest currency unit (paisa)
  description: string;
  category: CashBookCategory;
  paymentMethod: PaymentMethod;
  referenceNumber: string; // cheque #, transaction ID, etc.
  linkedBillId?: number; // FK to Bill
  status: EntryStatus;
  createdBy: number; // FK to User
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
