-- CreateTable
CREATE TABLE "SalesAnalysisUpload" (
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

    CONSTRAINT "SalesAnalysisUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesAnalysisRecord" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "uploadId" INTEGER NOT NULL,
    "billNumber" TEXT NOT NULL,
    "lineSequence" INTEGER NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "accountName" TEXT,
    "customerName" TEXT,
    "salesmanName" TEXT,
    "itemRaw" TEXT NOT NULL,
    "productCode" TEXT,
    "productId" INTEGER,
    "quantity" DECIMAL(12,2) NOT NULL,
    "soldPrice" DECIMAL(12,2) NOT NULL,
    "lineAmount" DECIMAL(14,2) NOT NULL,
    "costPriceAtSale" INTEGER,
    "profitAmount" DECIMAL(14,2),
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesAnalysisRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesAnalysisUpload_organizationId_reportStartDate_reportEn_idx" ON "SalesAnalysisUpload"("organizationId", "reportStartDate", "reportEndDate");

-- CreateIndex
CREATE INDEX "SalesAnalysisRecord_organizationId_transactionDate_idx" ON "SalesAnalysisRecord"("organizationId", "transactionDate");

-- CreateIndex
CREATE INDEX "SalesAnalysisRecord_organizationId_salesmanName_idx" ON "SalesAnalysisRecord"("organizationId", "salesmanName");

-- CreateIndex
CREATE INDEX "SalesAnalysisRecord_organizationId_productId_idx" ON "SalesAnalysisRecord"("organizationId", "productId");

-- CreateIndex
CREATE INDEX "SalesAnalysisRecord_organizationId_accountName_idx" ON "SalesAnalysisRecord"("organizationId", "accountName");

-- CreateIndex
CREATE UNIQUE INDEX "SalesAnalysisRecord_organizationId_billNumber_lineSequence_key" ON "SalesAnalysisRecord"("organizationId", "billNumber", "lineSequence");

-- AddForeignKey
ALTER TABLE "SalesAnalysisUpload" ADD CONSTRAINT "SalesAnalysisUpload_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAnalysisUpload" ADD CONSTRAINT "SalesAnalysisUpload_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAnalysisRecord" ADD CONSTRAINT "SalesAnalysisRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAnalysisRecord" ADD CONSTRAINT "SalesAnalysisRecord_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "SalesAnalysisUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAnalysisRecord" ADD CONSTRAINT "SalesAnalysisRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
