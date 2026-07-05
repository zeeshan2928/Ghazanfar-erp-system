# 🔨 WHAT'S LEFT BEHIND - COMPLETE BUILD ROADMAP

**Status:** Ready for implementation  
**Total Gaps:** 25 major features across 9 categories  
**Estimated Time:** 8-12 weeks for full implementation  

---

## 📊 GAPS BY CATEGORY & PRIORITY

### 🔴 CRITICAL (Must Have - Core Business Logic)

These are NOT optional. Without these, the ERP doesn't solve your actual problem.

#### 1. GATE PASS SYSTEM (Warehouse Core)
**Why Critical:** This is your competitive advantage. Every bill must auto-generate gate passes per warehouse.

**What Needs to Be Built:**

```
Backend:
  - GatePass model in Prisma
    ├─ bill_id (FK to Bill)
    ├─ warehouse_id (FK to Warehouse)
    ├─ status (PENDING, PICKED, SHORTAGE, CONFIRMED, CANCELLED)
    ├─ gate_pass_number (auto-generated: GP-2025-00001)
    ├─ items[] (gate pass line items)
    ├─ created_at, confirmed_at, confirmed_by_user_id
    └─ remarks
  
  - GatePassLineItem model
    ├─ gate_pass_id
    ├─ product_id
    ├─ quantity_ordered
    ├─ quantity_picked (null until picked)
    ├─ quantity_shortage (null until shortage reported)
    └─ remarks

  - API Endpoints:
    POST   /api/v1/bills/{billId}/generate-gatepass
    GET    /api/v1/gatepass/{warehouseId} (list pending)
    GET    /api/v1/gatepass/{id}
    PUT    /api/v1/gatepass/{id}/pick
    PUT    /api/v1/gatepass/{id}/confirm
    PUT    /api/v1/gatepass/{id}/shortage

  - Service Layer:
    - GatePassService (generate, list, confirm, shortage handling)
    - Auto-triggers on bill creation
    - Handles multi-warehouse distribution logic

Frontend:
  - Gate Pass List Screen (warehouse staff view)
    ├─ Filter by warehouse
    ├─ Filter by status (PENDING, PICKED, etc.)
    ├─ Bill # / Customer name / Date
    ├─ Item count
    ├─ Action buttons (VIEW, PICK, CONFIRM)
  
  - Gate Pass Detail Screen
    ├─ Bill info
    ├─ Items table (code, name, qty ordered)
    ├─ Current stock per item
    ├─ Quantity picked field (editable)
    ├─ Shortage report (if qty < ordered)
    ├─ Confirm button
  
  - Gate Pass Print Layout
    ├─ Printable HTML
    ├─ Thermal printer compatible
    ├─ Barcode for warehouse scanning
```

**Effort:** 40-50 hours  
**Blockers:** None (can start immediately)  
**Test Requirements:** 
- Auto-generate gate passes for multi-warehouse bills
- Mark picked correctly
- Handle shortages
- Update inventory only on confirm
- Print layout works

---

#### 2. INVENTORY RESERVATION & CONFIRMATION
**Why Critical:** Inventory shouldn't decrement when bill is created. Must wait for gate pass confirmation.

**What Needs to Be Built:**

```
Backend:
  - InventoryReservation model
    ├─ bill_id
    ├─ warehouse_id
    ├─ product_id
    ├─ quantity_reserved
    ├─ status (RESERVED, PICKED, CONFIRMED, CANCELLED)
    ├─ created_at
    ├─ confirmed_at
    └─ confirmed_by_user_id

  - Update Inventory model:
    ├─ quantity_on_hand (current actual stock)
    ├─ quantity_reserved (reserved but not yet decremented)
    ├─ quantity_available (on_hand - reserved)

  - Service Layer:
    - On bill creation → create reservations (don't decrement inventory)
    - On gate pass confirm → convert reservation to actual decrement
    - On gate pass shortage → adjust reservation to picked amount
    - On bill cancel → release reservations

  - API:
    GET /api/v1/inventory/warehouse/{id}
      → returns: on_hand, reserved, available per product
    
    GET /api/v1/products/{id}/stock
      → returns stock across all warehouses
```

**Effort:** 20-25 hours  
**Blockers:** Depends on Gate Pass system  
**Test Requirements:**
- Bill creates with reservation (no inventory change)
- Gate pass confirm decrements actual inventory
- Shortage handling correctly adjusts reservation
- Availability calculation correct

---

#### 3. CASH BOOK INTEGRATION & RECONCILIATION
**Why Critical:** Audit trail. ERP bills must match physical cash book.

**What Needs to Be Built:**

```
Backend:
  - CashBookEntry model
    ├─ bill_id (FK)
    ├─ entry_number (from physical book: 1, 2, 3...)
    ├─ entry_date DateTime
    ├─ amount Int (paisa)
    ├─ payment_method (CASH, CHECK, CARD, CREDIT)
    ├─ check_number (if payment_method = CHECK)
    ├─ remarks
    ├─ reconciled Boolean
    ├─ reconciled_at DateTime?
    └─ reconciled_by_user_id?

  - API:
    POST   /api/v1/bills/{billId}/link-cashbook
    GET    /api/v1/reconciliation/report?from_date=X&to_date=Y
    POST   /api/v1/reconciliation/verify
    
    Reconciliation report returns:
    {
      cash_book_total: 500000,
      erp_bill_total: 495000,
      discrepancies: [
        {
          entry_number: 5,
          cash_book_amount: 10000,
          erp_amount: 8000,
          difference: 2000,
          status: "MISMATCH"
        }
      ],
      missing_entries: [3, 7, 12],
      status: "MISMATCHED" | "RECONCILED"
    }

  - Service Layer:
    - Match cash book entries to bills
    - Identify missing entries
    - Calculate discrepancies
    - Generate reconciliation report
```

**Effort:** 25-30 hours  
**Blockers:** None  
**Test Requirements:**
- Match bills to cash book entries
- Detect missing entries
- Calculate totals correctly
- Flag discrepancies

---

### 🟠 HIGH PRIORITY (Should Have - Major UX/Workflow)

#### 4. BILL ENTRY FORM WITH WAREHOUSE SELECTION
**Current State:** Basic form exists  
**Missing:** Warehouse popup, customer history, sourcing info

**What Needs to Be Built:**

```
Frontend Enhancement:
  - Bill Entry Form Modifications:
    
    Step 1: Customer Selection
      → On select, show POPUP B: "Last 10 Sales"
        ├─ Date, Items Purchased, Qty, Amount, Bill#
        ├─ Click Bill# → open detail in new tab
        └─ Helps operator know customer patterns
    
    Step 2: Add Product
      → Click "Add Product"
      → Search dropdown appears
      → On product select, show POPUP A: "Warehouse & Stock"
        ├─ WH-A: 45 units
        ├─ WH-B: 12 units
        ├─ WH-C: 0 units (disabled)
        ├─ Select warehouse (radio/checkbox)
        ├─ Enter quantity
        ├─ On CONFIRM → add to bill
      
      → Show POPUP C: "Product Sourcing" (optional)
        ├─ Last 5 vendor purchases
        ├─ PO number, qty, cost
        └─ Helps manager reorder planning
    
    Step 3: Preview Before Submit
      → Show all items
      → Show gate passes that will be generated
      → "1 gate pass for WH-A (2 items), 1 for WH-B (1 item)"
      → Preview print layout of gate passes
      → Then submit

Backend Enhancement:
  - API endpoint: GET /api/v1/customers/{id}/sale-history
    {
      date, items[], qty, amount, bill_number
    }
  
  - API endpoint: GET /api/v1/products/{id}/vendor-history
    {
      date, vendor_name, po_number, qty, cost_price
    }
  
  - Modify POST /api/v1/bills
    ├─ Accept items with warehouse_id per item
    ├─ On create, auto-generate gate passes
    └─ Return gate pass preview
```

**Effort:** 35-40 hours  
**Blockers:** Needs Gate Pass system first  
**Test Requirements:**
- Warehouse popup shows correct stock
- Popups display correct history
- Gate passes generated per warehouse
- Preview matches actual generation

---

#### 5. WAREHOUSE FULFILLMENT WORKFLOW
**Why High Priority:** Your actual operation depends on this.

**What Needs to Be Built:**

```
Frontend - Warehouse Staff Screen:
  
  Screen 1: Gate Pass Queue
    ├─ Filter: All / Pending / Picked / Shortage Reported
    ├─ Table:
    │  ├─ Gate Pass #
    │  ├─ Bill #
    │  ├─ Customer
    │  ├─ Date Created
    │  ├─ Item Count
    │  ├─ Status
    │  └─ Action (VIEW)
    └─ Staff clicks VIEW to open gate pass detail

  Screen 2: Gate Pass Detail (MOBILE OPTIMIZED)
    ├─ Gate Pass Header
    │  ├─ Gate Pass #: GP-2025-001
    │  ├─ Bill #: BILL-2025-0042
    │  ├─ Customer: Ali Trades
    │  ├─ Warehouse: WH-A
    │  └─ Created: 2025-07-05 2:30 PM
    │
    ├─ Items to Pick (TABLE)
    │  ├─ [Item Row 1]
    │  │  ├─ Code: PHONE-XYZ
    │  │  ├─ Name: Smartphone Model X
    │  │  ├─ Qty Ordered: 10
    │  │  ├─ Current Stock: 10
    │  │  └─ Qty Picked: [___] (input field)
    │  │
    │  └─ [Item Row 2]
    │     ├─ Code: CHARGER-USB
    │     ├─ Name: USB-C Charger
    │     ├─ Qty Ordered: 20
    │     ├─ Current Stock: 15  ← INSUFFICIENT!
    │     └─ Qty Picked: [___] (input field, max 15)
    │
    ├─ Shortage Section (COLLAPSIBLE)
    │  ├─ If any item: current_qty < ordered_qty
    │  │  └─ "Item: Charger USB-C, Ordered: 20, Available: 15, Shortage: 5"
    │  │
    │  └─ "Report Shortage" button
    │
    ├─ Actions:
    │  ├─ CANCEL (cancel gate pass)
    │  ├─ SAVE AS DRAFT (offline support)
    │  └─ CONFIRM (confirm all items picked, update inventory)
    │
    └─ Remarks (free text, optional)

Backend:
  - Service: GatePassFulfillmentService
    ├─ markPicked(gatePassId, items[])
    ├─ reportShortage(gatePassId, shortageItems[])
    ├─ confirmPickup(gatePassId)
    └─ cancelGatePass(gatePassId)
  
  - On confirmPickup:
    ├─ Verify all items picked (or shortages reported)
    ├─ Update inventory: decrement by picked qty
    ├─ Update gate pass status to CONFIRMED
    ├─ Update bill status (if all warehouses confirmed → FULFILLED)
    ├─ Notify manager if shortages
    └─ Notify customer (WhatsApp) if fulfilled
  
  - On shortage report:
    ├─ Flag gate pass as PARTIAL
    ├─ Decrement inventory by available qty, not ordered
    ├─ Notify manager: "shortage in X, approve partial?"
    └─ Bill status = PARTIALLY_FULFILLED until manager approves
```

**Effort:** 45-55 hours  
**Blockers:** Needs Gate Pass + Inventory Reservation  
**Test Requirements:**
- Warehouse staff can pick items
- Shortage detection works
- Inventory only decrements on confirm
- Bill status updates correctly
- Notifications trigger

---

#### 6. WAREHOUSE MANAGER DASHBOARD
**Why High Priority:** Manager needs real-time visibility.

**What Needs to Be Built:**

```
Frontend - Manager Dashboard:
  
  Top Metrics (KPIs):
    ├─ Bills Created Today: 15 | Total: Rs. 85,000
    ├─ Gate Passes Pending: 3 (WH-A: 1, WH-B: 2)
    ├─ Shortages Today: 2 items
    └─ Cash Book Match: ✓ Balanced

  Section 1: Today's Bills (Table)
    ├─ Bill #
    ├─ Customer
    ├─ Amount
    ├─ Status (PENDING, PARTIAL, FULFILLED, CANCELLED)
    ├─ Gate Passes Status (3 warehouses, show progress)
    └─ Action (VIEW)

  Section 2: Pending Gate Passes by Warehouse (Cards)
    ├─ [WH-A Card]
    │  ├─ Pending: 3 gate passes
    │  ├─ Items to pick: 45 units
    │  ├─ Shortages: 2 items
    │  └─ Action (VIEW ALL)
    └─ [WH-B Card]
       ├─ Pending: 1 gate pass
       ├─ Items to pick: 12 units
       ├─ Shortages: 0
       └─ Action (VIEW ALL)

  Section 3: Shortages Alert (Table)
    ├─ Item Code
    ├─ Item Name
    ├─ Warehouse
    ├─ Shortage Qty
    ├─ Date Reported
    └─ Action (APPROVE PARTIAL | WAIT FOR RESTOCK)

  Section 4: Cash Reconciliation (Info Box)
    ├─ Cash Book Total: Rs. 85,000
    ├─ ERP Bill Total: Rs. 85,000
    ├─ Status: ✓ BALANCED
    ├─ Last Reconciled: 2025-07-05 4:15 PM
    └─ Action (VIEW DETAILS)

  Section 5: Warehouse Stock Alert (Table)
    ├─ Items Below Reorder Point
    ├─ Product | Current | Reorder | Warehouse
    └─ Action (CREATE PURCHASE ORDER)

Backend:
  - API: GET /api/v1/manager/dashboard?date=YYYY-MM-DD
    Returns: {
      bills_today: { count, total_amount },
      gate_passes_pending: { total, by_warehouse[] },
      shortages: [],
      cash_reconciliation: { cash_book, erp, status },
      stock_alerts: []
    }
```

**Effort:** 30-35 hours  
**Blockers:** Needs Gate Pass + Inventory systems  
**Test Requirements:**
- KPIs calculate correctly
- Gate pass counts accurate
- Shortages show properly
- Cash reconciliation works

---

#### 7. INLINE EDITING (Across All Screens)
**Why High Priority:** Major UX improvement. Every field should be editable.

**What Needs to Be Built:**

```
Frontend Pattern - Inline Edit:
  
  Implementation:
    ├─ Double-click any cell → becomes editable
    ├─ Input type depends on field type (text, number, date, dropdown)
    ├─ Auto-save on blur or Enter key
    ├─ Show spinner while saving
    ├─ On success → cell updates, no refresh
    ├─ On error → roll back, show error toast
    └─ Undo toast appears for 5 seconds

  Example: Bill Screen
    Before:
      | Bill # | Customer | Amount | Status |
      | 1001   | Ali      | 25,000 | PENDING |
    
    User double-clicks "Ali" cell:
      | Bill # | Customer [EDIT BOX] | Amount | Status |
      |        | "Ali"               |        |        |
    
    User types "Ali Traders", presses Enter:
      → API call: PATCH /api/v1/bills/1001 { customer_name: "Ali Traders" }
      → Success: cell updates to "Ali Traders"
      → Toast: "Undo" link for 5 seconds

Backend:
  - PATCH endpoints for every entity
    PATCH /api/v1/bills/{id}        - update single field
    PATCH /api/v1/bills/{id}/lines/{lineId}  - update line item
    etc.
  
  - Field Validation:
    ├─ On every PATCH, validate field value
    ├─ Return error if invalid
    ├─ Client shows error toast (don't save)
    ├─ Allow retry immediately
  
  - Audit Log:
    ├─ Every PATCH logged: who, what, when, old value, new value
    ├─ Accessible in "Audit Trail" section of any record
  
  - Concurrent Edit Detection:
    ├─ On PATCH, check if record has been modified by someone else
    ├─ If yes, return 409 CONFLICT with new data
    ├─ Client shows modal: "This record changed. Yours vs Theirs. Choose."
```

**Effort:** 40-50 hours  
**Blockers:** None (can build anytime)  
**Test Requirements:**
- Edit works for all field types
- Validation prevents bad data
- Audit log captures changes
- Concurrent edit detection works
- Undo works

---

### 🟡 MEDIUM PRIORITY (Nice to Have - UX/Navigation)

#### 8. COMMAND PALETTE (Ctrl+K)
```
When user presses Ctrl+K:
  ├─ Overlay appears with search box
  ├─ User types: "purchase order"
  ├─ Results appear:
  │  ├─ Go to Purchase Order List
  │  ├─ Create New Purchase Order
  │  ├─ View PO #1234 (recent)
  │  └─ Search Products
  ├─ User selects → navigate or execute
  └─ Escape closes

Effort: 20-25 hours
Blockers: None
```

---

#### 9. KEYBOARD SHORTCUTS - COMPLETE SET
```
Planned Shortcuts:
  Ctrl+N    → New record (context-aware)
  Ctrl+S    → Save current form
  Ctrl+F    → Search within current screen
  Ctrl+K    → Command palette
  Ctrl+P    → Print current view
  Ctrl+D    → Duplicate current record
  F2        → Edit current field / Enter edit mode
  Esc       → Cancel edit / Close modal
  Enter     → Save / Submit
  Alt+1..9  → Jump to recently viewed record 1-9
  ?         → Show all shortcuts (modal overlay)

Effort: 15-20 hours
Blockers: Inline editing must be done first
```

---

#### 10. USER PREFERENCES & PERSONALIZATION
```
Stored per user, synced across devices:
  ├─ Column visibility (show/hide Product Code, Cost Price, etc.)
  ├─ Column order (drag to reorder in grids)
  ├─ Column width (remember width for each column)
  ├─ Default filters (e.g., "Ali" always sees "unpaid bills" first)
  ├─ Density (compact / normal / comfortable)
  ├─ Theme (light / dark)
  ├─ Language (English / Urdu)
  ├─ Recently viewed records (stored, linked in sidebar)
  ├─ Pinned reports (quick access)
  └─ Timezone (for timestamp display)

Effort: 25-30 hours
Blockers: Inline editing should be done first
```

---

#### 11. RECORD CONTEXT STACK & DEEP LINKING
```
Current Problem:
  - User opens Bill #1001 from list
  - Clicks Next → should show Bill #1002 in SAME filtered/sorted context
  - But: clicking Next goes to next by ID, not next in list

Solution:
  - Store filter/sort state when opening record from list
  - Ctrl+→ / Ctrl+← uses context to find actual next/prev
  - Every record has deep URL: /bills/1001
  - Can navigate directly: click link → opens record + restores context

Effort: 20-25 hours
Blockers: None
```

---

#### 12. UNIVERSAL DATA GRID FEATURES
```
Missing Grid Features:
  ├─ Column Resize (drag column border to resize)
  ├─ Column Reorder (drag column header to reorder)
  ├─ Column Show/Hide (right-click header → toggle visibility)
  ├─ Bulk Actions (select rows → bar appears → Delete All / Export / etc.)
  ├─ Row Expansion (chevron → shows child rows / details)
  ├─ Frozen Columns (first N columns stay while scrolling right)
  ├─ Sticky Summary Row (bottom: Sum, Avg, Count)
  ├─ Density Toggle (compact / normal / comfortable)
  ├─ Loading Skeleton (while data loads)
  └─ Empty State (consistent UI when no data)

Effort: 50-60 hours
Blockers: None, but best done after inline editing
```

---

#### 13. EXPORT FEATURES (Excel, CSV, PDF, Print)
```
From any grid:
  ├─ Export to Excel (.xlsx with formatting)
  ├─ Export to CSV (simple format)
  ├─ Export to PDF (styled, with headers)
  ├─ Print to PDF or printer
  ├─ Column selection (choose which columns to export)
  └─ Include filters (export filtered results, not all)

Effort: 20-25 hours
Blockers: None
```

---

### 🔵 LOW PRIORITY (Nice to Have - Advanced)

#### 14. OFFLINE-FIRST SYNC (Outbox Pattern)
```
For warehouse staff on tablets:
  - App works offline (no internet)
  - Changes stored locally in SQLite
  - When online: syncs changes to server
  - Conflict resolution if item edited by multiple people
  - Queue viewer: "5 pending syncs"
  - Retry with exponential backoff

Tech: Tauri (Windows), React Native (Android)
Effort: 60-80 hours
Blockers: Needs gate pass + fulfillment system
Note: This requires building Tauri desktop app + mobile app
```

---

#### 15. MOBILE/TABLET APP (Android - Kotlin/Jetpack)
```
For warehouse staff:
  - Login with biometric
  - See pending gate passes
  - Tap gate pass → see items
  - Pick items → tap "Mark Picked"
  - Report shortage
  - Confirm dispatch
  - Offline sync when internet returns

Effort: 80-120 hours
Blockers: Needs gate pass system + offline sync
Note: Separate from web app
```

---

#### 16. ATTACHMENTS & COMMENTS
```
Every entity supports:
  - File attachments (invoice scans, product photos, warranty)
  - Free-text comments/notes
  - Activity timeline (who did what, when)
  - Tags/labels

Effort: 25-30 hours
Blockers: None, independent feature
```

---

#### 17. URDU LOCALIZATION & RTL
```
Full Urdu support:
  ├─ Translate all UI strings to Urdu
  ├─ RTL layout (flip all left/right CSS)
  ├─ Locale-aware number formatting (100,000 not 1,00,000)
  ├─ Locale-aware date formatting
  ├─ Currency formatting (PKR symbol)
  └─ User can toggle language (English ↔ Urdu)

Effort: 30-40 hours
Blockers: None, but needs translation files
```

---

#### 18. WAREHOUSE TRANSFER SYSTEM
```
Move stock between warehouses:
  ├─ Create transfer: from WH-A → to WH-B
  ├─ Add items + quantities
  ├─ Submit → create internal transfer document
  ├─ WH-A staff marks "shipped"
  ├─ WH-B staff marks "received"
  ├─ Inventory auto-updates

Effort: 20-25 hours
Blockers: None, independent feature
```

---

#### 19. MULTI-CHANNEL PRICING & SYNC
```
Products sold through multiple channels:
  ├─ Counter (physical shop)
  ├─ Website (e-commerce)
  ├─ Wholesale (bulk)
  ├─ Corporate (special pricing)
  
  Different prices per channel
  Different visibility per channel
  Website approval workflow for orders
  Pricing rules engine (discounts based on qty, customer type, etc.)

Effort: 50-60 hours
Blockers: Needs bill entry form + gate pass system
```

---

#### 20. REPORT BUILDER FRAMEWORK
```
Manager can create custom reports:
  ├─ Select columns
  ├─ Add filters
  ├─ Group by (customer, warehouse, date, category)
  ├─ Aggregations (sum, avg, count, min, max)
  ├─ Save as view
  ├─ Schedule email (daily at 9pm)
  ├─ Drill-down (click total → see detail rows)
  └─ Charts (bar, pie, line)

Effort: 40-50 hours
Blockers: None, but needs export working first
```

---

#### 21. AUTOMATIC PURCHASE ORDER GENERATION
```
When inventory falls below reorder point:
  ├─ System detects low stock
  ├─ Auto-creates PO with default vendor
  ├─ Manager approves
  ├─ PO sent to vendor
  ├─ When goods arrive → gate pass workflow for receiving

Effort: 20-25 hours
Blockers: Needs inventory + vendor management
```

---

## 📈 IMPLEMENTATION TIMELINE

### Phase 6A: Gate Pass & Warehouse Fulfillment (Weeks 1-2)
```
Week 1:
  Day 1-2: Gate Pass model + API endpoints
  Day 3: Warehouse fulfillment workflow
  Day 4: Gate Pass generation on bill create
  Day 5: Testing + bug fixes

Week 2:
  Day 1-2: Warehouse staff UI (gate pass list + detail)
  Day 3: Print layout + warehouse display
  Day 4: Integration testing
  Day 5: UAT with warehouse team

Deliverable: Warehouse staff can pick items + confirm gate passes
Time: 80 hours
Team: 1 backend + 1 frontend
```

---

### Phase 6B: Inventory & Cash Book (Week 3)
```
Day 1-2: Inventory reservation system
Day 3: Cash book integration
Day 4: Reconciliation report
Day 5: Testing + integration

Deliverable: Bills create with reservations, confirm reduces inventory, cash book reconciles
Time: 50 hours
Team: 1 backend
```

---

### Phase 6C: Manager Dashboard & Reports (Week 4)
```
Day 1-2: Manager dashboard UI
Day 3-4: Dashboard KPI calculations
Day 5: Testing + refinement

Deliverable: Manager sees real-time gate pass status + shortages + cash reconciliation
Time: 35 hours
Team: 1 backend + 1 frontend
```

---

### Phase 7: Bill Entry Form Enhancement (Week 5)
```
Day 1-2: Warehouse selection popup
Day 3: Customer history popup
Day 4: Sourcing history popup
Day 5: Testing

Deliverable: Complete bill entry form with all contextual info
Time: 40 hours
Team: 1 frontend + 1 backend
```

---

### Phase 8: Inline Editing (Week 6)
```
Day 1-3: Inline edit implementation
Day 4: Validation + error handling
Day 5: Concurrent edit detection + testing

Deliverable: Every field editable from all grids
Time: 50 hours
Team: 1 frontend
```

---

### Phase 9: Advanced UX (Weeks 7-8)
```
Week 7:
  - Command palette
  - Keyboard shortcuts
  - Record navigation + deep linking

Week 8:
  - User preferences
  - Grid features (column resize, reorder, etc.)
  - Export (Excel, CSV, PDF)

Time: 70 hours
Team: 1-2 frontend
```

---

### Phase 10: Mobile & Offline (Weeks 9-12)
```
Week 9-10: Offline-first sync + Tauri desktop
Week 11-12: Android app + Kotlin implementation

Time: 120+ hours
Team: 2-3 full-stack
Note: Can be parallelized or deferred
```

---

## 🎯 PRIORITIES FOR FIRST DEPLOYMENT

**If deploying to VPS TODAY, build this order:**

### Tier 1: Critical for Demo (Week 1-2)
1. ✅ Gate Pass system (without this, no working warehouse flow)
2. ✅ Inventory reservation (without this, inventory counts are wrong)
3. ✅ Warehouse fulfillment UI (staff need to pick items)

**Result: Warehouse staff can actually use the system**

---

### Tier 2: Manager Visibility (Week 3-4)
4. ✅ Manager dashboard (see what's happening)
5. ✅ Cash book reconciliation (audit trail)
6. ✅ Bill entry form with warehouse selection (operators can enter data correctly)

**Result: Manager has visibility + accounting is sound**

---

### Tier 3: Better UX (Week 5-8)
7. ✅ Inline editing (quick edits from any screen)
8. ✅ Command palette (find things faster)
9. ✅ Keyboard shortcuts (power users go faster)
10. ✅ Grid features (column sorting/hiding)
11. ✅ Export (managers can export reports)

**Result: System is pleasant to use**

---

### Tier 4: Mobile & Advanced (Weeks 9-12)
12. ✅ Offline-first sync (warehouse staff work offline)
13. ✅ Mobile app (Android tablet app for warehouse)
14. ✅ Multi-channel pricing (if website launching soon)

**Result: Full omnichannel + offline capability**

---

## 📊 EFFORT SUMMARY

| Phase | Item | Effort | Weeks |
|-------|------|--------|-------|
| 6A | Gate Pass + Fulfillment | 80h | 2 |
| 6B | Inventory + Cash Book | 50h | 1 |
| 6C | Manager Dashboard | 35h | 1 |
| 7 | Bill Entry Form | 40h | 1 |
| 8 | Inline Editing | 50h | 1 |
| 9 | Advanced UX | 70h | 2 |
| 10 | Mobile + Offline | 120h | 4 |
| **TOTAL** | | **445h** | **12 weeks** |

---

## 🚀 NEXT STEP

**Which should we start with?**

**Option A:** Build Tier 1 (Weeks 1-2) → Get warehouse working → Deploy to VPS  
**Option B:** Build everything Tier 1-3 (Weeks 1-8) → Full UX polish → Then deploy  
**Option C:** Tier 1 + 2 (Weeks 1-4) → Balanced for demo → Then add polish later  

---

**Last Updated:** July 5, 2026  
**Status:** Ready for implementation  
**Question:** Where should we start?
