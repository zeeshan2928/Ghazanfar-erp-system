# PHASE 1 - DAY 1 TESTING GUIDE

**Date:** July 5-6, 2026  
**Objective:** Make Bills → Gate Pass → Multi-Warehouse system production-ready  
**Status:** READY TO START  

---

## ✅ Pre-Testing Checklist

Before starting tests, verify:

- [ ] PostgreSQL database running
- [ ] Backend server can start (or tests can run against test DB)
- [ ] Prisma migrations current: `npx prisma migrate deploy`
- [ ] Test data seeded: `npx prisma db seed` (if seed script exists)
- [ ] No uncommitted changes needed for testing

---

## 🧪 Testing Approach

### Option 1: Run Manual API Tests (Recommended for today)
```bash
# Start backend
npm run start:dev

# In another terminal, run tests
node DAY1_TESTING_SCRIPT.js
```

### Option 2: Run Unit Tests
```bash
npm test -- src/modules/bills/__tests__
npm test -- src/modules/gate-passes/__tests__
```

### Option 3: Use Postman/REST Client
Use the included REST client requests (see endpoints below)

---

## 📋 Test Cases - Bills API

### Test 1.1: Create Single Warehouse Bill ✅

**Purpose:** Verify bill creation with proper calculations  
**Endpoint:** `POST /bills`

**Request:**
```json
{
  "customerId": 1,
  "channel": "COUNTER",
  "paymentMethod": "CASH",
  "lines": [
    {
      "productId": 1,
      "warehouseId": 1,
      "quantity": 5,
      "unitPrice": 50000
    }
  ],
  "remarks": "Test bill"
}
```

**Expected Response (200/201):**
```json
{
  "id": 1,
  "bill_number": "BILL-2026-000001",
  "total_amount": 250000,
  "status": "APPROVED",
  "lines": [
    {
      "quantity": 5,
      "unitPrice": 50000
    }
  ]
}
```

**Verify:**
- ✅ Bill number is sequential (BILL-YYYY-XXXXXX)
- ✅ total_amount = subtotal - discount + tax
- ✅ Status is APPROVED
- ✅ Bill ID returned

**Possible Errors:**
- `400 Bad Request` - Missing customer, product, or warehouse
- `404 Not Found` - Customer/product doesn't exist
- `500 Error` - Database issue or schema mismatch

---

### Test 1.2: Create Multi-Warehouse Bill ✅✅ KEY TEST

**Purpose:** Verify bill with items from multiple warehouses  
**Endpoint:** `POST /bills`

**Request:**
```json
{
  "customerId": 1,
  "channel": "COUNTER",
  "paymentMethod": "CASH",
  "lines": [
    {
      "productId": 1,
      "warehouseId": 1,
      "quantity": 10,
      "unitPrice": 50000
    },
    {
      "productId": 2,
      "warehouseId": 2,
      "quantity": 5,
      "unitPrice": 30000
    }
  ]
}
```

**Expected Response (200/201):**
```json
{
  "id": 2,
  "bill_number": "BILL-2026-000002",
  "total_amount": 650000,
  "status": "APPROVED",
  "lines": [ ... ]
}
```

**Verify (CRITICAL):**
- ✅ Bill accepts items from 2+ warehouses
- ✅ total_amount includes all lines
- ✅ Each line has correct warehouseId
- ✅ Bill response includes all lines with warehouse info

**Database Check:**
```sql
SELECT * FROM "Bill" WHERE id = 2;
SELECT * FROM "BillLine" WHERE bill_id = 2;
SELECT * FROM "Inventory" WHERE product_id IN (1,2) AND warehouse_id IN (1,2);
```

Expected: Inventory.reserved should increase for both warehouses

---

### Test 1.3: Retrieve Bill by ID ✅

**Purpose:** Verify bill details retrieval  
**Endpoint:** `GET /bills/:billId`

**Expected Response (200):**
```json
{
  "id": 1,
  "bill_number": "BILL-2026-000001",
  "bill_date": "2026-07-05T...",
  "customer": {
    "id": 1,
    "name": "Test Customer"
  },
  "lines": [
    {
      "id": 1,
      "productId": 1,
      "product": { "id": 1, "name": "..." },
      "quantity": 5,
      "unitPrice": 50000,
      "warehouseId": 1
    }
  ],
  "subtotal": 250000,
  "discount_amount": 0,
  "tax_amount": 0,
  "total_amount": 250000,
  "status": "APPROVED"
}
```

**Verify:**
- ✅ All fields present
- ✅ Nested customer data included
- ✅ All line items included
- ✅ Monetary values are integers (paisa, not rupees)
- ✅ Timestamps in UTC

---

### Test 1.4: List Bills with Pagination ✅

**Purpose:** Verify pagination and filtering  
**Endpoint:** `GET /bills?skip=0&take=20`

**Expected Response (200):**
```json
{
  "data": [ ... ],
  "total": 5,
  "page": 1,
  "pageSize": 20,
  "hasMore": false
}
```

**Verify:**
- ✅ `data` array contains bills
- ✅ `total` is correct count
- ✅ `page` calculation correct (page = floor(skip/take) + 1)
- ✅ `hasMore` is correct (skip + take < total)

**Test Pagination:**
- `GET /bills?skip=0&take=2` → should return 2 bills
- `GET /bills?skip=2&take=2` → should return next 2 bills

---

### Test 1.5: Update Bill (DRAFT only) ✅

**Purpose:** Verify bill editing before finalization  
**Endpoint:** `PUT /bills/:billId`

**Setup:** Create bill in DRAFT status (if status handling works)

**Request:**
```json
{
  "discountAmount": 5000,
  "lines": [
    {
      "productId": 1,
      "warehouseId": 1,
      "quantity": 6,
      "unitPrice": 50000
    }
  ]
}
```

**Expected Response (200):**
- Bill updated with new discount
- Quantity updated
- total_amount recalculated

**Verify:**
- ✅ Bill status was DRAFT (or APPROVED)
- ✅ Discount updated
- ✅ Lines recalculated
- ✅ total_amount reflects changes

**Error Handling:**
- Try to update FINALIZED bill → should get 400 error
- Try to update non-existent bill → should get 404 error

---

### Test 1.6: Bill Status Transition ✅

**Purpose:** Verify status workflow: DRAFT → FINALIZED → PAID  
**Endpoint:** `PATCH /bills/:billId/status`

**Request 1 - Approve/Finalize:**
```json
{
  "status": "FINALIZED"
}
```

**Expected:** Bill status changed to FINALIZED

**Request 2 - Mark as Paid:**
```json
{
  "status": "PAID"
}
```

**Expected:** Bill status changed to PAID

**Verify Workflow:**
- ✅ Can transition DRAFT → FINALIZED
- ✅ Can transition FINALIZED → PAID
- ✅ ❌ Cannot skip (DRAFT → PAID should fail)
- ✅ ❌ Cannot reverse (PAID → FINALIZED should fail)
- ✅ Cannot transition invalid status

---

### Test 1.7: Delete Bill (Soft Delete) ✅

**Purpose:** Verify soft delete  
**Endpoint:** `DELETE /bills/:billId`

**Expected:** Bill marked as inactive (isActive = false)

**Verify:**
- ✅ Bill still in database (soft delete, not hard delete)
- ✅ Bill no longer appears in list queries (filtered by isActive = true)
- ✅ Can still query by ID if needed

```sql
SELECT * FROM "Bill" WHERE id = 1 AND is_active = false;
```

---

## 📋 Test Cases - Gate Pass Auto-Generation

### Test 2.1: Single Warehouse Gate Pass ✅

**Precondition:** Create bill with single warehouse

**Expected:**
- 1 gate pass created automatically
- Gate pass has bill_id = bill.id
- Gate pass status = PENDING
- Gate pass contains all items for that warehouse

**Database Check:**
```sql
SELECT * FROM "GatePass" WHERE bill_id = 1;
SELECT * FROM "GatePassItem" WHERE gate_pass_id = 1;
```

**Verify:**
- ✅ 1 gate pass created (not 0, not 2+)
- ✅ gate_pass_number sequential
- ✅ warehouse_id matches bill line warehouse
- ✅ Status is PENDING
- ✅ All items for that warehouse in gate pass items

---

### Test 2.2: Multi-Warehouse Gate Passes ✅✅ KEY TEST

**Precondition:** Create bill with 2 warehouses (1 product each)

**Expected:**
- 2 gate passes created (1 per warehouse)
- Gate Pass 1: contains items for Warehouse A
- Gate Pass 2: contains items for Warehouse B
- Each gate pass has correct warehouse_id
- Each gate pass has correct items

**Database Check:**
```sql
SELECT id, warehouse_id, gate_pass_number FROM "GatePass" WHERE bill_id = 2;
SELECT gp.id, count(*) FROM "GatePass" gp
  JOIN "GatePassItem" gpi ON gp.id = gpi.gate_pass_id
  WHERE gp.bill_id = 2
  GROUP BY gp.id;
```

**Verify:**
- ✅ Exactly 2 gate passes (1 per warehouse)
- ✅ Gate Pass 1 has only warehouse 1 items
- ✅ Gate Pass 2 has only warehouse 2 items
- ✅ No items mixed across gate passes
- ✅ Warehouse 1 staff sees only their gate pass
- ✅ Warehouse 2 staff sees only their gate pass

---

### Test 2.3: Gate Pass Confirmation ✅

**Purpose:** Verify gate pass workflow  
**Endpoint:** `POST /gate-passes/:gatePassId/confirm`

**Setup:** Get PENDING gate pass

**Request:**
```json
{
  "remarks": "All items picked and verified"
}
```

**Expected Response (200):**
- Gate pass status changed to CONFIRMED
- Inventory decremented (reserved → available)
- Bill status updated (if all gate passes confirmed)

**Verify (CRITICAL for multi-warehouse):**
- ✅ Gate pass status = CONFIRMED
- ✅ Inventory for this warehouse decremented
- ✅ Inventory for OTHER warehouses NOT affected
- ✅ If this was last warehouse, bill status = FULFILLED

**Example:**
```
Before confirmation:
- WH1 Product X: physical=100, reserved=10, available=90
- WH2 Product Y: physical=50, reserved=5, available=45

After confirming WH1 gate pass:
- WH1 Product X: physical=100, reserved=0, available=100 ✅
- WH2 Product Y: physical=50, reserved=5, available=45 ✅ (unchanged)
```

---

### Test 2.4: Gate Pass Shortage Reporting ✅

**Purpose:** Handle partial fulfillment  
**Endpoint:** `POST /gate-passes/:gatePassId/shortage`

**Request:**
```json
{
  "remarks": "Only 8 units available (need 10)",
  "qtySorted": 8,
  "qtyShort": 2
}
```

**Expected Response (200):**
- Gate pass status = SHORTAGE_REPORTED
- Bill status = PARTIALLY_FULFILLED
- Manager notified of shortage

**Verify:**
- ✅ Gate pass shows shortage status
- ✅ Inventory decremented by actual qty (8, not 10)
- ✅ Audit trail records shortage
- ✅ Bill is still trackable with partial status

---

### Test 2.5: List Pending Gate Passes ✅

**Purpose:** Warehouse staff view their pending work  
**Endpoint:** `GET /gate-passes?status=PENDING&warehouseId=1`

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "gatePassNumber": "GP-2026-000001",
      "warehouse_id": 1,
      "status": "PENDING",
      "items": [
        {
          "productId": 1,
          "quantity": 10,
          "product": { "name": "..." }
        }
      ]
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 10,
  "hasMore": false
}
```

**Verify:**
- ✅ Only shows PENDING gate passes
- ✅ Only shows for requested warehouse
- ✅ Includes all details needed for picking
- ✅ Pagination works

---

## 📋 Test Cases - Multi-Warehouse Operations

### Test 3.1: Inventory Isolation ✅

**Scenario:**
```
Product: "Phone XYZ"
- Warehouse A: 100 units
- Warehouse B: 50 units
```

**Action:** Create bill requesting 40 units from WH-A only

**Expected:**
- WH-A: available = 60 (100 - 40)
- WH-B: available = 50 (unchanged)

**API Test:**
```bash
GET /inventory/product/1
→ Shows per-warehouse breakdown
  - WH-A: available: 60, reserved: 40
  - WH-B: available: 50, reserved: 0
```

---

### Test 3.2: Warehouse Transfer (if time permits) ✅

**Purpose:** Move stock between warehouses

**Endpoint:** `POST /warehouse-transfers`

**Request:**
```json
{
  "from_warehouse_id": 1,
  "to_warehouse_id": 2,
  "items": [
    {
      "productId": 1,
      "quantity": 20
    }
  ]
}
```

**Expected States:**

State 1 - PENDING (created):
- WH-A reserved += 20
- WH-A available -= 20

State 2 - SHIPPED (WH-A ships):
- No inventory change (still reserved in WH-A)

State 3 - RECEIVED (WH-B receives):
- WH-A reserved -= 20
- WH-B available += 20

---

### Test 3.3: Stock Visibility ✅

**Purpose:** Single view of stock across all warehouses

**Endpoint:** `GET /inventory/summary?productId=1`

**Expected Response:**
```json
{
  "productId": 1,
  "productName": "Phone XYZ",
  "byWarehouse": [
    {
      "warehouse_id": 1,
      "warehouseName": "Main Warehouse",
      "physical_on_hand": 100,
      "reserved": 40,
      "available": 60
    },
    {
      "warehouse_id": 2,
      "warehouseName": "Branch Warehouse",
      "physical_on_hand": 50,
      "reserved": 0,
      "available": 50
    }
  ],
  "total": {
    "physical_on_hand": 150,
    "reserved": 40,
    "available": 110
  }
}
```

---

## 🚀 Test Execution Script

### Quick Test All
```bash
# In terminal 1: Start backend
npm run start:dev

# In terminal 2: Run automated tests
node DAY1_TESTING_SCRIPT.js
```

### Manual Test with cURL

**Create Bill:**
```bash
curl -X POST http://localhost:3000/bills \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: 1" \
  -d '{
    "customerId": 1,
    "channel": "COUNTER",
    "paymentMethod": "CASH",
    "lines": [{
      "productId": 1,
      "warehouseId": 1,
      "quantity": 5,
      "unitPrice": 50000
    }]
  }'
```

**List Bills:**
```bash
curl http://localhost:3000/bills?skip=0&take=10 \
  -H "X-Organization-Id: 1"
```

**Get Gate Passes:**
```bash
curl http://localhost:3000/gate-passes?status=PENDING \
  -H "X-Organization-Id: 1"
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Build Fails with Schema Errors
**Cause:** Camel case vs snake_case mismatch  
**Fix:** Run tests directly without build
```bash
npm test -- src/modules/bills/__tests__
```

### Issue 2: Database Connection Error
**Fix:**
```bash
# Check PostgreSQL running
# Check DATABASE_URL in .env
# Run migrations
npx prisma migrate deploy
# Check database exists
psql -U user -d ghazanfar_dev -c "\dt"
```

### Issue 3: 404 on Bill Creation
**Cause:** Customer/product/warehouse doesn't exist  
**Fix:**
```bash
# Seed test data
npx prisma db seed
# Or create manually via /customers, /products endpoints first
```

### Issue 4: Gate Pass Not Created
**Cause:** Bill service transaction failed or gate pass creation code missing  
**Fix:**
```bash
# Check database for bill
SELECT * FROM "Bill" WHERE id = 1;
# Check logs for transaction errors
npm run start:dev  # and look at console output
```

### Issue 5: Inventory Not Reserved
**Cause:** Inventory update might not be executing in transaction  
**Fix:**
```bash
# Check in Prisma Studio
npx prisma studio
# Look at Inventory table - should show reserved > 0 after bill creation
```

---

## ✅ Sign-Off Checklist - Day 1

Complete these before considering Day 1 done:

**Bills API:**
- [ ] Single warehouse bill creates successfully
- [ ] Multi-warehouse bill creates successfully (2+ warehouses)
- [ ] Bill retrieval works
- [ ] Bill list with pagination works
- [ ] Bill update works (for DRAFT only)
- [ ] Bill status transitions work
- [ ] Bill deletion (soft delete) works

**Gate Pass Auto-Generation:**
- [ ] Single warehouse → 1 gate pass
- [ ] Multi-warehouse → N gate passes
- [ ] Gate passes have correct warehouse_id
- [ ] Gate passes have correct items
- [ ] Gate pass confirmation works
- [ ] Inventory decreased on confirmation

**Multi-Warehouse Inventory:**
- [ ] Inventory reserved (not decremented) on bill
- [ ] Inventory isolated per warehouse
- [ ] Warehouse A stock not affected by WH-B activity
- [ ] Stock visibility shows all warehouses

**Build & Deployment:**
- [ ] No critical runtime errors
- [ ] API responds <1s
- [ ] No orphaned database records
- [ ] Audit trail captures activities

---

## 🎉 Next Steps - Day 2

Once Day 1 complete:
1. Add permission enforcement (@RequirePermission decorators)
2. Test with different user roles
3. Verify business rule enforcement (credit limits, etc.)
4. Load testing (concurrent bills)

---

## 📞 Debugging Tips

### Enable SQL Logging
```typescript
// In main.ts or app.module.ts
const prisma = new PrismaService();
prisma.$use(async (params, next) => {
  console.log(`Query: ${params.model}.${params.action}`);
  return next(params);
});
```

### Check Transaction State
```bash
psql -U user -d ghazanfar_dev -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### Verify Inventory Calculations
```sql
SELECT 
  p.name,
  w.name as warehouse,
  i.physical_on_hand,
  i.reserved,
  i.available,
  (i.physical_on_hand - i.reserved) as expected_available
FROM "Inventory" i
JOIN "Product" p ON i.product_id = p.id
JOIN "Warehouse" w ON i.warehouse_id = w.id
ORDER BY p.id, w.id;
```

---

**Status: READY FOR TESTING**  
**Estimated Time: 4-6 hours for full Day 1**  
**Success = All checklists complete ✅**
