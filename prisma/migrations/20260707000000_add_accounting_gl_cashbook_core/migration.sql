-- Reconstructed migration: the accounting/GL/cash-book core (ChartOfAccount,
-- JournalEntry, JournalEntryLine, GLPosting, Budget, CashBookEntry and its
-- related tables) was never actually captured in any migration file - it
-- exists in already-established dev databases only because it was applied
-- out-of-band at some point before migration history was cleaned up
-- (2026-07-06 audit). A fresh database has no way to create these tables at
-- all, and the very next migration (add_journal_entry_created_by) assumes
-- JournalEntry already exists. This migration recreates that missing base,
-- in the "before" shape the following migrations expect to ALTER (no
-- accountCategory/isCashAccount on ChartOfAccount yet, no createdBy/
-- entryNumber on JournalEntry yet, GLPosting still has its later-dropped
-- "balance" column, CashBookEntry has no entryNumber yet and referenceNumber
-- is still required) - found while deploying to a fresh VPS database.

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "CashBookCategory" AS ENUM ('SALES_RECEIPT', 'PURCHASE_PAYMENT', 'OPERATING_EXPENSE', 'LOAN_PAYMENT', 'LOAN_RECEIVED', 'EQUIPMENT', 'OTHER_INCOME', 'OTHER_EXPENSE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHEQUE', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CREDIT');

-- CreateEnum
CREATE TYPE "CashBookEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'RECONCILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashBookMatchStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'UNDONE');

-- CreateEnum
CREATE TYPE "CashBookApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CashBookAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'COMMENT_ADDED');

-- CreateTable
CREATE TABLE "ChartOfAccount" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "parentAccountId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "postedDate" TIMESTAMP(3),
    "reversalEntryId" INTEGER,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntryLine" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "description" TEXT,
    "debitAmount" INTEGER NOT NULL DEFAULT 0,
    "creditAmount" INTEGER NOT NULL DEFAULT 0,
    "lineNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntryLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GLPosting" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "postingDate" TIMESTAMP(3) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "debitAmount" INTEGER NOT NULL DEFAULT 0,
    "creditAmount" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GLPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "budgetAmount" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBookEntry" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" "CashBookCategory" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "linkedBillId" INTEGER,
    "status" "CashBookEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashBookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBookMatch" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "billId" INTEGER NOT NULL,
    "entryId" INTEGER NOT NULL,
    "matchedAmount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "CashBookMatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashBookMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBookComment" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "entryId" INTEGER NOT NULL,
    "author" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashBookComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBookApproval" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "entryId" INTEGER NOT NULL,
    "status" "CashBookApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashBookApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBookAudit" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "entryId" INTEGER NOT NULL,
    "action" "CashBookAuditAction" NOT NULL,
    "performedBy" INTEGER NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashBookAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChartOfAccount_organizationId_accountCode_key" ON "ChartOfAccount"("organizationId", "accountCode");
CREATE INDEX "ChartOfAccount_organizationId_accountType_idx" ON "ChartOfAccount"("organizationId", "accountType");
CREATE INDEX "ChartOfAccount_organizationId_isActive_idx" ON "ChartOfAccount"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_reversalEntryId_key" ON "JournalEntry"("reversalEntryId");
CREATE INDEX "JournalEntry_organizationId_entryDate_idx" ON "JournalEntry"("organizationId", "entryDate");
CREATE INDEX "JournalEntry_organizationId_status_idx" ON "JournalEntry"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntryLine_entryId_lineNumber_key" ON "JournalEntryLine"("entryId", "lineNumber");
CREATE INDEX "JournalEntryLine_entryId_idx" ON "JournalEntryLine"("entryId");
CREATE INDEX "JournalEntryLine_accountId_idx" ON "JournalEntryLine"("accountId");

-- CreateIndex
CREATE INDEX "GLPosting_organizationId_accountId_idx" ON "GLPosting"("organizationId", "accountId");
CREATE INDEX "GLPosting_organizationId_postingDate_idx" ON "GLPosting"("organizationId", "postingDate");
CREATE INDEX "GLPosting_accountId_postingDate_idx" ON "GLPosting"("accountId", "postingDate");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_organizationId_accountId_fiscalYear_period_key" ON "Budget"("organizationId", "accountId", "fiscalYear", "period");
CREATE INDEX "Budget_organizationId_fiscalYear_idx" ON "Budget"("organizationId", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "CashBookEntry_organizationId_referenceNumber_key" ON "CashBookEntry"("organizationId", "referenceNumber");
CREATE INDEX "CashBookEntry_organizationId_date_idx" ON "CashBookEntry"("organizationId", "date");
CREATE INDEX "CashBookEntry_organizationId_category_idx" ON "CashBookEntry"("organizationId", "category");
CREATE INDEX "CashBookEntry_linkedBillId_idx" ON "CashBookEntry"("linkedBillId");
CREATE INDEX "CashBookEntry_createdBy_idx" ON "CashBookEntry"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "CashBookMatch_organizationId_billId_entryId_key" ON "CashBookMatch"("organizationId", "billId", "entryId");
CREATE INDEX "CashBookMatch_organizationId_status_idx" ON "CashBookMatch"("organizationId", "status");
CREATE INDEX "CashBookMatch_billId_idx" ON "CashBookMatch"("billId");
CREATE INDEX "CashBookMatch_entryId_idx" ON "CashBookMatch"("entryId");

-- CreateIndex
CREATE INDEX "BankStatement_organizationId_date_idx" ON "BankStatement"("organizationId", "date");
CREATE INDEX "BankStatement_organizationId_referenceNumber_idx" ON "BankStatement"("organizationId", "referenceNumber");

-- CreateIndex
CREATE INDEX "CashBookComment_organizationId_entryId_idx" ON "CashBookComment"("organizationId", "entryId");
CREATE INDEX "CashBookComment_entryId_idx" ON "CashBookComment"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "CashBookApproval_entryId_key" ON "CashBookApproval"("entryId");
CREATE INDEX "CashBookApproval_organizationId_status_idx" ON "CashBookApproval"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CashBookAudit_organizationId_entryId_idx" ON "CashBookAudit"("organizationId", "entryId");
CREATE INDEX "CashBookAudit_organizationId_createdAt_idx" ON "CashBookAudit"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversalEntryId_fkey" FOREIGN KEY ("reversalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLPosting" ADD CONSTRAINT "GLPosting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GLPosting" ADD CONSTRAINT "GLPosting_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBookEntry" ADD CONSTRAINT "CashBookEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashBookEntry" ADD CONSTRAINT "CashBookEntry_linkedBillId_fkey" FOREIGN KEY ("linkedBillId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashBookEntry" ADD CONSTRAINT "CashBookEntry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBookMatch" ADD CONSTRAINT "CashBookMatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashBookMatch" ADD CONSTRAINT "CashBookMatch_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashBookMatch" ADD CONSTRAINT "CashBookMatch_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CashBookEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashBookMatch" ADD CONSTRAINT "CashBookMatch_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBookComment" ADD CONSTRAINT "CashBookComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashBookComment" ADD CONSTRAINT "CashBookComment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CashBookEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashBookComment" ADD CONSTRAINT "CashBookComment_author_fkey" FOREIGN KEY ("author") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBookApproval" ADD CONSTRAINT "CashBookApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashBookApproval" ADD CONSTRAINT "CashBookApproval_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CashBookEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashBookApproval" ADD CONSTRAINT "CashBookApproval_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBookAudit" ADD CONSTRAINT "CashBookAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashBookAudit" ADD CONSTRAINT "CashBookAudit_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CashBookEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashBookAudit" ADD CONSTRAINT "CashBookAudit_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
