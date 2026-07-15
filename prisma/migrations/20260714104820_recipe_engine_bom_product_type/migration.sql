-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('RAW_MATERIAL', 'SERVICE', 'FINISHED_GOOD', 'ASSEMBLED_GOOD');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'FINISHED_GOOD',
ALTER COLUMN "cost_price" SET DEFAULT 0,
ALTER COLUMN "cost_price" SET DATA TYPE DECIMAL(12,2);

-- CreateTable
CREATE TABLE "Bom" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "outputQuantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomLine" (
    "id" SERIAL NOT NULL,
    "bomId" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "slotName" TEXT NOT NULL,
    "componentProductId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,

    CONSTRAINT "BomLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomLineAlternate" (
    "id" SERIAL NOT NULL,
    "bomLineId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "BomLineAlternate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bom_organizationId_productId_isActive_idx" ON "Bom"("organizationId", "productId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Bom_organizationId_productId_version_key" ON "Bom"("organizationId", "productId", "version");

-- CreateIndex
CREATE INDEX "BomLine_bomId_idx" ON "BomLine"("bomId");

-- CreateIndex
CREATE INDEX "BomLine_componentProductId_idx" ON "BomLine"("componentProductId");

-- CreateIndex
CREATE UNIQUE INDEX "BomLine_bomId_slotName_key" ON "BomLine"("bomId", "slotName");

-- CreateIndex
CREATE INDEX "BomLineAlternate_bomLineId_idx" ON "BomLineAlternate"("bomLineId");

-- CreateIndex
CREATE INDEX "BomLineAlternate_productId_idx" ON "BomLineAlternate"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BomLineAlternate_bomLineId_productId_key" ON "BomLineAlternate"("bomLineId", "productId");

-- CreateIndex
CREATE INDEX "Product_organizationId_productType_idx" ON "Product"("organizationId", "productType");

-- AddForeignKey
ALTER TABLE "Bom" ADD CONSTRAINT "Bom_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bom" ADD CONSTRAINT "Bom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLine" ADD CONSTRAINT "BomLine_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "Bom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLine" ADD CONSTRAINT "BomLine_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLineAlternate" ADD CONSTRAINT "BomLineAlternate_bomLineId_fkey" FOREIGN KEY ("bomLineId") REFERENCES "BomLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLineAlternate" ADD CONSTRAINT "BomLineAlternate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "PurchaseAnalysisRecord_organizationId_itemKey_transactionDate_i" RENAME TO "PurchaseAnalysisRecord_organizationId_itemKey_transactionDa_idx";
