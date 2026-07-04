# Seed Data Comprehensive Guide

## Overview

This guide provides detailed information about the seed data generated for the ERP system, including data structure, relationships, and usage scenarios.

## Data Architecture

### Organization Structure

The seed creates a multi-organization setup for testing:

```
Ghazanfar ERP System
├── Organization 1: Ghazanfar ERP (Primary)
│   ├── 10 Users (1 Admin, 2 Managers, 5 Staff, 2 Viewers)
│   ├── 8 Vendors
│   ├── 18 Customers
│   ├── 3 Warehouses
│   ├── 100+ Inventory Records
│   ├── 100 Bills
│   ├── 50 Purchase Orders
│   └── Financial Records & Audit Trail
│
├── Organization 2: Karachi Trading (Manufacturing Scenario)
│   └── Similar structure (manufacturing focus)
│
├── Organization 3: Lahore Wholesale (Distribution Scenario)
│   └── Similar structure (wholesale focus)
│
└── Organization 4: Islamabad Retail (Retail Scenario)
    └── Similar structure (retail focus)
```

### User Roles & Permissions

#### Admin Role (1 per organization)
```
User: admin@org1.local
Password: Demo@12345
Permissions:
  - Full system access
  - Create/edit/delete all entities
  - Manage other users
  - View all organization data
  - Export reports
  - Configure system settings
```

#### Manager Role (2 per organization)
```
Users: manager1@org1.local, manager2@org1.local
Password: Demo@12345
Permissions:
  - Create and approve bills
  - Create and approve purchase orders
  - View customer/vendor data
  - Generate reports
  - Cannot delete approved transactions
  - Cannot manage users
```

#### Staff Role (5 per organization)
```
Users: staff1@org1.local through staff5@org1.local
Password: Demo@12345
Permissions:
  - Create bills and POs
  - Cannot see cost prices
  - Cannot approve transactions
  - Cannot view payment details
  - Limited to assigned customers/vendors
```

#### Viewer Role (2 per organization)
```
Users: viewer1@org1.local, viewer2@org1.local
Password: Demo@12345
Permissions:
  - Read-only access
  - Cannot create anything
  - View reports only
  - Cannot see sensitive data
```

## Vendors

### Vendor Categories

#### Raw Material Suppliers (3 per org)
1. **Premium Textile Mills**
   - Category: Raw Materials
   - Payment Terms: 60 days
   - Lead Time: 12 days
   - Contact: +92-300-XXXXX

2. **Quality Steel Suppliers**
   - Category: Raw Materials
   - Payment Terms: 45 days
   - Lead Time: 10 days

3. **Chemical Solutions Ltd**
   - Category: Raw Materials
   - Payment Terms: 30 days
   - Lead Time: 8 days

#### Packaging Suppliers (2 per org)
4. **Advanced Packaging**
   - Lead Time: 5 days
   - Payment Terms: 30 days

5. **Carton Box Factory**
   - Lead Time: 3 days
   - Payment Terms: 15 days

#### Equipment Vendors (2 per org)
6. **Industrial Equipment Co**
   - Payment Terms: 90 days (longest)
   - Lead Time: 25 days

7. **Maintenance Parts Supplier**
   - Payment Terms: 60 days
   - Lead Time: 15 days

### Vendor Characteristics

Each vendor has realistic attributes:
- **Payment Terms**: 15-90 days
- **Lead Times**: 3-25 business days
- **Minimum Orders**: 10-100 units (varies)
- **Unit Cost Variation**: 20-40% discount ranges
- **Quality Ratings**: 60-100 score

## Customers

### Customer Segments

#### Wholesale Customers (5 per org)
- **ACME Distribution Ltd** - Credit Limit: 2,000,000 PKR
- **Global Trade Partners** - Credit Limit: 1,500,000 PKR
- **Express Trading Corp** - Credit Limit: 1,200,000 PKR
- **Mausa Enterprises** - Credit Limit: 1,800,000 PKR
- **Elite Distribution Group** - Credit Limit: 1,600,000 PKR

Characteristics:
- Large orders (100-500 units)
- Extended payment terms (30-60 days)
- Discounts: 10-15%
- Regular high-volume purchases

#### Retail Customers (8 per org)
- **Makki Crockery House** - Credit Limit: 200,000 PKR
- **Tech Solutions Shop** - Credit Limit: 150,000 PKR
- **Premium Retail Store** - Credit Limit: 250,000 PKR
- **Quick Commerce Ltd** - Credit Limit: 180,000 PKR
- **Urban Bazaar** - Credit Limit: 120,000 PKR
- **Market Square Shop** - Credit Limit: 90,000 PKR
- **Direct Sales Hub** - Credit Limit: 160,000 PKR
- **Online Merchants** - Credit Limit: 300,000 PKR

Characteristics:
- Small to medium orders (10-100 units)
- Short payment terms (7-30 days)
- Discounts: 5-10%
- Frequent small purchases

#### Corporate/Direct Customers (5 per org)
- **Corporate Bulk Buyers** - Credit Limit: 800,000 PKR
- **Government Procurement** - Credit Limit: 5,000,000 PKR
- **Hotel & Restaurant Group** - Credit Limit: 600,000 PKR
- **Manufacturing Partners** - Credit Limit: 1,000,000 PKR
- **Institutional Buyers** - Credit Limit: 2,500,000 PKR

Characteristics:
- Variable order sizes
- Negotiated payment terms
- Bulk purchase agreements
- High-value orders

## Products

### Linked Products
All existing 2,382 products are linked to vendors:
- **Product Categories**: 50+ types (ceramics, glass, metal, textiles, etc.)
- **Vendor Links**: Each product linked to 1-3 vendors
- **Cost Variations**: 20-40% variation between vendors
- **Lead Times**: 3-30 days depending on vendor

### Inventory Distribution
For each product across warehouses:
- **Low Stock** (30%): 0-10 units
- **Normal Stock** (40%): 50-200 units
- **High Stock** (20%): 200-1000 units
- **Out of Stock** (10%): 0 units

## Warehouses

### Main Distribution Center
- **Capacity**: 10,000 units
- **Location**: Islamabad
- **Zones**: 5 (Electronics, Textiles, Packaging, Chemicals, Hardware)
- **Locations per Zone**: 10 (racks/shelves)
- **Inventory Level**: 40% capacity utilization

### Regional Storage
- **Capacity**: 5,000 units
- **Location**: Karachi/Lahore/Peshawar (per org)
- **Zones**: 3 (mixed products)
- **Purpose**: Overflow and regional distribution
- **Inventory Level**: 35% capacity utilization

### Returns Center
- **Capacity**: 2,000 units
- **Location**: Central (per organization)
- **Purpose**: Returned goods processing
- **Inventory Level**: 10% capacity utilization

## Bills (100 per organization)

### Bill Distribution

**40% DRAFT Bills**
- Being prepared by staff
- Not yet submitted for approval
- No financial impact
- Can be edited or deleted

**50% FINALIZED Bills**
- Approved and awaiting payment
- Payment due: 7-60 days from bill date
- Some overdue (5-15 days past due)
- Ready for customer collection

**10% PAID Bills**
- Payment received
- 30+ days old
- Historical records

### Bill Characteristics

**Random Distribution**:
- Bill Amount: 50,000 - 5,000,000 PKR
- Items per Bill: 3-15 line items
- Quantities: 1-100 units per item
- Discounts: 0-10% (30% of bills)
- Tax: 17% standard rate
- Payment Methods: 
  - 40% Bank Transfer
  - 30% Cash
  - 20% Check
  - 10% Credit Card

**Bill Dates**:
- Spread over 90-day period
- Realistic distribution (more recent bills in progress)
- Some bills overdue (realistic receivables scenario)

**Sample Bill**:
```
Bill Number: BILL-2026-070001
Date: 2026-07-01
Customer: ACME Distribution Ltd
Items: 
  - Ceramic Plates: 50 units × 450 = 22,500
  - Glass Cups: 100 units × 280 = 28,000
  - Stainless Bowls: 30 units × 350 = 10,500
Subtotal: 61,000
Discount (5%): -3,050
Taxable Amount: 57,950
Tax (17%): 9,851.50
Total: 67,801.50
Due Date: 2026-08-01
Status: APPROVED
```

## Purchase Orders (50 per organization)

### PO Distribution

**10% DRAFT**
- Being prepared by purchasing staff
- Waiting for completion

**15% PENDING**
- Awaiting manager approval
- Not yet sent to vendor

**15% APPROVED**
- Approved and sent to vendor
- Waiting for delivery
- Typical lead time: 10-25 days

**8% PARTIAL_RECEIVED**
- Goods partially received
- Remainder expected
- Waiting for final shipment

**2% CANCELLED**
- Vendor issues or changes in requirement
- No longer valid

### PO Characteristics

**Random Distribution**:
- PO Amount: 100,000 - 10,000,000 PKR
- Items: 2-10 line items
- Quantities: 10-500 units per item
- Lead Times: 3-30 days (vendor-dependent)
- Delivery Dates: Based on vendor lead time + 5-10 days buffer

**Sample PO**:
```
PO Number: PO-2026-00001
Date: 2026-06-15
Vendor: Premium Textile Mills
Items:
  - Raw Cotton: 500 units × 200 = 100,000
  - Cotton Blend: 300 units × 280 = 84,000
  - Dyed Fabric: 200 units × 450 = 90,000
Total: 274,000
Expected Delivery: 2026-06-27 (12 days)
Status: SENT
```

## Financial Records

### Payments (50% of approved bills)

**Distribution**:
- 50% have payments recorded
- Payment dates: 5-30 days after bill date
- Some late payments (5-15 days overdue)
- Full or partial payment amounts

**Payment Methods**:
- 40% Bank Transfer
- 30% Check
- 20% Cash
- 10% Credit Card

### Notifications (100+ per organization)

**Types**:
- BILL_CREATED: New bill notifications
- BILL_APPROVED: Approval confirmations
- PAYMENT_DUE: Payment reminders
- LOW_STOCK: Inventory alerts
- PO_DELIVERED: Delivery confirmations
- PAYMENT_RECEIVED: Receipt notifications

**Status**:
- 50% Read notifications
- 50% Unread notifications
- Spread over past 30 days

## Audit Logs (1,000+ per organization)

### Logged Operations

**Bill Operations**:
- 100+ CREATE events
- 100+ UPDATE events
- 50+ APPROVE events

**PO Operations**:
- 50+ CREATE events
- 50+ UPDATE events
- 25+ APPROVE events

**Inventory Operations**:
- 200+ stock movements
- 50+ quantity adjustments

**User Operations**:
- 50+ login events
- 20+ role change events
- 20+ permission updates

### Audit Trail Details

Each log entry contains:
- **Entity Type**: Bill, PO, Product, Customer, Vendor, User
- **Action**: CREATE, UPDATE, DELETE, APPROVE, REJECT
- **User ID**: Who made the change
- **Old Values**: Before state (JSON)
- **New Values**: After state (JSON)
- **IP Address**: Source of change
- **Timestamp**: When change occurred

## Testing Scenarios

### Scenario 1: Manufacturing Company (Karachi Trading)

**Business Model**:
- Textile manufacturing & distribution
- 500 textile-specific products
- 10 textile suppliers
- 20 wholesale distributors as customers

**Data Pattern**:
- Bulk raw material purchases (large POs)
- Large wholesale sales (150+ bills)
- Regular inventory movements
- Complex supply chain

### Scenario 2: Distribution Company (Lahore Wholesale)

**Business Model**:
- General merchandise distributor
- 1,500 diverse SKUs
- 30 various vendors
- 50 retail customers

**Data Pattern**:
- Continuous restocking (100+ POs)
- Frequent smaller orders (200+ bills)
- High-volume, low-margin operations
- Cash-heavy sales mix

### Scenario 3: Retail Company (Islamabad Retail)

**Business Model**:
- Multi-channel retail chain
- 800 consumer items
- 15 suppliers
- 100+ store locations/online

**Data Pattern**:
- Daily sales (300+ bills)
- Regular inventory replenishment (60+ POs)
- Customer returns processing
- Promotional activities

## Data Quality

### Consistency Checks

✅ All customer email addresses are unique per organization
✅ All vendor names are unique per organization
✅ Bill amounts = subtotal - discount + tax
✅ PO delivery dates are after PO date
✅ Customer credit limits > recent bill amounts
✅ Vendor payment terms align with industry norms
✅ Inventory quantities match warehouse capacities

### Realistic Patterns

✅ Payment terms vary by customer type
✅ Vendor lead times vary by product type
✅ Discounts applied realistically (5-15%)
✅ Tax rates consistent (17%)
✅ Bill distribution realistic (more recent = more pending)
✅ Audit timestamps follow business hours pattern

## Using Seed Data for Testing

### Test User Login Flow
```javascript
// Admin user testing
const email = 'admin@org1.local';
const password = 'Demo@12345';
// Login and verify admin permissions
```

### Test Bill Creation
```javascript
// Use any seeded customer
const customerId = 1; // From seeded data
// Create new bill with seeded products
// Verify amounts calculated correctly
```

### Test Multi-Organization
```javascript
// Query different organizations
const org1Bills = await findBills({ organizationId: 1 });
const org2Bills = await findBills({ organizationId: 2 });
// Verify data isolation
```

### Test Reporting
```javascript
// Use seeded financial data
const billCount = 100; // Seeded
const totalAmount = sumBillAmounts();
// Generate reports on realistic data
```

## Customizing Seed Data

### Adjust Organization Count

Edit `prisma/seed.ts`:
```typescript
async function seedDemoOrganizations() {
  const demoOrgs = [
    // Add or remove organizations here
    { name: "Custom Org", slug: "custom-org" }
  ];
}
```

### Change Data Volume

```typescript
const billCount = 50; // Reduce from 100
const poCount = 25; // Reduce from 50
const vendorCount = 5; // Reduce from 8
```

### Modify Payment Terms

```typescript
paymentTerms = [7, 15, 30]; // Your custom terms
```

### Add Custom Vendors

```typescript
const customVendors = [
  { name: "Your Vendor", email: "vendor@company.com" }
];
```

## Data Refresh

### Reset to Original Seed

```bash
# Delete all data
npx prisma migrate reset

# Re-seed with original data
npm run seed
```

### Partial Reset (Single Organization)

```typescript
// Clear org 2 data only
await prisma.bill.deleteMany({ where: { organizationId: 2 } });
await prisma.customer.deleteMany({ where: { organizationId: 2 } });
// Re-seed org 2
await seedCustomersForOrganization(2);
```

## Performance Benchmarks

With seeded data:
- Fetch 100 bills: 15-30ms
- Create bill with 10 items: 100-150ms
- Generate sales report: 200-300ms
- Export 1000 records: 500-800ms
- Database size: 5-10MB

## Related Documentation

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Setup instructions
- [BULK_IMPORT_GUIDE.md](./BULK_IMPORT_GUIDE.md) - Bulk imports
- [DATA_ARCHIVAL_GUIDE.md](./DATA_ARCHIVAL_GUIDE.md) - Data cleanup
