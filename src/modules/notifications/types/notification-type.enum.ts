/**
 * Declared as an enum in schema.prisma but never referenced by any model
 * field, so Prisma's generator doesn't export it from @prisma/client. Local
 * mirror of the same values so the code that already references them
 * compiles. See notifications.service.ts for the fuller missing-schema
 * context (no Notification/NotificationLog/NotificationPreference model
 * exists either).
 */
export enum NotificationType {
  BILL_APPROVAL = 'BILL_APPROVAL',
  BILL_PAID = 'BILL_PAID',
  PAYMENT_DUE = 'PAYMENT_DUE',
  PO_APPROVAL = 'PO_APPROVAL',
  PO_RECEIVED = 'PO_RECEIVED',
  PO_DELAYED = 'PO_DELAYED',
  INVENTORY_LOW = 'INVENTORY_LOW',
  GENERAL = 'GENERAL',
}
