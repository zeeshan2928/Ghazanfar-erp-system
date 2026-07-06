// Entry Types
export interface CashBookEntry {
  id: string;
  referenceNumber: string;
  date: string;
  amount: number;
  category: CashBookCategory;
  paymentMethod: PaymentMethod;
  description: string;
  status: CashBookEntryStatus;
  linkedBillId?: number;
  syncStatus: 'synced' | 'pending' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export type CashBookCategory =
  | 'SALES_RECEIPT'
  | 'PURCHASE_PAYMENT'
  | 'EXPENSE'
  | 'OTHER';

export type PaymentMethod =
  | 'CASH'
  | 'CHEQUE'
  | 'BANK_TRANSFER'
  | 'MOBILE_MONEY'
  | 'CREDIT';

export type CashBookEntryStatus = 'DRAFT' | 'POSTED' | 'RECONCILED' | 'CANCELLED';

// Bill Matching Types
export interface BillItem {
  id: string;
  billNumber: string;
  amount: number;
  date: string;
  vendor: string;
  category: string;
  description: string;
}

export interface MatchPair {
  id: string;
  billId: string;
  entryId: string;
  confidence: number;
  matchedAt: string;
}

// Approval Types
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalState {
  entryId: string;
  status: ApprovalStatus;
  comments: string;
  approvedBy?: string;
  approvedAt?: string;
}

// Audit Types
export interface AuditComment {
  id: string;
  entryId: string;
  author: string;
  content: string;
  timestamp: string;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'COMMENT_ADDED'
  | 'APPROVE'
  | 'REJECT';

export interface AuditLogEntry {
  id: string;
  entryId: string;
  action: AuditAction;
  by: string;
  timestamp: string;
  details?: Record<string, any>;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}
