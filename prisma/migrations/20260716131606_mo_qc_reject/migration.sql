-- AlterTable
ALTER TABLE "ManufacturingOrder" ADD COLUMN     "quantityRejected" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectReason" TEXT;
