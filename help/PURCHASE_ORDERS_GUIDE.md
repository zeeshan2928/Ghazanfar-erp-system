# Purchase Order Automation System - Complete Guide

## 🎯 Overview

A comprehensive purchase order management system with automatic low-stock detection, vendor management, and phased receipt tracking. Designed for the warehouse-centric ERP to manage inventory procurement efficiently.

---

## ✨ Key Features

### 1. **Vendor Management**
- Create and manage vendors
- Track vendor contact information
- Assign products to vendors with pricing
- Track historical vendor performance
- Deactivate vendors without data loss

### 2. **Product Reorder Configuration**
- Set minimum stock levels per product
- Define reorder quantities (how much to order when triggered)
- Assign primary vendor per product
- Auto-create POs when stock falls below minimum

### 3. **Low Stock Alerts**
- Real-time monitoring of inventory levels
- Dashboard alerts showing all products below minimum
- Shortage calculation (how much below minimum)
- Grouped by warehouse for multi-location clarity

### 4. **Purchase Order Generation**
**Manual Creation:**
- Create POs for specific vendors with line items
- Auto-generating PO numbers (PO-000001 format)
- Option to add manual reference numbers (from manual books)
- Set expected delivery dates

**Automatic Generation:**
- Auto-create draft POs when stock hits minimum
- Scheduled or real-time detection
- Uses primary vendor from product configuration
- Creates draft status (not sent automatically)

### 5. **PO Lifecycle Management**

```
DRAFT → SENT → PARTIAL_RECEIVED → RECEIVED
              ↓ (optional)
            REJECTED
```

**States:**
- **DRAFT**: Created but not sent to vendor
- **SENT**: Submitted to vendor, awaiting receipt
- **PARTIAL_RECEIVED**: Some items received, more expected
- **RECEIVED**: All items received, PO complete
- **REJECTED**: PO cancelled, inventory released

### 6. **Phased Delivery / Partial Receipts**
- Receive items in multiple batches
- Track each batch with date and quantity
- Inventory updates immediately per batch
- No need to wait for complete delivery
- Automatic status transition: SENT → PARTIAL_RECEIVED → RECEIVED

**Example:**
```
PO ordered: 20 units of Product X
Batch 1 received: 10 units (inventory +10)
Batch 2 received: 7 units (inventory +7)
Batch 3 received: 3 units (inventory +3) → PO status = RECEIVED
```

### 7. **Inventory Integration**
- Immediate inventory updates on receipt
- Per-warehouse tracking
- Inventory created automatically if warehouse doesn't have the product
- No manual inventory adjustments needed

---

## 🗄️ Database Schema

### Models Added:

**Vendor**
```
├─ id
├─ organizationId (FK)
├─ name (unique per org)
├─ email, phone, contact_person, address
├─ isActive
├─ products (ProductVendor[])
└─ purchaseOrders (PurchaseOrder[])
```

**ProductVendor** (Junction Table)
```
├─ productId (FK)
├─ vendorId (FK)
├─ unit_price (int, in paisa)
├─ lead_time_days
└─ last_purchase_date
```

**PurchaseOrder**
```
├─ id
├─ organizationId (FK)
├─ po_number (unique, auto-generated: PO-000001)
├─ manual_reference (optional, for manual book tracking)
├─ vendorId (FK)
├─ status (DRAFT|SENT|PARTIAL_RECEIVED|RECEIVED|REJECTED|CANCELLED)
├─ expected_delivery_date
├─ actual_delivery_date
├─ created_by (userId)
├─ remarks
├─ items (PurchaseOrderItem[])
└─ receipts (PurchaseOrderReceipt[])
```

**PurchaseOrderItem**
```
├─ id
├─ poId (FK)
├─ productId (FK)
├─ quantity_ordered
└─ quantity_received
```

**PurchaseOrderReceipt** (Batch Tracking)
```
├─ id
├─ poId (FK)
├─ productId
├─ quantity_received
├─ warehouse_id
├─ received_by (userId)
├─ received_date
├─ remarks
└─ status (PENDING|PARTIAL|COMPLETE)
```

### Product Updates:
```
Product {
  ...existing fields...
  + minimum_quantity (int)
  + reorder_quantity (int)
  + primary_vendor_id (int, FK to Vendor)
  + vendors (ProductVendor[])
  + purchaseOrderItems (PurchaseOrderItem[])
}
```

---

## 📡 API Endpoints

### Vendor Endpoints

#### Create Vendor
```bash
POST /vendors
Authorization: Bearer {token}

{
  "name": "Vendor ABC",
  "email": "vendor@abc.com",
  "phone": "03001234567",
  "contact_person": "Ali Khan",
  "address": "Karachi, Pakistan"
}

Response: 201 Created
{
  "id": 1,
  "name": "Vendor ABC",
  "organizationId": 1,
  ...
}
```

#### List Vendors
```bash
GET /vendors?skip=0&take=10
Authorization: Bearer {token}

Response: 200 OK
{
  "data": [...],
  "total": 5,
  "page": 1,
  "hasMore": false
}
```

#### Get Vendor Details
```bash
GET /vendors/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "id": 1,
  "name": "Vendor ABC",
  "products": [
    {
      "product": { "code": "PHONE-001", "name": "Phone XYZ" },
      "unit_price": 50000,
      "lead_time_days": 7
    }
  ],
  "purchaseOrders": [...]
}
```

#### Add Product to Vendor
```bash
POST /vendors/:vendorId/products
Authorization: Bearer {token}

{
  "productId": 1,
  "unit_price": 50000,
  "lead_time_days": 7
}

Response: 201 Created
{
  "id": 1,
  "productId": 1,
  "vendorId": 1,
  "unit_price": 50000,
  "lead_time_days": 7
}
```

#### Remove Product from Vendor
```bash
DELETE /vendors/:vendorId/products/:productId
Authorization: Bearer {token}

Response: 200 OK
{ "message": "Product removed from vendor" }
```

#### Deactivate Vendor
```bash
DELETE /vendors/:id
Authorization: Bearer {token}

Response: 200 OK
{ "isActive": false }
```

---

### Product Configuration Endpoints

#### Set Product Reorder Parameters
```bash
POST /purchase-orders/products/:productId/set-reorder-params
Authorization: Bearer {token}

{
  "minimum_quantity": 10,
  "reorder_quantity": 50,
  "primary_vendor_id": 1
}

Response: 200 OK
{
  "id": 1,
  "code": "PHONE-001",
  "minimum_quantity": 10,
  "reorder_quantity": 50,
  "primary_vendor_id": 1
}
```

---

### Alert Endpoints

#### Get Low Stock Alerts
```bash
GET /purchase-orders/alerts/low-stock
Authorization: Bearer {token}

Response: 200 OK
{
  "total_alerts": 2,
  "can_auto_generate_po": true,
  "alerts": [
    {
      "productId": 1,
      "productCode": "PHONE-001",
      "productName": "Phone XYZ",
      "minimum_quantity": 10,
      "current_available": 5,
      "shortage": 5,
      "reorder_quantity": 50,
      "primaryVendorId": 1,
      "primaryVendor": { "name": "Vendor ABC" },
      "inventory_by_warehouse": [
        {
          "warehouseId": 1,
          "physical_on_hand": 5,
          "reserved": 0,
          "available": 5
        }
      ]
    }
  ]
}
```

#### Auto-Generate POs for Low Stock
```bash
POST /purchase-orders/alerts/auto-create-pos
Authorization: Bearer {token}

Response: 201 Created
{
  "message": "Auto-created 2 purchase orders",
  "created_pos": [
    {
      "id": 1,
      "po_number": "PO-000001",
      "status": "DRAFT",
      "vendor": { "name": "Vendor ABC" },
      "items": [...]
    }
  ]
}
```

---

### Purchase Order Endpoints

#### Create Manual PO
```bash
POST /purchase-orders
Authorization: Bearer {token}

{
  "vendorId": 1,
  "items": [
    { "productId": 1, "quantity_ordered": 20 },
    { "productId": 2, "quantity_ordered": 30 }
  ],
  "remarks": "Regular monthly order",
  "expected_delivery_date": "2026-07-10T00:00:00Z"
}

Response: 201 Created
{
  "id": 1,
  "po_number": "PO-000001",
  "status": "DRAFT",
  "vendor": { "name": "Vendor ABC" },
  "items": [
    {
      "id": 1,
      "productId": 1,
      "product": { "code": "PHONE-001", "name": "Phone XYZ" },
      "quantity_ordered": 20,
      "quantity_received": 0
    }
  ]
}
```

#### Get Draft POs
```bash
GET /purchase-orders/draft?skip=0&take=10
Authorization: Bearer {token}

Response: 200 OK
{
  "data": [...],
  "total": 3,
  "page": 1,
  "hasMore": false
}
```

#### Get Sent/Partial POs
```bash
GET /purchase-orders/sent?skip=0&take=10
Authorization: Bearer {token}

Response: 200 OK
{
  "data": [...],
  "total": 5,
  "page": 1,
  "hasMore": false
}
```

#### Get Received POs
```bash
GET /purchase-orders/received?skip=0&take=10
Authorization: Bearer {token}

Response: 200 OK
{
  "data": [...],
  "total": 12,
  "page": 1,
  "hasMore": true
}
```

#### Get Single PO
```bash
GET /purchase-orders/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "id": 1,
  "po_number": "PO-000001",
  "status": "PARTIAL_RECEIVED",
  "vendor": { "name": "Vendor ABC" },
  "expected_delivery_date": "2026-07-10T00:00:00Z",
  "actual_delivery_date": null,
  "items": [
    {
      "productId": 1,
      "quantity_ordered": 20,
      "quantity_received": 15
    }
  ],
  "receipts": [
    {
      "id": 1,
      "productId": 1,
      "quantity_received": 15,
      "warehouse_id": 1,
      "received_date": "2026-07-05T10:30:00Z",
      "remarks": "First shipment"
    }
  ]
}
```

#### Send PO to Vendor
```bash
POST /purchase-orders/:id/send
Authorization: Bearer {token}

Response: 200 OK
{
  "id": 1,
  "po_number": "PO-000001",
  "status": "SENT",
  "expected_delivery_date": "2026-07-10T00:00:00Z"
}
```

#### Confirm Receipt (Partial or Full)
```bash
POST /purchase-orders/:id/confirm-receipt
Authorization: Bearer {token}

{
  "items": [
    {
      "productId": 1,
      "quantity_received": 15,
      "warehouse_id": 1
    },
    {
      "productId": 2,
      "quantity_received": 25,
      "warehouse_id": 1
    }
  ],
  "remarks": "First batch received, 5 units damaged"
}

Response: 200 OK
{
  "id": 1,
  "po_number": "PO-000001",
  "status": "PARTIAL_RECEIVED",  // or "RECEIVED" if all items received
  "items": [
    {
      "productId": 1,
      "quantity_ordered": 20,
      "quantity_received": 15
    }
  ],
  "receipts": [
    {
      "productId": 1,
      "quantity_received": 15,
      "warehouse_id": 1,
      "received_date": "2026-07-05T10:30:00Z",
      "remarks": "First batch received, 5 units damaged"
    }
  ]
}

# Inventory Impact:
# - Warehouse 1: physical_on_hand += 15 and 25 immediately
# - PO status changes from SENT to PARTIAL_RECEIVED
```

---

## 🔄 Workflows

### Workflow 1: Auto-PO Generation
```
1. Product stock falls below minimum_quantity
   ↓
2. System automatically creates draft PO
   ├─ Links to primary_vendor
   ├─ Sets quantity = reorder_quantity
   └─ Creates with DRAFT status
   ↓
3. Manager reviews dashboard
   ├─ Sees auto-created PO
   └─ Can edit if needed
   ↓
4. Manager sends PO to vendor
   └─ Status: SENT
```

### Workflow 2: Manual PO with Phased Delivery
```
1. Manager creates PO manually
   └─ Status: DRAFT
   ↓
2. Manager sends PO to vendor
   ├─ Status: SENT
   └─ Sets expected_delivery_date
   ↓
3. Vendor sends first batch (Day 2)
   ├─ Warehouse staff receives 15 of 20 units
   ├─ Confirms receipt via API
   ├─ Inventory: +15 immediately
   └─ Status: PARTIAL_RECEIVED
   ↓
4. Vendor sends second batch (Day 5)
   ├─ Warehouse staff receives 5 of 20 units
   ├─ Confirms receipt via API
   ├─ Inventory: +5 immediately
   └─ Status: RECEIVED (all items received)
   ↓
5. PO complete!
   ├─ actual_delivery_date is set
   ├─ All 20 units in inventory
   └─ Receipts show 2 batches
```

### Workflow 3: Rejection
```
1. PO in DRAFT or SENT status
   ↓
2. Manager rejects PO
   ├─ Status: REJECTED
   └─ Reason recorded
   ↓
3. For SENT POs: Already-reserved inventory released back to available
```

---

## 📊 Example Scenarios

### Scenario 1: Low Stock Detection
```
Product: Phone XYZ (ID: 1)
├─ minimum_quantity: 10
├─ reorder_quantity: 50
├─ primary_vendor_id: 1

Warehouse 1 Inventory:
├─ physical_on_hand: 5
├─ reserved: 2
└─ available: 3 ← BELOW MINIMUM

Action:
├─ Alert: "5 units below minimum, need 5 more"
├─ Auto-PO: PO-000001 created (DRAFT)
│  └─ Vendor: "Vendor ABC"
│  └─ Items: 50 units of Phone XYZ
└─ Manager can send or edit
```

### Scenario 2: Multi-Warehouse Receipt
```
PO-000001: 100 units total ordered
├─ Warehouse 1: 60 units
└─ Warehouse 2: 40 units

Receipt Events:
├─ Day 1: 60 units arrive at Warehouse 1
│  └─ POST /confirm-receipt with warehouse_id=1, qty=60
│  └─ Inventory W1: +60 immediately
├─ Day 3: 25 units arrive at Warehouse 2
│  └─ POST /confirm-receipt with warehouse_id=2, qty=25
│  └─ Inventory W2: +25 immediately
│  └─ Status: PARTIAL_RECEIVED
└─ Day 5: 15 units arrive at Warehouse 2
   └─ POST /confirm-receipt with warehouse_id=2, qty=15
   └─ Inventory W2: +15 immediately
   └─ Status: RECEIVED (100 total received)
```

### Scenario 3: Partial Delivery (Shortage)
```
PO-000001: 100 units ordered from Vendor
├─ Day 1: 80 units delivered
│  └─ Warehouse receives 80 units
│  └─ Inventory: +80
│  └─ PO Status: PARTIAL_RECEIVED
└─ Day 10: Vendor indicates 20 units damaged, can't deliver
   └─ Warehouse staff confirms 0 units (no more coming)
   └─ PO Status: RECEIVED (80 received, 20 shortage)
   └─ 20 units still in "quantity_ordered" for tracking
```

---

## ⚙️ Configuration Best Practices

### 1. Reorder Parameters
```typescript
// Slow-moving item (safety stock only)
minimum_quantity: 5
reorder_quantity: 20  // 4x minimum

// Fast-moving item (frequent orders)
minimum_quantity: 50
reorder_quantity: 200  // 4x minimum

// Just-in-time item
minimum_quantity: 2
reorder_quantity: 100  // 50x minimum (rare orders, bulk quantities)
```

### 2. Vendor Assignment
- Assign at least 1 primary vendor per product
- Maintain backup vendors for critical items
- Use unit_price to track pricing changes over time
- Update lead_time_days based on recent history

### 3. Expected Delivery Dates
- Set automatically when PO sent (7 days by default)
- Override based on vendor history
- Use for SLA tracking and follow-up

---

## 🚀 Performance Considerations

### Indexes
All tables have optimal indexes for:
- Quick lookup by organizationId + status
- Fast vendor search
- Efficient receipt batch tracking

### Scalability
- Handles 1000s of POs per month
- Supports 100+ vendors per organization
- Multi-warehouse receipt tracking
- Real-time low-stock detection

### Future Optimizations
1. Cache low-stock alerts for 30 seconds
2. Batch email notifications (hourly digest)
3. Archive completed POs after 90 days
4. Add receipt scanning with QR codes
5. Integrate with vendor payment systems

---

## 🔐 Security & Access Control

All endpoints require:
- JWT authentication (Bearer token)
- organizationId from token (multi-tenancy)
- Only managers/ADMIN can create/send POs
- Warehouse staff can only confirm receipts for their warehouse

---

## 📝 Migration Guide

From existing system to new PO system:

1. **Set up vendors** (if not already done)
   ```bash
   POST /vendors for each supplier
   ```

2. **Configure products**
   ```bash
   POST /purchase-orders/products/:id/set-reorder-params
   ```

3. **Link products to vendors**
   ```bash
   POST /vendors/:id/products for pricing
   ```

4. **Run low-stock alert check**
   ```bash
   GET /purchase-orders/alerts/low-stock
   ```

5. **Start monitoring**
   - Check dashboard for alerts
   - Auto-generated POs appear in /purchase-orders/draft
   - Approve and send to vendors

---

## 🧪 Testing Checklist

- ✅ Create vendor and add products
- ✅ Set product reorder parameters
- ✅ Trigger low stock alert
- ✅ Auto-generate PO for low stock
- ✅ Manually create PO
- ✅ Send PO to vendor (DRAFT → SENT)
- ✅ Receive items in batches
- ✅ Verify inventory updates per batch
- ✅ Status transitions (SENT → PARTIAL_RECEIVED → RECEIVED)
- ✅ List POs by status
- ✅ Get detailed PO with receipt history

---

## 🎯 Next Steps (Phase 4)

1. **Mobile Receipt Scanning**
   - Barcode scanning for faster receipt entry
   - Offline capability with sync

2. **Vendor Analytics**
   - On-time delivery rates
   - Quality metrics
   - Price trends

3. **Automated Ordering**
   - Auto-send POs without human approval
   - Scheduled delivery cycles

4. **Supplier Portal**
   - Vendors can track their orders
   - Auto-update delivery status

5. **Accounting Integration**
   - Track PO costs
   - Match with invoices
   - GL posting
