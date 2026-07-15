-- CreateEnum
CREATE TYPE "ManufacturingOrderStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryMovementType" ADD VALUE 'MANUFACTURE_IN';
ALTER TYPE "InventoryMovementType" ADD VALUE 'MANUFACTURE_OUT';

-- CreateTable
CREATE TABLE "ManufacturingOrder" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "bomId" INTEGER NOT NULL,
    "finishedProductId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "quantityPlanned" INTEGER NOT NULL,
    "quantityProduced" INTEGER NOT NULL DEFAULT 0,
    "status" "ManufacturingOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "unitCostSnapshot" DECIMAL(12,2),
    "createdBy" INTEGER NOT NULL,
    "completedBy" INTEGER,
    "completedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturingOrderLine" (
    "id" SERIAL NOT NULL,
    "manufacturingOrderId" INTEGER NOT NULL,
    "slotName" TEXT NOT NULL,
    "componentProductId" INTEGER NOT NULL,
    "quantityRequired" DECIMAL(12,4) NOT NULL,
    "quantityConsumed" DECIMAL(12,4),
    "unitCostSnapshot" DECIMAL(12,2),

    CONSTRAINT "ManufacturingOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManufacturingOrder_organizationId_status_idx" ON "ManufacturingOrder"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ManufacturingOrder_organizationId_createdAt_idx" ON "ManufacturingOrder"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturingOrder_organizationId_orderNumber_key" ON "ManufacturingOrder"("organizationId", "orderNumber");

-- CreateIndex
CREATE INDEX "ManufacturingOrderLine_manufacturingOrderId_idx" ON "ManufacturingOrderLine"("manufacturingOrderId");

-- AddForeignKey
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "Bom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_finishedProductId_fkey" FOREIGN KEY ("finishedProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOrderLine" ADD CONSTRAINT "ManufacturingOrderLine_manufacturingOrderId_fkey" FOREIGN KEY ("manufacturingOrderId") REFERENCES "ManufacturingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOrderLine" ADD CONSTRAINT "ManufacturingOrderLine_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
