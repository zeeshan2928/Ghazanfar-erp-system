CREATE TABLE "TransactionSequence" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "docType" TEXT NOT NULL,
    "currentBlock" INTEGER NOT NULL DEFAULT 1,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransactionSequence_organizationId_docType_key" ON "TransactionSequence"("organizationId", "docType");

ALTER TABLE "TransactionSequence" ADD CONSTRAINT "TransactionSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JournalEntry" ADD COLUMN "entryNumber" TEXT;
CREATE UNIQUE INDEX "JournalEntry_organizationId_entryNumber_key" ON "JournalEntry"("organizationId", "entryNumber");

ALTER TABLE "CashBookEntry" ADD COLUMN "entryNumber" TEXT;
ALTER TABLE "CashBookEntry" ALTER COLUMN "referenceNumber" DROP NOT NULL;
CREATE UNIQUE INDEX "CashBookEntry_organizationId_entryNumber_key" ON "CashBookEntry"("organizationId", "entryNumber");
