export interface InventoryItem {
  id: number;
  organizationId: number;
  productId: number;
  warehouseId: number;
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
  inventoryId: number;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  quantity: number;
  referenceType: 'PURCHASE_ORDER' | 'GATE_PASS' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN';
  referenceId: string;
  reason: string;
  notes?: string;
  createdBy: number;
  createdByUser?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface StockAdjustment {
  warehouseId: number;
  productId: number;
  adjustmentType: 'ADD' | 'REMOVE' | 'CORRECT';
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
    warehouseId: number;
    warehouseName: string;
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
  productId: number;
  warehouseId: number;
  thresholdLevel: number;
  reorderQuantity: number;
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
