/**
 * Not a Prisma enum - there is no EmailTemplateType in schema.prisma (nor an
 * EmailTemplate or EmailLog model). This module was built against a schema
 * that was never created; this local enum exists only to unblock the code
 * that already references these values. See email-template.service.ts for
 * where the missing Prisma models are worked around.
 */
export enum EmailTemplateType {
  INVOICE = 'INVOICE',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  PO_CONFIRMATION = 'PO_CONFIRMATION',
  SHIPMENT_NOTIFICATION = 'SHIPMENT_NOTIFICATION',
  DELIVERY_CONFIRMATION = 'DELIVERY_CONFIRMATION',
  USER_INVITE = 'USER_INVITE',
}
