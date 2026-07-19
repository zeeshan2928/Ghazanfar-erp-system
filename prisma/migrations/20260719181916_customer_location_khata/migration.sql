-- CreateEnum
CREATE TYPE "CityStatus" AS ENUM ('APPROVED', 'PENDING');

-- CreateEnum
CREATE TYPE "CustomerAccountType" AS ENUM ('KHATA', 'WALK_IN');

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "city",
ADD COLUMN     "accountType" "CustomerAccountType" NOT NULL DEFAULT 'WALK_IN',
ADD COLUMN     "cityId" INTEGER;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "cityId" INTEGER;

-- CreateTable
CREATE TABLE "Province" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "status" "CityStatus" NOT NULL DEFAULT 'APPROVED',
    "requestedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Province_name_key" ON "Province"("name");

-- CreateIndex
CREATE INDEX "Province_isActive_idx" ON "Province"("isActive");

-- CreateIndex
CREATE INDEX "City_provinceId_status_idx" ON "City"("provinceId", "status");

-- CreateIndex
CREATE INDEX "City_status_idx" ON "City"("status");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_provinceId_key" ON "City"("name", "provinceId");

-- CreateIndex
CREATE INDEX "Customer_organizationId_accountType_idx" ON "Customer"("organizationId", "accountType");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

