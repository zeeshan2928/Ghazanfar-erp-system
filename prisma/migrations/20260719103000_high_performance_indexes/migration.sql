-- CreateIndex
CREATE INDEX "Bill_organizationId_status_bill_date_idx" ON "Bill"("organizationId", "status", "bill_date");

-- CreateIndex
CREATE INDEX "Bill_organizationId_payment_method_idx" ON "Bill"("organizationId", "payment_method");

-- CreateIndex
CREATE INDEX "Customer_organizationId_isActive_idx" ON "Customer"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "Product_organizationId_categoryId_isActive_idx" ON "Product"("organizationId", "categoryId", "isActive");

-- CreateIndex
CREATE INDEX "Product_organizationId_brandId_isActive_idx" ON "Product"("organizationId", "brandId", "isActive");

-- Add pg_trgm extension for GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN Indexes for fast text searching
CREATE INDEX idx_product_search ON "Product" USING GIN (name gin_trgm_ops, code gin_trgm_ops);
CREATE INDEX idx_customer_search ON "Customer" USING GIN (name gin_trgm_ops, phone gin_trgm_ops);
