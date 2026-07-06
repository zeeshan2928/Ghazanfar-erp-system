# 🧪 TIER 1: INTEGRATION TEST QUICK START

**Purpose:** Verify the 3 critical systems work correctly:
- ✅ Gate Pass auto-generation on bill creation
- ✅ Inventory reservation on bill creation  
- ✅ Inventory deduction on gate pass confirmation

**Time:** 30-45 minutes (run + debug if issues)

---

## Prerequisites

```bash
# 1. Backend running on port 3000
npm run start:dev

# 2. Database seeded with test data (customers, products, warehouses)
# 3. At least 2 warehouses exist
# 4. At least 2 products exist with inventory
```

---

## Run the Test

### Option A: Using ts-node (Recommended)

```bash
# Install dependencies (one-time)
npm install axios --save-dev

# Run the test
npx ts-node test-critical-flow.ts
```

### Option B: Using Postman Collection (Manual)

Import the collection file: `test-critical-flow.postman_collection.json`

---

## What the Test Does

### STEP 1: Setup (Automatic)
```
✓ Create test customer
✓ Get warehouses (need 2+)
✓ Get products (need 2+)
✓ Store initial inventory levels
```

### STEP 2: Create Bill (Multi-warehouse)
```
Creates:
  - Bill with 2 line items
  - Item 1: Product A, Warehouse A, Qty 10
  - Item 2: Product B, Warehouse B, Qty 5

Verifies:
  ✓ Bill created with status APPROVED
  ✓ Gate passes auto-created (1 per warehouse)
  ✓ Inventory reserved (available decreases)
```

### STEP 3: Confirm Gate Pass
```
Confirms:
  - Gate pass from warehouse A (pick 10 items)

Verifies:
  ✓ Gate pass status = CONFIRMED
  ✓ Inventory deducted (physical_on_hand decreases)
  ✓ Reserved decreases
```

### STEP 4: Reject Gate Pass
```
Rejects:
  - Gate pass from warehouse B

Verifies:
  ✓ Gate pass status = REJECTED
  ✓ Reserved inventory released back to available
```

### STEP 5: Report Shortage (Partial Pick)
```
Reports:
  - Shortage on a gate pass (pick less than ordered)

Verifies:
  ✓ Gate pass status = PICKED
  ✓ Partial quantities handled correctly
```

---

## Expected Output

```
═══════════════════════════════════════════════════════════════════════════
  TIER 1: INTEGRATION TEST - GATE PASS + INVENTORY SYSTEM
═══════════════════════════════════════════════════════════════════════════

╔════════════════════════════════════════════════════════════════════╗
║ STEP 1: SETUP TEST DATA                                            ║
╚════════════════════════════════════════════════════════════════════╝

✅ PASS: Create Customer
   └─ ID: 5, Name: Test Customer 1720291764321
✅ PASS: Get Warehouses
   └─ Found 2 warehouses
✅ PASS: Get Products
   └─ Found 2 products
✅ PASS: Store Initial Inventory
   └─ Saved for comparison later

✅ SETUP COMPLETE

╔════════════════════════════════════════════════════════════════════╗
║ STEP 2: CREATE BILL (MULTI-WAREHOUSE)                              ║
╚════════════════════════════════════════════════════════════════════╝

✅ PASS: Create Bill
   └─ Bill ID: 123, Bill #: BILL-2026-000123
✅ PASS: Bill Status
   └─ Status: APPROVED
✅ PASS: Auto-create Gate Passes
   └─ Found 2 gate passes
✅ PASS: Gate Pass Numbering
   └─ First gate pass: GP-20260706-00001

✅ PASS: Inventory Reserved (Product 1)
   └─ Reserved: 10 (expected 10), Available: 45
✅ PASS: Inventory Reserved (Product 2)
   └─ Reserved: 5 (expected 5), Available: 78

✅ BILL CREATION COMPLETE

[... STEP 3, 4, 5 continue ...]

═══════════════════════════════════════════════════════════════════════════
  ✅ TEST SUITE COMPLETE
═══════════════════════════════════════════════════════════════════════════
```

---

## Interpreting Results

### ✅ All Tests PASS
```
→ Gate Pass + Inventory system is working correctly
→ Move to TIER 2: Build Gate Pass Frontend
```

### ❌ Some Tests FAIL

#### Problem: "Failed to create customer"
```
Solution:
  1. Check backend is running: npm run start:dev
  2. Check database connection
  3. Check JWT token in API config (if auth required)
```

#### Problem: "Need at least 2 warehouses"
```
Solution:
  1. Create 2 warehouses via API or database
  2. Or seed test data: npm run seed
```

#### Problem: "Inventory Reserved check fails"
```
Possible causes:
  - Inventory model missing reserved/available fields
  - Bill service not reserving inventory
  
Solution:
  Check:
    1. Prisma schema has these fields: reserved, available
    2. bills.service.ts lines 136-154 has reserve logic
    3. Run migration: npx prisma db push
```

#### Problem: "Gate Pass Confirm fails"
```
Possible causes:
  - gate-passes.service.ts confirm() has bugs
  - Inventory update logic is wrong
  
Solution:
  Check:
    1. gate-passes.service.ts lines 176-195
    2. Verify transaction logic
    3. Check error message for details
```

---

## Troubleshooting Checklist

- [ ] Backend running (`npm run start:dev`)
- [ ] Database has customers (at least 1)
- [ ] Database has products (at least 2)
- [ ] Database has warehouses (at least 2)
- [ ] Inventory records exist for products in warehouses
- [ ] `reserved` and `available` fields exist in Inventory model
- [ ] bills.service.ts has auto-trigger gate pass creation
- [ ] gate-passes.service.ts has confirm/reject logic
- [ ] axios installed (`npm install axios --save-dev`)

---

## Next Steps After PASS

1. **TIER 1.2: Verify API Endpoints** (1-2 hours)
   - Test each endpoint manually
   - Check response formats
   - Verify error handling

2. **TIER 2: Build Gate Pass Frontend** (30-40 hours)
   - List screen
   - Detail screen
   - Print layout

---

## Files Modified/Created

- ✅ `test-critical-flow.ts` - Integration test script
- ✅ `TIER1_TEST_GUIDE.md` - This file
- [ ] `test-critical-flow.postman_collection.json` - (Optional) Postman collection

---

## Questions?

If test fails, run with verbose logging:

```bash
# Add DEBUG=* to see detailed logs
DEBUG=* npx ts-node test-critical-flow.ts
```

Check the exact error message in the output and cross-reference with the Troubleshooting Checklist above.
