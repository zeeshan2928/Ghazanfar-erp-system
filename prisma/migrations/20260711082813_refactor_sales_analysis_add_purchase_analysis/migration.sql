/*
  Warnings:

  - You are about to drop the column `costPriceAtSale` on the `SalesAnalysisRecord` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `SalesAnalysisRecord` table. All the data in the column will be lost.
  - You are about to drop the column `profitAmount` on the `SalesAnalysisRecord` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SalesAnalysisRecord" DROP CONSTRAINT "SalesAnalysisRecord_productId_fkey";

-- DropIndex
DROP INDEX "SalesAnalysisRecord_organizationId_productId_idx";

-- AlterTable
ALTER TABLE "SalesAnalysisRecord" DROP COLUMN "costPriceAtSale",
DROP COLUMN "productId",
DROP COLUMN "profitAmount";

-- CreateTable
CREATE TABLE "PurchaseAnalysisUpload" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "reportStartDate" TIMESTAMP(3) NOT NULL,
    "reportEndDate" TIMESTAMP(3) NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseAnalysisUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseAnalysisRecord" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "uploadId" INTEGER NOT NULL,
    "billNumber" TEXT NOT NULL,
    "lineSequence" INTEGER NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "vendorName" TEXT,
    "itemRaw" TEXT NOT NULL,
    "productCode" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "lineAmount" DECIMAL(14,2) NOT NULL,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseAnalysisRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseAnalysisUpload_organizationId_reportStartDate_repor_idx" ON "PurchaseAnalysisUpload"("organizationId", "reportStartDate", "reportEndDate");

-- CreateIndex
CREATE INDEX "PurchaseAnalysisRecord_organizationId_transactionDate_idx" ON "PurchaseAnalysisRecord"("organizationId", "transactionDate");

-- CreateIndex
CREATE INDEX "PurchaseAnalysisRecord_organizationId_vendorName_idx" ON "PurchaseAnalysisRecord"("organizationId", "vendorName");

-- CreateIndex
CREATE INDEX "PurchaseAnalysisRecord_organizationId_productCode_idx" ON "PurchaseAnalysisRecord"("organizationId", "productCode");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseAnalysisRecord_organizationId_billNumber_lineSequen_key" ON "PurchaseAnalysisRecord"("organizationId", "billNumber", "lineSequence");

-- CreateIndex
CREATE INDEX "SalesAnalysisRecord_organizationId_productCode_idx" ON "SalesAnalysisRecord"("organizationId", "productCode");

-- AddForeignKey
ALTER TABLE "PurchaseAnalysisUpload" ADD CONSTRAINT "PurchaseAnalysisUpload_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseAnalysisUpload" ADD CONSTRAINT "PurchaseAnalysisUpload_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseAnalysisRecord" ADD CONSTRAINT "PurchaseAnalysisRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseAnalysisRecord" ADD CONSTRAINT "PurchaseAnalysisRecord_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "PurchaseAnalysisUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
