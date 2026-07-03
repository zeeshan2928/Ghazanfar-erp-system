export interface GatePass {
  id: number;
  gate_pass_number: string;
  status: 'PENDING' | 'PICKED' | 'CONFIRMED' | 'REJECTED';
  items: GatePassItem[];
  bill: {
    bill_number: string;
    total_amount: number;
    customer: {
      name: string;
      phone?: string;
    };
  };
}

export interface GatePassItem {
  id: number;
  billLineId: number;
  productId: number;
  quantity: number;
  picked_quantity: number;
  billLine: {
    product: {
      code: string;
      name: string;
    };
  };
}

export interface WarehouseTransfer {
  id: number;
  transfer_number: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  items: WarehouseTransferItem[];
  from_warehouse: { name: string };
  to_warehouse: { name: string };
}

export interface WarehouseTransferItem {
  productId: number;
  quantity: number;
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
  page?: number;
  hasMore?: boolean;
}
