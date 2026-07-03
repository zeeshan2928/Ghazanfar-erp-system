-- Add search optimization indexes for Phase 4 search system

-- Bills/Invoices search indexes
CREATE INDEX IF NOT EXISTS idx_bill_org_number ON "Bill"("organizationId", "bill_number");
CREATE INDEX IF NOT EXISTS idx_bill_org_customer ON "Bill"("organizationId", "customerId");
CREATE INDEX IF NOT EXISTS idx_bill_org_date ON "Bill"("organizationId", "bill_date");
CREATE INDEX IF NOT EXISTS idx_bill_org_status ON "Bill"("organizationId", "status");
CREATE INDEX IF NOT EXISTS idx_bill_org_amount ON "Bill"("organizationId", "grand_total");

-- Products search indexes
CREATE INDEX IF NOT EXISTS idx_product_org_name ON "Product"("organizationId", "name");
CREATE INDEX IF NOT EXISTS idx_product_org_code ON "Product"("organizationId", "code");
CREATE INDEX IF NOT EXISTS idx_product_org_category ON "Product"("organizationId", "categoryId");
CREATE INDEX IF NOT EXISTS idx_product_org_brand ON "Product"("organizationId", "brandId");

-- Inventory/Stock search indexes
CREATE INDEX IF NOT EXISTS idx_inventory_org_product ON "Inventory"("organizationId", "productId");
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_date ON "Inventory"("warehouseId");
CREATE INDEX IF NOT EXISTS idx_inventory_org_warehouse ON "Inventory"("organizationId", "warehouseId");

-- Purchase Order search indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_org_status ON "PurchaseOrder"("organizationId", "status");
CREATE INDEX IF NOT EXISTS idx_purchase_order_org_number ON "PurchaseOrder"("organizationId", "po_number");
CREATE INDEX IF NOT EXISTS idx_purchase_order_vendor ON "PurchaseOrder"("vendorId");
CREATE INDEX IF NOT EXISTS idx_purchase_order_org_date ON "PurchaseOrder"("organizationId", "createdAt");

-- Customer search indexes
CREATE INDEX IF NOT EXISTS idx_customer_org_name ON "Customer"("organizationId", "name");
CREATE INDEX IF NOT EXISTS idx_customer_org_type ON "Customer"("organizationId", "customerType");
CREATE INDEX IF NOT EXISTS idx_customer_org_phone ON "Customer"("organizationId", "phone");
CREATE INDEX IF NOT EXISTS idx_customer_org_email ON "Customer"("organizationId", "email");
