INSERT INTO "Bill" (
  "organizationId", "billNumber", "customerId", "billDate", channel, 
  "createdBy", subtotal, "discountAmount", "discountPercentage", 
  "deliveryCharges", "taxAmount", "totalAmount", "paymentMethod", 
  remarks, status, "approvalStatus", "isActive", "createdAt", "updatedAt"
) VALUES (
  1, 'BILL-2026-001', 1, NOW(), 'COUNTER',
  1, 50000, 0, 0,
  0, 5400, 55400, 'CASH',
  'Test bill for Gate Pass', 'APPROVED', 'APPROVED', true, NOW(), NOW()
);
