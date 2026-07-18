-- Effective-dated cost timeline for products. Purely additive: Product.cost_price
-- is untouched and remains the single "current cost" every existing read uses.
CREATE TABLE "ProductCostHistory" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "costPrice" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductCostHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductCostHistory_organizationId_productId_effectiveFrom_idx"
    ON "ProductCostHistory"("organizationId", "productId", "effectiveFrom");
CREATE INDEX "ProductCostHistory_productId_idx" ON "ProductCostHistory"("productId");

ALTER TABLE "ProductCostHistory" ADD CONSTRAINT "ProductCostHistory_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCostHistory" ADD CONSTRAINT "ProductCostHistory_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Baseline: one row per existing product, its current cost, dated at the start
-- of the business data horizon (the earliest sales record, or the product's
-- creation date if earlier / no sales) rather than the import date. This makes
-- the baseline reach back far enough that any real dated price change lands
-- AFTER it, and costing a historical sale resolves to this opening cost.
INSERT INTO "ProductCostHistory" ("organizationId", "productId", "costPrice", "effectiveFrom", "note", "changedBy", "createdAt")
SELECT p."organizationId", p."id", p."cost_price",
       LEAST(
         p."createdAt",
         COALESCE((SELECT MIN(s."transactionDate") FROM "SalesAnalysisRecord" s WHERE s."organizationId" = p."organizationId"), p."createdAt")
       ),
       'Baseline — opening cost when history tracking began', 'system', CURRENT_TIMESTAMP
FROM "Product" p;
