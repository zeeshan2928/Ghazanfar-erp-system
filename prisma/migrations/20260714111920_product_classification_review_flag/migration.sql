-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "needsClassificationReview" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Product_organizationId_needsClassificationReview_idx" ON "Product"("organizationId", "needsClassificationReview");
