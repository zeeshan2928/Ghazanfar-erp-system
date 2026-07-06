# PHASE 1 Production Readiness Plan - This Week

**Objective:** Make the Bills → Gate Pass → Multi-Warehouse workflow production-ready  
**Timeline:** This week (5 working days)  
**Status:** Starting now  
**Last Updated:** July 5, 2026, 16:00 UTC

---

## PHASE 1 Checklist (Critical Path Items)

### ☐ 1. Fix & Test Bills API (Day 1-2)

**Current State Assessment:**
- Bills service exists: ✅ `src/modules/bills/services/bills.service.ts`
- Bills controller exists: ✅ `src/modules/bills/bills.controller.ts`
- Build passing: ✅ `npm run build`
- BUT: Need to verify all endpoints work correctly

**Test Cases to Run:**

#### 1.1 Bill Creation
```bash
# Test: Create a new bill
POST /bills
{
  "customerId": 1,
  "salesmanId": 1,
  "channel": "COUNTER",
  "paymentMethod": "cash",
  "lines": [
    {
      "productId": 1,
      "warehouseId": 1,
      "quantity": 10,
      "unitPrice": 500
    }
  ]
}

Expected Response:
✅ Bill created with ID
✅ Gate passes auto-generated (one per warehouse)
✅ Inventory reserved
✅ Status: APPROVED
```

**Checklist:**
- [ ] POST /bills creates bill
- [ ] Bill has sequential number (BILL-2025-XXXXXX)
- [ ] Gate passes auto-generated
- [ ] Inventory reserved (not decremented yet)
- [ ] Customer credit limit checked (if credit sale)
- [ ] Discount applied correctly
- [ ] Tax calculated correctly
- [ ] Response includes billId, billNumber, gatePass IDs

#### 1.2 Bill Retrieval
```bash
# Test: Get bill by ID
GET /bills/:billId

Expected:
✅ Returns full bill with:
  - Line items with product details
  - Customer details
  - Gate pass references
  - Status
  - Total amount
```

**Checklist:**
- [ ] GET /bills/:billId returns correct data
- [ ] Includes nested relationships (lines, customer, gate passes)
- [ ] Monetary values are INT (paisa, not rupees)
- [ ] Timestamps in UTC

#### 1.3 Bill Update (DRAFT mode only)
```bash
# Test: Update bill before confirmation
PUT /bills/:billId
{
  "discountAmount": 1000,
  "lines": [...]
}

Expected:
✅ Bill updated
✅ Only if status = DRAFT
✅ Gate passes NOT regenerated (already created)
```

**Checklist:**
- [ ] Can only update DRAFT bills
- [ ] Cannot update if already FINALIZED/PAID
- [ ] Line items can be modified
- [ ] Totals recalculated
- [ ] Timestamps updated

#### 1.4 Bill Status Transitions
```bash
# Test: Change bill status
PATCH /bills/:billId/status
{
  "status": "FINALIZED"
}

Workflow: DRAFT → FINALIZED → PAID
```

**Checklist:**
- [ ] DRAFT → FINALIZED allowed
- [ ] FINALIZED → PAID allowed
- [ ] Cannot skip steps
- [ ] Status change logged to audit trail
- [ ] Warehouse staff notified when FINALIZED

#### 1.5 Bill List with Pagination & Filtering
```bash
# Test: List bills with filters
GET /bills?skip=0&take=20&status=APPROVED&customerId=1

Expected:
✅ Paginated results
✅ Filtered results
✅ Total count
```

**Checklist:**
- [ ] Pagination works (skip, take)
- [ ] Status filter works
- [ ] Customer filter works
- [ ] Date range filter works
- [ ] Sorting works (by date, amount, status)
- [ ] hasMore flag correct

#### 1.6 Bill PDF Export
```bash
# Test: Export bill as PDF
GET /bills/:billId/export-pdf

Expected:
✅ Base64-encoded PDF
✅ Can print
✅ Shows all details
```

**Checklist:**
- [ ] PDF generation works
- [ ] PDF includes all details
- [ ] Can download
- [ ] Filename correct

---

### ☐ 2. Apply Permission Enforcement (Day 2-3)

**Current State:**
- RBAC guards exist: ✅ `src/common/guards/permission.guard.ts`
- User roles defined: ✅ 8 roles (ADMIN, MANAGER, ACCOUNTANT, SALESMAN, etc.)
- Permission model exists: ✅ FieldPermission, RoleBasedAccessControl

**Implementation Needed:**

#### 2.1 Apply @RequirePermission to Bills Endpoints

**File:** `src/modules/bills/bills.controller.ts`

Add decorators to each endpoint:
```typescript
@Post()
@RequirePermission('bill:create')
async create(@Body() dto: CreateBillDto, @OrgContext() ctx: any) {
  // Only ADMIN, MANAGER, SALESMAN can create
}

@Get()
@RequirePermission('bill:read')
async findAll(...) {
  // ADMIN, MANAGER, SALESMAN, ACCOUNTANT can view
}

@Get(':billId')
@RequirePermission('bill:read')
async findById(...) {
  // Same
}

@Put(':billId')
@RequirePermission('bill:edit')
async update(...) {
  // Only ADMIN, MANAGER can edit
}

@Patch(':billId/status')
@RequirePermission('bill:approve')
async changeStatus(...) {
  // Only MANAGER, ADMIN can approve
}

@Delete(':billId')
@RequirePermission('bill:delete')
async delete(...) {
  // Only ADMIN can delete
}
```

**Checklist:**
- [ ] Create endpoint: @RequirePermission('bill:create')
- [ ] Read endpoint: @RequirePermission('bill:read')
- [ ] Update endpoint: @RequirePermission('bill:edit')
- [ ] Status change: @RequirePermission('bill:approve')
- [ ] Delete endpoint: @RequirePermission('bill:delete')
- [ ] Each permission tested with each role

#### 2.2 Apply @RequirePermission to Gate Pass Endpoints

**File:** `src/modules/gate-passes/gate-passes.controller.ts`

```typescript
@Get()
@RequirePermission('gatepass:read')
async getPending(...) {
  // Only WAREHOUSE_STAFF, MANAGER can view
}

@Get(':gatePassId')
@RequirePermission('gatepass:read')
async getById(...) {}

@Post(':gatePassId/confirm')
@RequirePermission('gatepass:confirm')
async confirm(...) {
  // Only WAREHOUSE_STAFF, MANAGER
}

@Post(':gatePassId/reject')
@RequirePermission('gatepass:reject')
async reject(...) {
  // Only WAREHOUSE_STAFF, MANAGER
}

@Post(':gatePassId/shortage')
@RequirePermission('gatepass:shortage')
async reportShortage(...) {
  // Only WAREHOUSE_STAFF
}
```

**Checklist:**
- [ ] Read: @RequirePermission('gatepass:read')
- [ ] Confirm: @RequirePermission('gatepass:confirm')
- [ ] Reject: @RequirePermission('gatepass:reject')
- [ ] Shortage: @RequirePermission('gatepass:shortage')
- [ ] Each tested with correct/incorrect roles

#### 2.3 Apply @RequirePermission to Warehouse Endpoints

**File:** `src/modules/warehouse-transfers/warehouse-transfers.controller.ts`

```typescript
@Post()
@RequirePermission('transfer:create')
async create(...) {}

@Get()
@RequirePermission('transfer:read')
async getPending(...) {}

@Post(':transferId/start')
@RequirePermission('transfer:ship')
async startTransfer(...) {
  // Only WAREHOUSE_STAFF
}

@Post(':transferId/confirm-receipt')
@RequirePermission('transfer:receive')
async confirmReceipt(...) {
  // Only WAREHOUSE_STAFF (receiving end)
}
```

**Checklist:**
- [ ] Create: @RequirePermission('transfer:create')
- [ ] Read: @RequirePermission('transfer:read')
- [ ] Ship: @RequirePermission('transfer:ship')
- [ ] Receive: @RequirePermission('transfer:receive')

#### 2.4 Permission Test Suite

Create unit tests: `src/modules/bills/__tests__/bills-permissions.spec.ts`

```typescript
describe('Bills Permission Enforcement', () => {
  it('SALESMAN can create bill', async () => {
    // Setup: Create SALESMAN user
    // Action: POST /bills
    // Expect: 201 success
  })

  it('WAREHOUSE_STAFF cannot create bill', async () => {
    // Setup: Create WAREHOUSE_STAFF user
    // Action: POST /bills
    // Expect: 403 Forbidden
  })

  it('MANAGER can approve bill', async () => {
    // Setup: Create MANAGER user
    // Action: PATCH /bills/1/status to FINALIZED
    // Expect: 200 success
  })

  it('SALESMAN cannot approve bill', async () => {
    // Expect: 403 Forbidden
  })

  // ... more cases for each role/action combo
})
```

**Checklist:**
- [ ] Permission test suite created
- [ ] All role/action combinations tested
- [ ] Tests pass (100% pass rate)

---

### ☐ 3. Test Gate Pass Auto-Trigger System (Day 3-4)

**Requirement:** When bill is created, system auto-generates gate passes (one per warehouse per bill)

**Test Scenario 1: Single Warehouse Bill**
```
Input:
- Bill with Item A from Warehouse A

Expected:
✅ Bill created (status: APPROVED)
✅ 1 Gate Pass created (Warehouse A)
✅ Gate Pass status: PENDING
✅ Gate Pass contains Item A
✅ Inventory reserved: Item A -qty, reserved +qty
```

**Test Scenario 2: Multi-Warehouse Bill (KEY FOR YOUR WORKFLOW)**
```
Input:
- Bill with:
  - Item A from Warehouse A
  - Item B from Warehouse B
  - Item C from Warehouse A

Expected:
✅ Bill created (status: APPROVED)
✅ 2 Gate Passes created:
   - Gate Pass 1 (Warehouse A): Items A, C
   - Gate Pass 2 (Warehouse B): Item B
✅ Each Gate Pass status: PENDING
✅ Inventory reserved per warehouse:
   - WH-A: Item A qty, Item C qty
   - WH-B: Item B qty
```

**Test Scenario 3: Gate Pass Confirmation Flow**
```
Input:
- Bill 1001 created → 2 Gate Passes created
- Warehouse A confirms Gate Pass 1 (all items picked)
- Warehouse B confirms Gate Pass 2 (all items picked)

Expected After Both Confirmed:
✅ Both Gate Passes status: CONFIRMED
✅ Bill status: FULFILLED
✅ Inventory decremented:
   - WH-A: Item A, Item C decremented
   - WH-B: Item B decremented
✅ Customer receives "Order Fulfilled" notification
```

**Test Scenario 4: Gate Pass Shortage Handling**
```
Input:
- Bill 1001: Item A qty 10 from Warehouse A
- Warehouse A can only pick 8 units
- Report shortage: qty_picked=8, qty_short=2

Expected:
✅ Gate Pass status: SHORTAGE_REPORTED
✅ Bill status: PARTIALLY_FULFILLED
✅ Inventory decremented: -8 (not -10)
✅ Manager notified: "Shortage in Item A (qty 2)"
✅ Decision needed: ship partial or wait for restock?
```

**Checklist:**
- [ ] Single warehouse bill → 1 gate pass created
- [ ] Multi-warehouse bill → N gate passes (1 per warehouse)
- [ ] Gate pass created with correct items per warehouse
- [ ] Inventory reserved (not decremented)
- [ ] Gate pass status = PENDING initially
- [ ] Warehouse staff can confirm gate pass
- [ ] On all confirmations: bill status = FULFILLED
- [ ] Inventory decremented only on confirmation
- [ ] Shortage handling: partial confirmation works
- [ ] Manager alerts triggered correctly
- [ ] Audit log records all gate pass state changes

**Manual Testing Script:**

```bash
# 1. Create customers and products
POST /customers → get customer_id
POST /products → get product_id_1, product_id_2

# 2. Create multi-warehouse bill
POST /bills
{
  "customerId": customer_id,
  "channel": "COUNTER",
  "lines": [
    { "productId": product_id_1, "warehouseId": 1, "quantity": 10, "unitPrice": 500 },
    { "productId": product_id_2, "warehouseId": 2, "quantity": 20, "unitPrice": 300 }
  ]
}
→ get bill_id, gate_pass_ids[]

# 3. Verify gate passes created
GET /gatepass/1 → should show Product 1, qty 10
GET /gatepass/2 → should show Product 2, qty 20

# 4. Confirm warehouse 1
POST /gatepass/1/confirm
→ bill status should still be PENDING_OTHER_WAREHOUSE

# 5. Confirm warehouse 2
POST /gatepass/2/confirm
→ bill status should now be FULFILLED

# 6. Verify inventory decremented
GET /inventory/warehouse/1/product/product_id_1
→ available should be original - 10
```

---

### ☐ 4. Test Multi-Warehouse Operations (Day 4-5)

**Requirement:** Inventory management across multiple warehouses must be correct

#### 4.1 Inventory Isolation

```
Scenario:
- Warehouse A has: Item X (qty 50)
- Warehouse B has: Item X (qty 30)

When bill specifies: "Item X from Warehouse A", qty 40
Expected:
✅ Warehouse A: reserved +40
✅ Warehouse B: NOT affected
✅ Inventory returns:
   - WH-A/Item X: 50 - 40 = 10 available
   - WH-B/Item X: 30 (unchanged)
```

**Checklist:**
- [ ] Create same product in 2 warehouses with different quantities
- [ ] Create bill requesting from specific warehouse
- [ ] Verify only that warehouse inventory affected
- [ ] Other warehouse inventory unchanged

#### 4.2 Warehouse Transfer Operations

```
Scenario:
- Move 20 units of Item X from Warehouse A → Warehouse B

Expected Flow:
1. Create transfer: WH-A → WH-B, Item X qty 20
   - WH-A Item X: reserved +20 (not yet decremented)
   - WH-B Item X: no change
   - Transfer status: PENDING

2. Warehouse A ships:
   - Transfer status: SHIPPED
   - Inventory still same (reserved)

3. Warehouse B receives:
   - Transfer status: RECEIVED
   - WH-A Item X: decremented -20
   - WH-B Item X: incremented +20
```

**Checklist:**
- [ ] Create warehouse transfer
- [ ] Start transfer (PENDING → SHIPPED)
- [ ] Confirm receipt (SHIPPED → RECEIVED)
- [ ] Source warehouse decremented correctly
- [ ] Destination warehouse incremented correctly
- [ ] Both warehouses audit logs created

#### 4.3 Warehouse Assignment in Bill Entry

```
Scenario: Data entry operator creates bill

Expected Behavior:
1. Operator selects product "Phone XYZ"
2. System shows popup:
   "Which warehouse? 
    □ Warehouse A (45 units)
    □ Warehouse B (12 units)
    □ Warehouse C (0 units - grayed)"
3. Operator selects Warehouse A
4. System adds to bill: "Phone XYZ (WH-A, qty X)"
5. On bill submit:
   - Gate Pass for WH-A created
   - Only WH-A inventory affected
```

**Checklist:**
- [ ] Bill form shows warehouse selector
- [ ] Current stock shown per warehouse
- [ ] Operator can select warehouse
- [ ] Multiple items from different warehouses allowed
- [ ] Bill submission creates correct gate passes

#### 4.4 Stock Visibility Across Warehouses

```
Query: GET /inventory?productId=1
Expected:
{
  "product": { "id": 1, "name": "Phone" },
  "byWarehouse": [
    { "warehouseId": 1, "warehouseName": "Main", "available": 45, "reserved": 10, "physical": 55 },
    { "warehouseId": 2, "warehouseName": "Branch", "available": 12, "reserved": 5, "physical": 17 },
    { "warehouseId": 3, "warehouseName": "Storage", "available": 0, "reserved": 0, "physical": 0 }
  ],
  "total": { "available": 57, "reserved": 15, "physical": 72 }
}
```

**Checklist:**
- [ ] Stock visibility endpoint works
- [ ] Shows per-warehouse breakdown
- [ ] Shows totals across warehouses
- [ ] Available = physical - reserved
- [ ] Accuracy verified across multiple products

#### 4.5 Stock Movement Audit Trail

```
Every stock change must be logged:
- Bill created: reserved stock
- Gate pass confirmed: decremented stock
- Transfer received: warehouse-to-warehouse movement
- Stock adjustment: damage/loss/correction
```

**Checklist:**
- [ ] StockMovementLog created for each change
- [ ] Log includes: from_warehouse, to_warehouse, qty, reason
- [ ] All movements traceable
- [ ] Audit trail complete and accurate

---

## Test Execution Plan (Daily Schedule)

### Day 1: Bills API Testing
```
Morning (2 hours):
- [ ] Set up test database with sample customers, products, warehouses
- [ ] Implement test script for Bill CRUD
- [ ] Run and verify all bill creation scenarios

Afternoon (2 hours):
- [ ] Test bill retrieval (single, list, filtered)
- [ ] Test bill updates
- [ ] Test status transitions
- [ ] Document any failures
```

### Day 2: Permission Enforcement + Gate Pass
```
Morning (2 hours):
- [ ] Add @RequirePermission decorators to all endpoints
- [ ] Create permission test suite
- [ ] Run permission tests for each role

Afternoon (2 hours):
- [ ] Test gate pass auto-trigger on bill creation
- [ ] Test multi-warehouse gate pass generation
- [ ] Test gate pass confirmation workflow
```

### Day 3: Gate Pass Complete + Permission Bug Fixes
```
Morning (2 hours):
- [ ] Fix any permission test failures
- [ ] Complete gate pass shortage handling tests
- [ ] Test audit trail logging

Afternoon (2 hours):
- [ ] Run full bill → gate pass → fulfillment flow
- [ ] Document expected vs actual behavior
- [ ] Fix any bugs found
```

### Day 4: Multi-Warehouse Inventory Testing
```
Morning (2 hours):
- [ ] Test inventory isolation across warehouses
- [ ] Test warehouse transfer create/ship/receive
- [ ] Verify inventory movements correct

Afternoon (2 hours):
- [ ] Test multi-warehouse bill submission
- [ ] Test stock visibility endpoints
- [ ] Verify audit trail for all movements
```

### Day 5: Integration Testing + Bug Fixes + Production Readiness Sign-Off
```
Morning (2 hours):
- [ ] Run end-to-end scenario: order → multi-warehouse gate pass → fulfillment
- [ ] Fix any remaining bugs
- [ ] Create test report

Afternoon (2 hours):
- [ ] Final smoke tests
- [ ] Build verification
- [ ] Sign-off on production readiness
- [ ] Document any known issues
```

---

## Testing Tools & Environment

### Local Testing Database
```bash
# Already configured in .env.development
DATABASE_URL=postgresql://user:password@localhost:5432/ghazanfar_dev
```

### API Testing (Postman / REST Client)
```
Create collection: Ghazanfar ERP Phase 1 Tests
Endpoints:
- Bills CRUD
- Gate Pass Management
- Warehouse Transfer
- Inventory
- Permissions
```

### Unit Tests (Jest)
```bash
npm test -- src/modules/bills/__tests__
npm test -- src/modules/gate-passes/__tests__
npm test -- src/modules/warehouse-transfers/__tests__
```

### Build & Compilation
```bash
npm run build  # Must pass without errors
```

### Database State
```bash
# Reset DB for each test day
npx prisma migrate reset --force

# Seed with test data
npx prisma db seed
```

---

## Known Risks & Mitigations

### Risk 1: Bill Amounts Not Calculating Correctly
**Symptom:** totalAmount != subtotal - discount + tax
**Check:** 
```bash
# Log in bill.service.ts
console.log('subtotal:', subtotal, 'discount:', discount, 'tax:', tax, 'total:', total);
```
**Mitigation:** Use INT arithmetic only (no floats)

### Risk 2: Gate Passes Not Auto-Generating
**Symptom:** Bill created but no gate passes
**Check:**
```typescript
// In bills.service.ts create() method
console.log('Creating gate passes...');
// Verify gate pass creation loop executes
```
**Mitigation:** Add debug logs, trace execution path

### Risk 3: Inventory Decrements Twice
**Symptom:** Item qty goes negative after gate pass confirm
**Check:**
```typescript
// Should decrement ONLY when gate pass confirmed, NOT when bill created
// Verify: on bill creation, inventory is RESERVED (not decremented)
// On gate pass confirm, inventory is DECREMENTED
```
**Mitigation:** Separate reservation & confirmation logic

### Risk 4: Permissions Not Enforced
**Symptom:** WAREHOUSE_STAFF can create bills
**Check:**
```bash
# Test with restricted user
curl -H "Authorization: Bearer WAREHOUSE_STAFF_TOKEN" POST /bills
# Should return 403
```
**Mitigation:** Add @RequirePermission to ALL endpoints

### Risk 5: Multi-Warehouse Gate Passes Not Grouped Correctly
**Symptom:** One gate pass created instead of two
**Check:**
```typescript
// In bills.service.ts, group line items by warehouse
const grouped = groupBy(lines, 'warehouseId');
// Should create one gate pass per group
```
**Mitigation:** Add unit test with 3+ warehouses

---

## Sign-Off Criteria (Production Ready)

✅ **All Tests Pass**
- [ ] Bill CRUD tests: 100% pass
- [ ] Permission tests: 100% pass (8 roles tested)
- [ ] Gate pass tests: 100% pass
- [ ] Multi-warehouse tests: 100% pass

✅ **Build Passes**
- [ ] `npm run build` completes without errors
- [ ] No TypeScript warnings
- [ ] No linting issues

✅ **API Endpoints Verified**
- [ ] 5+ manual API tests completed
- [ ] Postman collection documented
- [ ] All endpoints return expected status codes
- [ ] Audit logs verified for each endpoint

✅ **Database Integrity**
- [ ] Inventory calculations verified
- [ ] Stock movements audited
- [ ] No orphaned records
- [ ] Foreign key constraints intact

✅ **Documentation Complete**
- [ ] Test results documented
- [ ] Known issues logged (if any)
- [ ] Runbook created for manual testing
- [ ] Deployment checklist prepared

✅ **Performance Acceptable**
- [ ] Bill creation: <500ms
- [ ] Gate pass retrieval: <200ms
- [ ] Inventory query: <300ms
- [ ] Multi-warehouse operations: <1s

---

## Success = Ready for Deployment ✅

Once all sign-off criteria met:
- ✅ Bills system production-ready
- ✅ Gate pass auto-trigger verified
- ✅ Multi-warehouse operations validated
- ✅ Permission enforcement active
- ✅ Ready for Phase 2 (Warehouse staff apps) →

---

**Current Status: READY TO START**  
**Estimated Completion: End of week**  
**Next Steps: Execute Day 1 testing schedule**

Start with: Bills CRUD test suite → Gate pass auto-trigger verification → Multi-warehouse validation
