/**
 * Faker Utilities for Test Data Generation
 * Provides realistic data generation functions for testing and demo scenarios
 */

import { faker } from '@faker-js/faker';

// ============================================================================
//                       BILL UTILITIES
// ============================================================================

export function generateBillNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const sequence = String(Math.floor(Math.random() * 10000)).padStart(5, '0');
  return `BILL-${year}-${month}${day}${sequence}`;
}

export function generateBillDate(daysBack: number = 90): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date;
}

export function generateDueDate(billDate: Date, paymentTerms: number = 30): Date {
  const dueDate = new Date(billDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  return dueDate;
}

export function generateBillStatus(): string {
  const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

export function generatePaymentMethod(): string {
  const methods = ['BANK_TRANSFER', 'CASH', 'CHECK', 'CREDIT_CARD'];
  return methods[Math.floor(Math.random() * methods.length)];
}

export function generateChannel(): string {
  const channels = ['COUNTER', 'WHOLESALE', 'RETAIL', 'WEBSITE'];
  return channels[Math.floor(Math.random() * channels.length)];
}

// ============================================================================
//                    PURCHASE ORDER UTILITIES
// ============================================================================

export function generatePONumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const sequence = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `PO-${year}-${sequence}`;
}

export function generatePODate(daysBack: number = 60): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date;
}

export function generateExpectedDeliveryDate(poDate: Date, leadDays: number = 15): Date {
  const deliveryDate = new Date(poDate);
  deliveryDate.setDate(deliveryDate.getDate() + leadDays);
  return deliveryDate;
}

export function generatePOStatus(): string {
  const statuses = ['DRAFT', 'SENT', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// ============================================================================
//                      QUANTITY UTILITIES
// ============================================================================

export function generateRandomQuantity(min: number = 1, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateOrderQuantity(): number {
  return generateRandomQuantity(1, 500);
}

export function generateStockLevel(): number {
  const rand = Math.random();
  if (rand < 0.3) return generateRandomQuantity(0, 10); // Low stock
  if (rand < 0.7) return generateRandomQuantity(50, 200); // Normal
  if (rand < 0.9) return generateRandomQuantity(200, 1000); // High
  return 0; // Out of stock
}

// ============================================================================
//                       PRICE UTILITIES
// ============================================================================

export function generateRandomPrice(min: number = 1000, max: number = 100000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateUnitPrice(baseCost: number = 1000, marginPercent: number = 30): number {
  const margin = baseCost * (marginPercent / 100);
  const variance = baseCost * (Math.random() * 0.1 - 0.05); // +/- 5%
  return Math.round((baseCost + margin + variance) * 100) / 100;
}

export function generateDiscountPercentage(): number {
  const rand = Math.random();
  if (rand > 0.7) {
    return Math.floor(Math.random() * 10); // 0-10% discount
  }
  return 0; // No discount
}

export function generateTaxAmount(subtotal: number, taxRate: number = 0.17): number {
  return Math.round(subtotal * taxRate * 100) / 100;
}

// ============================================================================
//                    CONTACT & LOCATION UTILITIES
// ============================================================================

export function generatePakistaniPhone(): string {
  const operators = ['300', '301', '302', '303', '304', '305', '321', '322'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const number = String(Math.floor(Math.random() * 10000000)).padStart(7, '0');
  return `+92-${operator}-${number}`;
}

export function generateEmail(name: string, domain: string = 'test.com'): string {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@${domain}`;
}

export function generateBusinessName(): string {
  const prefixes = ['Global', 'Prime', 'Elite', 'Express', 'Fast', 'Smart', 'Quality'];
  const suffixes = [
    'Trading',
    'Wholesale',
    'Distribution',
    'Solutions',
    'Partners',
    'Group',
    'Enterprises',
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix} ${suffix} Ltd`;
}

export function generateWarehouseName(): string {
  const locations = ['Islamabad', 'Karachi', 'Lahore', 'Peshawar', 'Quetta', 'Multan'];
  const types = ['Distribution Center', 'Warehouse', 'Storage Facility', 'Regional Hub'];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  return `${location} ${type}`;
}

export function generateCreditLimit(): number {
  const creditLimits = [
    50000, 100000, 150000, 200000, 250000, 300000, 500000, 750000, 1000000, 1500000, 2000000,
    2500000, 5000000,
  ];
  return creditLimits[Math.floor(Math.random() * creditLimits.length)];
}

export function generatePaymentTerms(): number {
  const terms = [7, 15, 30, 45, 60, 90];
  return terms[Math.floor(Math.random() * terms.length)];
}

// ============================================================================
//                      CUSTOMER UTILITIES
// ============================================================================

export function generateCustomerType(): string {
  const types = ['RETAIL', 'WHOLESALE', 'WALKIN'];
  return types[Math.floor(Math.random() * types.length)];
}

export function generateRegistrationNumber(): string {
  const ntn = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
  return `NTN-${ntn}`;
}

export function generateTaxId(): string {
  const stn = String(Math.floor(Math.random() * 1000000000)).padStart(9, '0');
  return `STN-${stn}`;
}

// ============================================================================
//                       VENDOR UTILITIES
// ============================================================================

export function generateVendorCategory(): string {
  const categories = ['Raw Materials', 'Packaging', 'Equipment', 'Services', 'Software'];
  return categories[Math.floor(Math.random() * categories.length)];
}

export function generateLeadTimeDays(): number {
  return Math.floor(Math.random() * 30) + 3; // 3-33 days
}

export function generateMinimumOrderQuantity(): number {
  return Math.floor(Math.random() * 100) + 10; // 10-110 units
}

export function generateVendorPerformanceScore(): number {
  return Math.floor(Math.random() * 40) + 60; // 60-100 score
}

// ============================================================================
//                       INVENTORY UTILITIES
// ============================================================================

export function generateReorderPoint(): number {
  return Math.floor(Math.random() * 50) + 10; // 10-60 units
}

export function generateInventoryValue(quantity: number, unitCost: number): number {
  return Math.round(quantity * unitCost * 100) / 100;
}

// ============================================================================
//                       TRANSACTION UTILITIES
// ============================================================================

export function generateLineItems(count: number): Array<{ quantity: number; unitPrice: number }> {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      quantity: generateOrderQuantity(),
      unitPrice: generateRandomPrice(500, 50000),
    });
  }
  return items;
}

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function calculateBillTotal(
  items: Array<{ quantity: number; unitPrice: number }>,
  discountPercent: number = 0,
  taxRate: number = 0.17,
): number {
  let subtotal = 0;
  for (const item of items) {
    subtotal += calculateLineTotal(item.quantity, item.unitPrice);
  }

  const discount = subtotal * (discountPercent / 100);
  const taxable = subtotal - discount;
  const tax = taxable * taxRate;

  return Math.round((taxable + tax) * 100) / 100;
}

// ============================================================================
//                        REALISTIC BILL GENERATOR
// ============================================================================

export function generateRealisticBill(orgId: number, customerId: number, createdBy: number) {
  const billDate = generateBillDate(90);
  const dueDate = generateDueDate(billDate, generatePaymentTerms());
  const itemCount = generateRandomQuantity(3, 15);
  const items = generateLineItems(itemCount);

  let subtotal = 0;
  for (const item of items) {
    subtotal += calculateLineTotal(item.quantity, item.unitPrice);
  }

  const discountPercent = generateDiscountPercentage();
  const discount = subtotal * (discountPercent / 100);
  const taxRate = 0.17;
  const tax = (subtotal - discount) * taxRate;
  const totalAmount = subtotal - discount + tax;

  return {
    organizationId: orgId,
    bill_number: generateBillNumber(),
    bill_date: billDate,
    customerId,
    created_by: createdBy,
    channel: generateChannel(),
    subtotal: Math.round(subtotal * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100,
    payment_method: generatePaymentMethod(),
    status: generateBillStatus(),
    dueDate,
  };
}

// ============================================================================
//                      REALISTIC PO GENERATOR
// ============================================================================

export function generateRealisticPO(orgId: number, vendorId: number, createdBy: number) {
  const poDate = generatePODate(60);
  const leadDays = generateLeadTimeDays();
  const expectedDelivery = generateExpectedDeliveryDate(poDate, leadDays);
  const itemCount = generateRandomQuantity(2, 10);
  const items = generateLineItems(itemCount);

  let totalAmount = 0;
  for (const item of items) {
    totalAmount += calculateLineTotal(item.quantity, item.unitPrice);
  }

  return {
    organizationId: orgId,
    po_number: generatePONumber(),
    vendorId,
    created_by: createdBy,
    status: generatePOStatus(),
    expected_delivery_date: expectedDelivery,
    po_date: poDate,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

// ============================================================================
//                        AUDIT LOG UTILITIES
// ============================================================================

export function generateAuditAction(): string {
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'VIEW', 'EXPORT', 'IMPORT'];
  return actions[Math.floor(Math.random() * actions.length)];
}

export function generateEntityType(): string {
  const entities = [
    'Bill',
    'PurchaseOrder',
    'Customer',
    'Vendor',
    'Product',
    'Inventory',
    'Payment',
  ];
  return entities[Math.floor(Math.random() * entities.length)];
}

export function generateIPAddress(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

// ============================================================================
//                     BULK DATA GENERATION
// ============================================================================

export function generateBills(count: number, orgId: number, customerId: number, createdBy: number) {
  const bills = [];
  for (let i = 0; i < count; i++) {
    bills.push(generateRealisticBill(orgId, customerId, createdBy));
  }
  return bills;
}

export function generatePurchaseOrders(
  count: number,
  orgId: number,
  vendorId: number,
  createdBy: number,
) {
  const pos = [];
  for (let i = 0; i < count; i++) {
    pos.push(generateRealisticPO(orgId, vendorId, createdBy));
  }
  return pos;
}

export function generateRandomDate(daysBack: number = 365): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date;
}

export function generateRandomStatus(statuses: string[]): string {
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// ============================================================================
//                    EXPORT AS DEFAULT OBJECT
// ============================================================================

export const FakerUtils = {
  // Bill utilities
  generateBillNumber,
  generateBillDate,
  generateDueDate,
  generateBillStatus,

  // PO utilities
  generatePONumber,
  generatePODate,
  generateExpectedDeliveryDate,
  generatePOStatus,

  // Quantity utilities
  generateRandomQuantity,
  generateOrderQuantity,
  generateStockLevel,

  // Price utilities
  generateRandomPrice,
  generateUnitPrice,
  generateDiscountPercentage,
  generateTaxAmount,

  // Contact utilities
  generatePakistaniPhone,
  generateEmail,
  generateBusinessName,
  generateWarehouseName,
  generateCreditLimit,
  generatePaymentTerms,

  // Customer utilities
  generateCustomerType,
  generateRegistrationNumber,
  generateTaxId,

  // Vendor utilities
  generateVendorCategory,
  generateLeadTimeDays,
  generateMinimumOrderQuantity,
  generateVendorPerformanceScore,

  // Inventory utilities
  generateReorderPoint,
  generateInventoryValue,

  // Transaction utilities
  generateLineItems,
  calculateLineTotal,
  calculateBillTotal,
  generateRealisticBill,
  generateRealisticPO,

  // Audit utilities
  generateAuditAction,
  generateEntityType,
  generateIPAddress,

  // Bulk generation
  generateBills,
  generatePurchaseOrders,
  generateRandomDate,
  generateRandomStatus,
};
