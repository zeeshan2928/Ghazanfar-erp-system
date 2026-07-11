-- CreateEnum
CREATE TYPE "AssemblyFamily" AS ENUM ('JUICER', 'BLENDER');

-- CreateTable
CREATE TABLE "AssemblyPart" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "family" "AssemblyFamily" NOT NULL,
    "name" TEXT NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "hadPriceConflict" BOOLEAN NOT NULL DEFAULT false,
    "conflictNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssemblyPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyFormula" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "family" "AssemblyFamily" NOT NULL,
    "label" TEXT NOT NULL,
    "productCodes" TEXT[],
    "sourceFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssemblyFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyFormulaLine" (
    "id" SERIAL NOT NULL,
    "formulaId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,

    CONSTRAINT "AssemblyFormulaLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssemblyPart_organizationId_family_idx" ON "AssemblyPart"("organizationId", "family");

-- CreateIndex
CREATE UNIQUE INDEX "AssemblyPart_organizationId_family_name_key" ON "AssemblyPart"("organizationId", "family", "name");

-- CreateIndex
CREATE INDEX "AssemblyFormula_organizationId_family_idx" ON "AssemblyFormula"("organizationId", "family");

-- CreateIndex
CREATE UNIQUE INDEX "AssemblyFormula_organizationId_label_key" ON "AssemblyFormula"("organizationId", "label");

-- CreateIndex
CREATE INDEX "AssemblyFormulaLine_formulaId_idx" ON "AssemblyFormulaLine"("formulaId");

-- CreateIndex
CREATE INDEX "AssemblyFormulaLine_partId_idx" ON "AssemblyFormulaLine"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "AssemblyFormulaLine_formulaId_partId_key" ON "AssemblyFormulaLine"("formulaId", "partId");

-- AddForeignKey
ALTER TABLE "AssemblyPart" ADD CONSTRAINT "AssemblyPart_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyFormula" ADD CONSTRAINT "AssemblyFormula_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyFormulaLine" ADD CONSTRAINT "AssemblyFormulaLine_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "AssemblyFormula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyFormulaLine" ADD CONSTRAINT "AssemblyFormulaLine_partId_fkey" FOREIGN KEY ("partId") REFERENCES "AssemblyPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
