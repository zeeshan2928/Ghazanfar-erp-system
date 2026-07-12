-- AlterTable
ALTER TABLE "SalesAnalysisRecord" ADD COLUMN     "actualPrice" DECIMAL(12,2),
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "isReturn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "warehouseName" TEXT;

-- CreateTable
CREATE TABLE "ImportMappingTemplate" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "module" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "structure" TEXT NOT NULL DEFAULT 'FLAT',
    "mapping" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportMappingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportMappingTemplate_organizationId_module_idx" ON "ImportMappingTemplate"("organizationId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "ImportMappingTemplate_organizationId_module_signature_key" ON "ImportMappingTemplate"("organizationId", "module", "signature");

-- CreateIndex
CREATE INDEX "SalesAnalysisRecord_organizationId_category_idx" ON "SalesAnalysisRecord"("organizationId", "category");

-- CreateIndex
CREATE INDEX "SalesAnalysisRecord_organizationId_brand_idx" ON "SalesAnalysisRecord"("organizationId", "brand");

-- AddForeignKey
ALTER TABLE "ImportMappingTemplate" ADD CONSTRAINT "ImportMappingTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
