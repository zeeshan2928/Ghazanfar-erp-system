-- AlterTable
ALTER TABLE "ManufacturingOrderLine" ADD COLUMN     "componentBatch" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrderReceipt" ADD COLUMN     "batch_number" TEXT;
