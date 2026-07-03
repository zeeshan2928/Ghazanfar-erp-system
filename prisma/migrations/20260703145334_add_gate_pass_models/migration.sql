-- CreateEnum
CREATE TYPE "GatePassStatus" AS ENUM ('PENDING', 'PICKED', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "GatePass" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "gate_pass_number" TEXT NOT NULL,
    "gate_pass_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "status" "GatePassStatus" NOT NULL DEFAULT 'PENDING',
    "picked_by" INTEGER,
    "picked_date" TIMESTAMP(3),
    "confirmed_by" INTEGER,
    "confirmed_date" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatePass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatePassItem" (
    "id" SERIAL NOT NULL,
    "gatePassId" INTEGER NOT NULL,
    "billLineId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "picked_quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GatePassItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GatePass_organizationId_warehouseId_status_idx" ON "GatePass"("organizationId", "warehouseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GatePass_organizationId_gate_pass_number_key" ON "GatePass"("organizationId", "gate_pass_number");

-- CreateIndex
CREATE INDEX "GatePassItem_gatePassId_productId_idx" ON "GatePassItem"("gatePassId", "productId");

-- AddForeignKey
ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatePassItem" ADD CONSTRAINT "GatePassItem_gatePassId_fkey" FOREIGN KEY ("gatePassId") REFERENCES "GatePass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatePassItem" ADD CONSTRAINT "GatePassItem_billLineId_fkey" FOREIGN KEY ("billLineId") REFERENCES "BillLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
