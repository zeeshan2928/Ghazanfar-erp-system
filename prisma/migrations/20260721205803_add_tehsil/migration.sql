-- CreateTable
CREATE TABLE "Tehsil" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tehsil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tehsil_cityId_isActive_idx" ON "Tehsil"("cityId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Tehsil_name_cityId_key" ON "Tehsil"("name", "cityId");

-- AddForeignKey
ALTER TABLE "Tehsil" ADD CONSTRAINT "Tehsil_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

