-- Normalized item name: the sound key for resolving a sale's cost from the
-- purchase file. productCode (the leading number) is a shelf code shared by
-- dozens of unrelated products and must never be used to resolve cost.
ALTER TABLE "SalesAnalysisRecord"    ADD COLUMN "itemKey" TEXT;
ALTER TABLE "PurchaseAnalysisRecord" ADD COLUMN "itemKey" TEXT;

-- Backfill existing rows with the same normalization the importer now applies.
UPDATE "SalesAnalysisRecord"
   SET "itemKey" = lower(btrim(regexp_replace("itemRaw", '\s+', ' ', 'g')));
UPDATE "PurchaseAnalysisRecord"
   SET "itemKey" = lower(btrim(regexp_replace("itemRaw", '\s+', ' ', 'g')));

CREATE INDEX "SalesAnalysisRecord_organizationId_itemKey_idx"
    ON "SalesAnalysisRecord"("organizationId", "itemKey");
CREATE INDEX "PurchaseAnalysisRecord_organizationId_itemKey_transactionDate_idx"
    ON "PurchaseAnalysisRecord"("organizationId", "itemKey", "transactionDate");

-- Cost for models we assemble rather than buy: mapped to a BOM formula whose
-- cost is derived from the shared parts catalog.
CREATE TABLE "AssembledItemCost" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "itemKey" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "formulaId" INTEGER,
    "manualCost" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssembledItemCost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssembledItemCost_organizationId_itemKey_key"
    ON "AssembledItemCost"("organizationId", "itemKey");
CREATE INDEX "AssembledItemCost_organizationId_idx" ON "AssembledItemCost"("organizationId");
CREATE INDEX "AssembledItemCost_formulaId_idx"      ON "AssembledItemCost"("formulaId");

ALTER TABLE "AssembledItemCost" ADD CONSTRAINT "AssembledItemCost_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssembledItemCost" ADD CONSTRAINT "AssembledItemCost_formulaId_fkey"
    FOREIGN KEY ("formulaId") REFERENCES "AssemblyFormula"("id") ON DELETE SET NULL ON UPDATE CASCADE;
