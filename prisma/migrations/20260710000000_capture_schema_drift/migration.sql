-- Captures schema drift that accumulated because these tables/columns were
-- added to schema.prisma without ever generating a migration (same root
-- cause as the earlier accounting/GL/cash-book gap, but across the
-- inventory-management, commission, aging, notification, and product-catalog
-- features). Generated via `prisma migrate diff --from-url <freshly-migrated
-- db> --to-schema-datamodel prisma/schema.prisma --script` and verified to
-- bring a clean database to a zero-diff match against schema.prisma - found
-- while deploying to a fresh VPS database.

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'DAMAGE', 'SHRINKAGE', 'RETURN');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HoldType" AS ENUM ('QC_HOLD', 'DISPUTE', 'DAMAGED_PENDING', 'WARRANTY', 'LEGAL_HOLD');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BILL_APPROVAL', 'BILL_PAID', 'PAYMENT_DUE', 'PO_APPROVAL', 'PO_RECEIVED', 'PO_DELAYED', 'INVENTORY_LOW', 'GENERAL');

-- AlterEnum
ALTER TYPE "CustomerType" ADD VALUE 'WALK_IN';

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "amount_paid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "approvedAt" TIMESTAMP(6),
ADD COLUMN     "approvedBy" INTEGER,
ADD COLUMN     "cashbookNumber" INTEGER,
ADD COLUMN     "deliveryCharges" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountType" TEXT,
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "lastModifiedBy" INTEGER,
ADD COLUMN     "salesmanId" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "transactionType" TEXT NOT NULL DEFAULT 'SALE';

-- AlterTable
ALTER TABLE "BillLine" ADD COLUMN     "organizationId" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "GatePassItem" ADD COLUMN     "organizationId" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastReservedAt" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brandId" INTEGER;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "amount_paid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "po_amount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "unit_cost" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "creditLimit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "taxNumber" TEXT;

-- AlterTable
ALTER TABLE "WarehouseTransferItem" ADD COLUMN     "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "billId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "releaseType" TEXT,
    "releaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "remarks" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromInventoryId" INTEGER NOT NULL,
    "toInventoryId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" INTEGER NOT NULL,
    "receivedBy" INTEGER,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLevel" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "minimumQuantity" INTEGER NOT NULL DEFAULT 10,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 50,
    "maximumQuantity" INTEGER,
    "safetyStock" INTEGER NOT NULL DEFAULT 0,
    "lastReorderDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryHold" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "holdType" "HoldType" NOT NULL,
    "reason" TEXT,
    "createdBy" INTEGER NOT NULL,
    "approvedBy" INTEGER,
    "approvalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReconciliation" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "reconciliationDate" TIMESTAMP(3) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "countedBy" INTEGER NOT NULL,
    "approvedBy" INTEGER,
    "approvalDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReconciliationItem" (
    "id" SERIAL NOT NULL,
    "reconciliationId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "systemQuantity" INTEGER NOT NULL,
    "countedQuantity" INTEGER NOT NULL,
    "variance" INTEGER NOT NULL,
    "variancePercentage" DECIMAL(5,2) NOT NULL,
    "adjustmentId" INTEGER,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryReconciliationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryWarehouseTransfer" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromBillId" INTEGER,
    "toVendorId" INTEGER,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" INTEGER NOT NULL,
    "approvedBy" INTEGER,
    "approvalDate" TIMESTAMP(3),
    "processedDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryWarehouseTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "currentBlock" INTEGER NOT NULL DEFAULT 124,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT NOT NULL,
    "percentage" DECIMAL(5,2),
    "fixedAmount" INTEGER,
    "minSales" INTEGER,
    "maxSales" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionCalculation" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "salesPersonId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "baseSales" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedBy" INTEGER,
    "approvalDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArAging" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "billId" INTEGER,
    "customerId" INTEGER,
    "amount" INTEGER NOT NULL,
    "days_overdue" INTEGER NOT NULL,
    "ageing_bucket" TEXT NOT NULL,
    "as_of_date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArAging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApAging" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "purchaseOrderId" INTEGER,
    "vendorId" INTEGER,
    "amount" INTEGER NOT NULL,
    "days_overdue" INTEGER NOT NULL,
    "ageing_bucket" TEXT NOT NULL,
    "as_of_date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApAging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCommission" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesmanProductCommission" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "salesmanId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "commissionType" TEXT NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "targetQuantity" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paidAt" TIMESTAMP(3),
    "paidAmount" INTEGER,
    "journalEntryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesmanProductCommission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryReservation_billId_status_idx" ON "InventoryReservation"("billId", "status");

-- CreateIndex
CREATE INDEX "InventoryReservation_inventoryId_status_idx" ON "InventoryReservation"("inventoryId", "status");

-- CreateIndex
CREATE INDEX "InventoryReservation_organizationId_status_createdAt_idx" ON "InventoryReservation"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_organizationId_createdAt_idx" ON "InventoryMovement"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_inventoryId_movementType_idx" ON "InventoryMovement"("inventoryId", "movementType");

-- CreateIndex
CREATE INDEX "InventoryMovement_createdBy_createdAt_idx" ON "InventoryMovement"("createdBy", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_transferNumber_key" ON "InventoryTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "InventoryTransfer_organizationId_status_idx" ON "InventoryTransfer"("organizationId", "status");

-- CreateIndex
CREATE INDEX "InventoryTransfer_fromInventoryId_toInventoryId_idx" ON "InventoryTransfer"("fromInventoryId", "toInventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLevel_inventoryId_key" ON "InventoryLevel"("inventoryId");

-- CreateIndex
CREATE INDEX "InventoryLevel_organizationId_idx" ON "InventoryLevel"("organizationId");

-- CreateIndex
CREATE INDEX "InventoryLevel_inventoryId_idx" ON "InventoryLevel"("inventoryId");

-- CreateIndex
CREATE INDEX "InventoryHold_organizationId_holdType_idx" ON "InventoryHold"("organizationId", "holdType");

-- CreateIndex
CREATE INDEX "InventoryHold_inventoryId_holdType_idx" ON "InventoryHold"("inventoryId", "holdType");

-- CreateIndex
CREATE INDEX "InventoryReconciliation_organizationId_reconciliationDate_idx" ON "InventoryReconciliation"("organizationId", "reconciliationDate");

-- CreateIndex
CREATE INDEX "InventoryReconciliation_status_idx" ON "InventoryReconciliation"("status");

-- CreateIndex
CREATE INDEX "InventoryReconciliationItem_reconciliationId_idx" ON "InventoryReconciliationItem"("reconciliationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReconciliationItem_reconciliationId_inventoryId_key" ON "InventoryReconciliationItem"("reconciliationId", "inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryWarehouseTransfer_transferNumber_key" ON "InventoryWarehouseTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "InventoryWarehouseTransfer_organizationId_status_idx" ON "InventoryWarehouseTransfer"("organizationId", "status");

-- CreateIndex
CREATE INDEX "InventoryWarehouseTransfer_productId_idx" ON "InventoryWarehouseTransfer"("productId");

-- CreateIndex
CREATE INDEX "ProductCategory_organizationId_idx" ON "ProductCategory"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_organizationId_name_key" ON "ProductCategory"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Brand_organizationId_idx" ON "Brand"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_organizationId_name_key" ON "Brand"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSequence_organizationId_key" ON "InvoiceSequence"("organizationId");

-- CreateIndex
CREATE INDEX "CommissionRule_organizationId_idx" ON "CommissionRule"("organizationId");

-- CreateIndex
CREATE INDEX "CommissionRule_organizationId_isActive_idx" ON "CommissionRule"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "CommissionCalculation_organizationId_salesPersonId_idx" ON "CommissionCalculation"("organizationId", "salesPersonId");

-- CreateIndex
CREATE INDEX "CommissionCalculation_organizationId_status_idx" ON "CommissionCalculation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CommissionCalculation_ruleId_idx" ON "CommissionCalculation"("ruleId");

-- CreateIndex
CREATE INDEX "ArAging_organizationId_as_of_date_idx" ON "ArAging"("organizationId", "as_of_date");

-- CreateIndex
CREATE INDEX "ArAging_customerId_idx" ON "ArAging"("customerId");

-- CreateIndex
CREATE INDEX "ArAging_billId_idx" ON "ArAging"("billId");

-- CreateIndex
CREATE INDEX "ApAging_organizationId_as_of_date_idx" ON "ApAging"("organizationId", "as_of_date");

-- CreateIndex
CREATE INDEX "ApAging_vendorId_idx" ON "ApAging"("vendorId");

-- CreateIndex
CREATE INDEX "ApAging_purchaseOrderId_idx" ON "ApAging"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_userId_isRead_idx" ON "Notification"("organizationId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductCommission_organizationId_productId_idx" ON "ProductCommission"("organizationId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCommission_organizationId_productId_effectiveFrom_key" ON "ProductCommission"("organizationId", "productId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "SalesmanProductCommission_organizationId_salesmanId_idx" ON "SalesmanProductCommission"("organizationId", "salesmanId");

-- CreateIndex
CREATE INDEX "SalesmanProductCommission_organizationId_productId_idx" ON "SalesmanProductCommission"("organizationId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesmanProductCommission_organizationId_salesmanId_product_key" ON "SalesmanProductCommission"("organizationId", "salesmanId", "productId", "periodStart");

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_fromInventoryId_fkey" FOREIGN KEY ("fromInventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_toInventoryId_fkey" FOREIGN KEY ("toInventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReconciliation" ADD CONSTRAINT "InventoryReconciliation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReconciliation" ADD CONSTRAINT "InventoryReconciliation_countedBy_fkey" FOREIGN KEY ("countedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReconciliation" ADD CONSTRAINT "InventoryReconciliation_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReconciliationItem" ADD CONSTRAINT "InventoryReconciliationItem_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "InventoryReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReconciliationItem" ADD CONSTRAINT "InventoryReconciliationItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryWarehouseTransfer" ADD CONSTRAINT "InventoryWarehouseTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryWarehouseTransfer" ADD CONSTRAINT "InventoryWarehouseTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryWarehouseTransfer" ADD CONSTRAINT "InventoryWarehouseTransfer_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryWarehouseTransfer" ADD CONSTRAINT "InventoryWarehouseTransfer_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_lastModifiedBy_fkey" FOREIGN KEY ("lastModifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillLine" ADD CONSTRAINT "BillLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GatePassItem" ADD CONSTRAINT "GatePassItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionCalculation" ADD CONSTRAINT "CommissionCalculation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionCalculation" ADD CONSTRAINT "CommissionCalculation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionCalculation" ADD CONSTRAINT "CommissionCalculation_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionCalculation" ADD CONSTRAINT "CommissionCalculation_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArAging" ADD CONSTRAINT "ArAging_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArAging" ADD CONSTRAINT "ArAging_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApAging" ADD CONSTRAINT "ApAging_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApAging" ADD CONSTRAINT "ApAging_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCommission" ADD CONSTRAINT "ProductCommission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCommission" ADD CONSTRAINT "ProductCommission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesmanProductCommission" ADD CONSTRAINT "SalesmanProductCommission_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesmanProductCommission" ADD CONSTRAINT "SalesmanProductCommission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesmanProductCommission" ADD CONSTRAINT "SalesmanProductCommission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

