export class BillMatching {
  id: number;
  organizationId: number;
  billId: number;
  entryId: number;
  matchedAmount: number;
  reason?: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'UNDONE';
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}
