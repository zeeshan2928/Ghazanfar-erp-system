-- AlterTable
ALTER TABLE "PurchaseReturnItem" ADD COLUMN     "warehouseId" INTEGER;

-- CreateIndex
CREATE INDEX "PurchaseReturnItem_warehouseId_idx" ON "PurchaseReturnItem"("warehouseId");

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

