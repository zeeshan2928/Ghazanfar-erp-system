-- CreateEnum for NotificationType
CREATE TYPE "NotificationType" AS ENUM (
  'BILL_APPROVED',
  'BILL_PAID',
  'BILL_PAYMENT_DUE',
  'PO_APPROVED',
  'PO_RECEIVED',
  'PO_DELAYED',
  'INVENTORY_LOW',
  'INVENTORY_CRITICAL',
  'USER_INVITE',
  'ROLE_CHANGED',
  'CUSTOM'
);

-- CreateEnum for AuditAction
CREATE TYPE "AuditAction" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATUS_CHANGE',
  'EXPORT',
  'IMPORT'
);

-- CreateEnum for EmailTemplateType
CREATE TYPE "EmailTemplateType" AS ENUM (
  'INVOICE',
  'PAYMENT_REMINDER',
  'PO_CONFIRMATION',
  'SHIPMENT_NOTIFICATION',
  'DELIVERY_CONFIRMATION',
  'USER_INVITE',
  'BILL_APPROVAL',
  'PO_APPROVAL'
);

-- CreateEnum for UserRole
CREATE TYPE "UserRole" AS ENUM (
  'ADMIN',
  'MANAGER',
  'STAFF',
  'VIEWER'
);

-- CreateTable Notification
CREATE TABLE "Notification" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" JSONB,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable NotificationTemplate
CREATE TABLE "NotificationTemplate" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "type" "NotificationType" NOT NULL,
  "emailSubject" TEXT NOT NULL,
  "emailBody" TEXT NOT NULL,
  "smsTemplate" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable NotificationLog
CREATE TABLE "NotificationLog" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "recipient" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'EMAIL',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "maxRetries" INTEGER NOT NULL DEFAULT 3,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable NotificationPreference
CREATE TABLE "NotificationPreference" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "billApprovalEmail" BOOLEAN NOT NULL DEFAULT true,
  "billPaidEmail" BOOLEAN NOT NULL DEFAULT true,
  "paymentDueEmail" BOOLEAN NOT NULL DEFAULT true,
  "poApprovalEmail" BOOLEAN NOT NULL DEFAULT true,
  "poReceivedEmail" BOOLEAN NOT NULL DEFAULT true,
  "poDelayedEmail" BOOLEAN NOT NULL DEFAULT true,
  "inventoryLowEmail" BOOLEAN NOT NULL DEFAULT true,
  "inventoryLowSMS" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "userId" INTEGER,
  "entity" TEXT NOT NULL,
  "entityId" INTEGER NOT NULL,
  "action" "AuditAction" NOT NULL,
  "changes" JSONB,
  "oldData" JSONB,
  "newData" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable EmailTemplate
CREATE TABLE "EmailTemplate" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER,
  "type" "EmailTemplateType" NOT NULL,
  "subject" TEXT NOT NULL,
  "htmlBody" TEXT NOT NULL,
  "textBody" TEXT,
  "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable EmailLog
CREATE TABLE "EmailLog" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "templateType" "EmailTemplateType",
  "to" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "errorMessage" TEXT,
  "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable UserRoleAssignment
CREATE TABLE "UserRoleAssignment" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "role" "UserRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable FieldPermission
CREATE TABLE "FieldPermission" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "entity" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "canRead" BOOLEAN NOT NULL DEFAULT true,
  "canWrite" BOOLEAN NOT NULL DEFAULT true,
  "maskSensitiveData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FieldPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on Notification
CREATE INDEX "Notification_organizationId_userId_isRead_createdAt_idx" ON "Notification"("organizationId", "userId", "isRead", "createdAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex on NotificationTemplate
CREATE INDEX "NotificationTemplate_organizationId_type_idx" ON "NotificationTemplate"("organizationId", "type");

-- CreateIndex on NotificationLog
CREATE INDEX "NotificationLog_organizationId_userId_sentAt_idx" ON "NotificationLog"("organizationId", "userId", "sentAt");
CREATE INDEX "NotificationLog_status_retryCount_idx" ON "NotificationLog"("status", "retryCount");

-- CreateIndex on NotificationPreference
CREATE UNIQUE INDEX "NotificationPreference_organizationId_userId_key" ON "NotificationPreference"("organizationId", "userId");
CREATE INDEX "NotificationPreference_organizationId_userId_idx" ON "NotificationPreference"("organizationId", "userId");

-- CreateIndex on AuditLog
CREATE INDEX "AuditLog_organizationId_entity_entityId_createdAt_idx" ON "AuditLog"("organizationId", "entity", "entityId", "createdAt");
CREATE INDEX "AuditLog_organizationId_userId_createdAt_idx" ON "AuditLog"("organizationId", "userId", "createdAt");
CREATE INDEX "AuditLog_organizationId_action_createdAt_idx" ON "AuditLog"("organizationId", "action", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex on EmailTemplate
CREATE UNIQUE INDEX "EmailTemplate_type_key" ON "EmailTemplate"("type");
CREATE INDEX "EmailTemplate_type_isActive_idx" ON "EmailTemplate"("type", "isActive");

-- CreateIndex on EmailLog
CREATE INDEX "EmailLog_organizationId_sentAt_idx" ON "EmailLog"("organizationId", "sentAt");
CREATE INDEX "EmailLog_to_status_idx" ON "EmailLog"("to", "status");

-- CreateIndex on UserRoleAssignment
CREATE UNIQUE INDEX "UserRoleAssignment_organizationId_userId_key" ON "UserRoleAssignment"("organizationId", "userId");
CREATE INDEX "UserRoleAssignment_organizationId_role_idx" ON "UserRoleAssignment"("organizationId", "role");

-- CreateIndex on FieldPermission
CREATE UNIQUE INDEX "FieldPermission_organizationId_entity_field_role_key" ON "FieldPermission"("organizationId", "entity", "field", "role");
CREATE INDEX "FieldPermission_organizationId_entity_role_idx" ON "FieldPermission"("organizationId", "entity", "role");

-- AddForeignKey Notification
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey NotificationTemplate
ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey NotificationLog
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey NotificationPreference
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey AuditLog
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey EmailTemplate
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey EmailLog
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey UserRoleAssignment
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey FieldPermission
ALTER TABLE "FieldPermission" ADD CONSTRAINT "FieldPermission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
