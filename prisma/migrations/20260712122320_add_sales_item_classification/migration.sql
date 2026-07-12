-- CreateTable
CREATE TABLE "SalesItemClassification" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesItemClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesItemClassification_organizationId_kind_idx" ON "SalesItemClassification"("organizationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "SalesItemClassification_organizationId_itemName_key" ON "SalesItemClassification"("organizationId", "itemName");

-- AddForeignKey
ALTER TABLE "SalesItemClassification" ADD CONSTRAINT "SalesItemClassification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
