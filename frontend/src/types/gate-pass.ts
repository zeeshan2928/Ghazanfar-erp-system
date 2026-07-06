export interface GatePassItem {
  id: number;
  gate_pass_id: number;
  bill_line_id: number;
  product_id: number;
  quantity: number;
  picked_quantity: number;
  billLine?: {
    product: {
      id: number;
      name: string;
      code: string;
      sku: string;
    };
  };
}

export interface GatePass {
  id: number;
  gate_pass_number: string;
  bill_id: number;
  warehouse_id: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'CONFIRMED' | 'SHORTAGE_REPORTED' | 'REJECTED';
  gatePassDate: string; // ISO date
  createdAt: string;
  updatedAt: string;
  items: GatePassItem[];
  bill: {
    id: number;
    bill_number: string;
    total_amount: number;
    bill_date: string;
    customer: {
      id: number;
      name: string;
      phone?: string;
      email?: string;
    };
  };
  warehouse?: {
    id: number;
    name: string;
    location: string;
  };
}

export interface GatePassListFilter {
  status?: string;
  warehouseId?: number;
  search?: string;
  skip: number;
  take: number;
  sortBy?: 'date' | 'status' | 'customer';
  sortOrder?: 'asc' | 'desc';
}

export interface GatePassListResponse {
  data: GatePass[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ShortageReport {
  gatePassId: number;
  itemId: number;
  productId: number;
  quantityRequired: number;
  quantityPicked: number;
  reason: 'DAMAGED' | 'MISSING' | 'WRONG_ITEM' | 'EXPIRED' | 'OTHER';
  notes?: string;
  photoUrl?: string;
}

export interface GatePassConfirmation {
  gatePassId: number;
  items: {
    itemId: number;
    pickedQuantity: number;
  }[];
  remarks?: string;
}

export interface PrintLabel {
  gatePassNumber: string;
  billNumber: string;
  customerName: string;
  itemCount: number;
  generatedAt: string;
  warehouseName: string;
}
