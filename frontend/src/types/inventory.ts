export interface InventoryItem {
  id: number;
  organization_id: number;
  product_id: number;
  warehouse_id: number;
  physical_on_hand: number;
  reserved: number;
  available: number;
  opening_balance: number;
  lastReservedAt?: string;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: number;
    name: string;
    code: string;
    sku: string;
    category?: string;
  };
  warehouse?: {
    id: number;
    name: string;
    location: string;
  };
}

export interface InventoryMovement {
  id: number;
  inventory_id: number;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  quantity: number;
  reference_type: 'PURCHASE_ORDER' | 'GATE_PASS' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN';
  reference_id: string;
  reason: string;
  notes?: string;
  created_by: number;
  created_by_user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface StockAdjustment {
  warehouse_id: number;
  product_id: number;
  adjustment_type: 'ADD' | 'REMOVE' | 'CORRECT';
  quantity: number;
  reason: 'PURCHASE' | 'DAMAGE' | 'THEFT' | 'AUDIT' | 'CORRECTION' | 'RETURN' | 'OTHER';
  reference?: string;
  notes?: string;
}

export interface InventoryDashboard {
  total_stock: number;
  available_stock: number;
  reserved_stock: number;
  low_stock_items: number;
  on_order_items: number;
  recent_movements: InventoryMovement[];
  by_warehouse: {
    warehouse_id: number;
    warehouse_name: string;
    total: number;
    available: number;
    reserved: number;
  }[];
}

export interface InventoryFilter {
  warehouseId?: number;
  search?: string;
  sortBy?: 'name' | 'stock' | 'low_stock';
  sortOrder?: 'asc' | 'desc';
  showLowStockOnly?: boolean;
  skip: number;
  take: number;
}

export interface InventoryListResponse {
  data: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface StockThreshold {
  product_id: number;
  warehouse_id: number;
  threshold_level: number;
  reorder_quantity: number;
}

export interface MovementFilter {
  warehouseId?: number;
  productId?: number;
  fromDate?: string;
  toDate?: string;
  movementType?: string;
  skip: number;
  take: number;
}
