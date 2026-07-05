# Ghazanfar ERP — Foundations & Universal Systems

**Project:** Custom ERP for Ghazanfar Brothers (replacing contractor-built MySQL system)
**Purpose of this file:** Defines the cross-cutting foundations that every module in the ERP will depend on. These must be built BEFORE feature modules (Sales, Purchases, Inventory, etc.) so we don't refactor endlessly later. Claude Code should reference this file as it builds each module and follow the patterns defined here.

---

## Guiding Principle

Every ERP screen — whether it's a purchase report, customer list, or inventory ledger — shares the same underlying needs: sorting, filtering, inline editing, keyboard navigation, clickable field-to-record links, next/prev record navigation, etc.

Instead of rebuilding these per-module, we build them ONCE as reusable primitives at the foundation level. Every business module then plugs into these primitives.

**Rule:** No feature module gets built until the foundation piece it needs is in place.

---

## Architecture Reminder

- **Backend:** NestJS + TypeScript + Prisma + PostgreSQL
- **Web dashboard:** React
- **Windows desktop:** Tauri with offline-first SQLite
- **Android:** Kotlin/Jetpack Compose
- **Sync:** Outbox pattern between clients and central PostgreSQL
- **VPS:** Hostinger KVM 2 (Ubuntu 24.04 LTS) — production deployment target
- **Local dev:** PostgreSQL on Windows dev machine, deploy to VPS later

---

## Foundation 1 — Universal Data Grid / Table

Every screen shows tabular data. Build ONE powerful reusable table component for the React dashboard (and a mirrored abstraction for the Tauri desktop and Android apps). Every feature module plugs into this — never build custom tables per module.

**Required capabilities:**
- Sorting — click column header (asc/desc), multi-column via Shift+click
- Per-column filtering — text, number range, date range, dropdown for enums, boolean
- Global search box — scans all visible columns
- Column resize, reorder, show/hide — saved per user per report
- Pagination + virtual scrolling for 100k+ rows
- Row selection — single, multi (Shift/Ctrl), select-all
- Bulk actions bar — appears when rows are selected
- Inline cell editing — double-click to edit in place
- Clickable link cells — bill number → bill, vendor name → vendor profile, generic "link column" concept
- Row expansion — chevron opens child rows (bill → line items)
- Frozen columns + header — first N columns and headers stay while scrolling
- Sticky summary row — sum, avg, count at bottom
- Export — Excel, CSV, PDF, print from any grid
- Density toggle — compact / normal / comfortable
- Loading skeleton + empty state — consistent across every grid

---

## Foundation 2 — Record Navigation (Next Bill / Previous Bill / Deep Linking)

**Critical:** "Next" and "Previous" must mean "next in the current filtered/sorted context" — not next by ID. This means we track a record context stack.

**Required capabilities:**
- Record context stack — remember the report's filter/sort when opening a record from it
- Keyboard shortcuts: `Ctrl+→` next, `Ctrl+←` previous, `Esc` back to list, `Ctrl+S` save
- Breadcrumbs — Customers > Ali Traders > Invoice INV-2431 > Line 3
- Back-preserves-state — returning to the report keeps scroll, filters, sort, selection
- Deep linking — every record has a URL (`/purchases/bill/1234`) that opens it directly

---

## Foundation 3 — Inline Editing Pattern

Two patterns, used consistently across the app:

- **Pattern A (grid inline edit):** double-click any cell → editable → auto-saves on blur/Enter → undo toast. Used in reports and list grids.
- **Pattern B (form-based edit):** click "Edit" → whole record editable → Save/Cancel buttons. Used in full record forms (bill entry, customer creation).

**Required capabilities:**
- Optimistic UI — change appears instantly, rolls back on server rejection
- Server-side validation on every field change (not only on final save)
- Concurrent edit detection — "Ali has also edited this record" via version numbers/ETags
- Field-level permissions — some users can edit price, others can't (RBAC per field)
- Audit trail — every change logged: who, what, when, old value, new value

---

## Foundation 4 — Global Keyboard Shortcuts

Central shortcut registry. Every module registers into it — no hardcoded shortcuts inside individual screens.

**Standard shortcuts:**
- `Ctrl+N` — new record (context-aware)
- `Ctrl+S` — save
- `Ctrl+F` — search current screen
- `Ctrl+K` — global command palette
- `Ctrl+P` — print current view
- `Ctrl+→ / ←` — next/prev record
- `Ctrl+D` — duplicate current record
- `F2` — edit field, `Esc` cancel, `Enter` save
- `Alt+1..9` — jump between recent records
- `?` — show all shortcuts overlay

---

## Foundation 5 — User Preferences & Personalization

Saved server-side per user, follow them across devices.

**Stored preferences:**
- Column visibility, order, width
- Default filters per screen (e.g. Ali always sees "unpaid bills" first)
- Sort preferences
- Density, theme, language (English / Urdu)
- Recently viewed records
- Pinned/favorite records and reports
- Layout choices (sidebar collapsed, etc.)

---

## Foundation 6 — Roles, Permissions, Multi-User (RBAC)

Bake in from day one. Never bolt on later.

**Roles (starter set):** Admin, Manager, Salesman, Accountant, Warehouse, Viewer.

**Permission layers:**
- Per-module — view, create, edit, delete, approve, export
- Per-field — hide cost price from salesmen, show only to managers
- Per-record — salesman only sees his own customers/orders
- Approval workflows — bills over Rs. X need manager approval before posting
- Full audit log for every action
- Session management — force logout, active session list per user, IP tracking

---

## Foundation 7 — Universal Search / Command Palette (Ctrl+K)

Single global shortcut. Searches across:
- All entities — customers, vendors, products, bills, invoices
- All screens — "go to purchase report"
- Actions — "mark bill 1234 as paid"
- Recent + pinned items

Built in the app shell, not per-module.

---

## Foundation 8 — Offline-First Sync (Outbox Pattern)

Already in the plan. Build these UI/UX primitives around it from the start:

- Sync status indicator — green (synced), yellow (pending), red (conflict)
- Conflict resolution UI — clear "yours vs server's" comparison, user chooses
- Queue viewer — user can see pending operations
- Retry with exponential backoff
- "Last synced" timestamp visible everywhere relevant
- Optimistic writes with rollback on sync failure
- Idempotency keys on every mutation (retries don't create duplicates)

---

## Foundation 9 — Document Numbering & Sequences

Every ERP document has a number (INV-2025-001, BILL-2025-000123). Get this right early.

- Central sequence service — one place generates all doc numbers
- Series per year/month/branch if needed (INV-25-001, INV-26-001)
- Prefix, padding, format configurable per document type
- Reservation vs. commit for offline mode — client reserves a range, uses offline, syncs later
- Duplicate detection on sync

---

## Foundation 10 — Money, Currency, Tax, Units

Not adding these primitives now costs 10x to retrofit later — even if we only use PKR today.

- Store money as INTEGER MINOR UNITS (paisa, not rupees). NEVER use float for money.
- Currency field on every monetary column (default PKR, but structurally supported)
- Tax as a related entity — sales tax, income tax, further tax — not hardcoded percentages
- Unit conversions — piece, dozen, carton, box — each product knows its conversion factors
- Rounding rules configurable — banker's rounding vs. standard, applied at line vs. total

---

## Foundation 11 — Polymorphic Attachments & Comments

Every entity (customer, bill, product, PO) supports:
- File attachments (invoice scans, product photos, warranty cards)
- Free-text notes and comments
- Activity/timeline log
- Tags/labels

Build ONE polymorphic attachments + comments system. Plug into every module.

---

## Foundation 12 — Report Builder Framework

Every report = a config (columns, filters, sort, group by, aggregations), not custom code.

- Saved views / saved reports per user
- Schedule + email reports (daily sales summary to owner at 9pm)
- Drill-down — click any total/subtotal to see underlying rows. This is what enables the "click any field → open record" pattern uniformly across every report.
- Comparison views — this month vs last vs same month last year
- Charts alongside tables — same data, toggle view

---

## Foundation 13 — Import / Export Framework

- CSV/Excel import wizard on every entity — column mapping, validation preview, dry-run before commit, error report with row numbers
- Export from any grid → CSV, Excel, PDF, print
- Backup/restore for the whole database — user-triggered + scheduled
- API for every entity — consistent CRUD (already the NestJS pattern)

---

## Foundation 14 — Notification System

- In-app notifications — bell icon with unread count
- Toast messages — success/error/warning/info, consistent styling
- Email + WhatsApp + SMS integration — pluggable providers
- Per-user preferences — what events, which channel
- Digest mode — batch instead of one-by-one

---

## Foundation 15 — Localization, RTL, Formatting

- Every user-facing string in translation files — NEVER hardcode English/Urdu in components
- Locale-aware number, date, currency formatting (1,00,000 Indian/Pakistani vs 100,000)
- Full RTL support for Urdu — use CSS logical properties (start/end, not left/right), test both directions from day one
- Store all timestamps in UTC, display in user's timezone

---

## Foundation 16 — Form & Modal System

Every "new customer" / "new bill" / edit screen uses the same primitives.

- Field library — TextField, NumberField, DateField, DropdownField, CustomerPicker, ProductPicker — all consistent
- Autocomplete/typeahead on every FK field (customer picker searches by name, phone, code)
- "Add new inline" — creating a bill, customer doesn't exist? "+ Add new customer" without leaving the bill form
- Standard validation error display
- Auto-save drafts — half-finished bill isn't lost on power cut / crash

---

## Foundation 17 — Error Handling & Logging

- Central error boundary — never a white screen
- Structured server-side logging (Winston or Pino) with correlation IDs
- Client-side error reporting (Sentry or self-hosted GlitchTip)
- User-friendly error messages in English + Urdu — never raw SQL / stack traces
- Retry with feedback — "Server unreachable, retrying in 5s..."

---

## Foundation 18 — Performance Primitives

- Debounce every search/filter input (300ms)
- Server-side pagination on every list endpoint — NEVER `SELECT *`
- Database indexes on every filterable column — nail this in initial Prisma schema
- Cursor-based pagination for large datasets, not offset
- Cache invalidation strategy — Redis or in-memory, defined per entity

---

## Foundation 19 — Testing & Seed Data

- Seed data script — every new dev/staging env gets 100 customers, 500 products, 2000 bills of realistic test data
- Factory functions — `createCustomer(overrides)`, `createBill()` — reusable across tests
- E2E test scaffolding with Playwright from day one
- Migration testing — every migration tested against realistic data before merging

---

## Foundation 20 — Security Primitives

- Rate limiting on every endpoint (NestJS Throttler)
- Input sanitization at API boundary
- SQL injection protection — Prisma handles by default, audit any raw queries
- 2FA for admin users
- Password policy enforcement
- API keys/tokens for external integrations (Android apps, WooCommerce sync)
- CORS locked down to known domains only

---

## Build Order (Priority) — Warehouse-Centric Model

Your real workflow is: **cash book → bill entry → gate pass per warehouse → warehouse fulfillment → inventory update**.

Build in this order:

**Phase 1 — Core Foundations (Prerequisites):**
1. Auth + RBAC — data entry, warehouse, manager roles
2. Customer master — name, phone, address, credit limit
3. Product master — code, name, price, stock per warehouse
4. Warehouse master — location, assigned staff

**Phase 2 — Billing & Gate Pass (CORE BUSINESS LOGIC):**
5. Bill entry form (operator enters cash book)
6. Bill model + API (`POST /bills`, `GET /bills`, `PUT /bills/:id`)
7. Automatic gate pass generation per warehouse
8. Gate pass model + API
9. Gate pass printing UI + warehouse display
10. Inventory reservation (reserve when bill created)

**Phase 3 — Warehouse Fulfillment:**
11. Gate pass fulfillment workflow (warehouse staff pick, mark picked, confirm)
12. Shortage handling (partial fulfillment, alert manager)
13. Inventory confirmation (decrement when gate pass confirmed, not when bill created)
14. Warehouse staff mobile/tablet app (see gate passes, confirm picks, offline-sync)

**Phase 4 — Shop Management:**
15. Daily manager dashboard (bills, pending gate passes, shortages, cash reconciliation)
16. Audit log with full gate pass tracking
17. Cash book reconciliation report
18. Customer credit tracking + statements
19. Warehouse stock reports per location

**Phase 5 — Advanced Features (Only after Phase 1–4 rock-solid):**
20. Website order integration (rare; uses same bill/gate pass flow)
21. Purchase orders (buying from vendors)
22. Inventory transfers between warehouses
23. Stock returns & damage handling
24. Customer credit approval workflows
25. Multi-user concurrent edit handling
26. Report builder for accountant
27. Stock aging & obsolescence tracking
28. Vendor management
29. Payment tracking (who paid what)
30. Seasonal pricing & discounts

Don't skip phases. Phase 2 (bill → gate pass) is your foundation. Phase 3 (warehouse fulfillment) is your competitive advantage. Everything else builds on these.

---

## The "Kitchen Sink" Screen — Your First Real Deliverable

Don't build a generic kitchen sink. Build a **bill entry + gate pass demo** that exercises your actual workflow:

### Demo 1: Bill Entry (Data Entry Operator)
1. Open "New Bill" form
2. Enter customer (search by name)
3. Add 3 items from different warehouses:
   - Item A from Warehouse 1
   - Item B from Warehouse 2
   - Item C from Warehouse 1
4. Set payment method (cash)
5. Apply discount
6. **Submit** → system generates:
   - Invoice for customer
   - Gate Pass 1 (Warehouse 1: Item A, Item C)
   - Gate Pass 2 (Warehouse 2: Item B)

### Demo 2: Warehouse Fulfillment (Warehouse Staff on Mobile)
1. Warehouse 1 staff opens mobile app
2. Sees pending gate pass 1
3. Opens it, sees: Item A (qty 10), Item C (qty 5)
4. Picks items, marks "picked"
5. Reports shortage: only 9 units of Item A available
6. Confirms gate pass (9 picked, 5 picked, 1 short on Item A)
7. Gate pass marked "fulfilled with shortage"

### Demo 3: Bill Status (Data Entry Operator sees result)
1. Operator opens bill 1001
2. Sees status: "Partially fulfilled" (shortage in Item A)
3. Manager notified: approve partial shipment or wait for restock?
4. Warehouse 1 inventory decremented by (9 + 5), not (10 + 5)

### Demo 4: Daily Dashboard (Manager)
1. Manager opens dashboard
2. Sees:
   - Bills created today: 15, total Rs. 85,000
   - Gate passes pending: 3
   - Shortages: Item A (1 unit short), Item D (5 units short)
   - Cash book total: Rs. 85,000 → ERP total: Rs. 85,000 ✓ (match)

Once this workflow feels solid, all other modules (purchases, inventory transfers, vendor management) follow the same pattern: **form entry → auto-doc generation → multi-location fulfillment → status tracking**.

---

## Foundation 21 — Warehouse-Centric Architecture (Your Physical Shop Model)

Your ERP is NOT e-commerce-first. It's **warehouse-first, shop-counter-second, website-minimal**.

Here's your real flow:

1. **Physical Shop Counter** — customer buys items, cashier writes bill in cash book
2. **Data Entry** — operator enters bill into ERP system (creating an Order/Invoice)
3. **Warehouse Selection** — bill line items include "which warehouse to pull from" (e.g., Warehouse A for phones, Warehouse B for chargers)
4. **Gate Pass Generation** — system auto-generates separate gate pass per warehouse (Warehouse A → Gate Pass A, Warehouse B → Gate Pass B)
5. **Warehouse Fulfillment** — warehouse staff picks items per gate pass, updates inventory, confirms dispatch
6. **Website Orders** (rare) — treated as just another order type, same gate pass logic applies

### 21A — Multi-Location Inventory Model

Products exist in multiple warehouses. When bill is created:
- Item 1 (phone) → pull from Warehouse A
- Item 2 (charger) → pull from Warehouse B
- Each warehouse gets its own gate pass to pick and confirm

**Required capabilities:**
- Products have stock levels per warehouse (not one global stock)
- When bill is created, user CHOOSES which warehouse per line item
- Inventory is reserved (not decremented) until gate pass is confirmed
- Gate pass shows: what to pick, from which warehouse, for which bill
- Warehouse staff marks items "picked" on their gate pass
- Once all warehouses confirm, bill is "fulfilled"
- Reconciliation: actual picked quantity vs. bill quantity (sometimes there's shortage)

### 21B — Gate Pass System (Core to Your Operations)

Gate pass is a **warehouse dispatch document**, not a business-to-customer invoice.

**Gate pass contains:**
- Bill number and customer name
- List of items (code, name, qty ordered)
- Warehouse name
- Pick-by date/time
- Confirmation checkbox (warehouse manager signs off when picked and handed to delivery/customer)

**Multi-warehouse bills generate multiple gate passes:**
- Bill 1001: Item A (WH-A), Item B (WH-B), Item C (WH-A)
- → Gate Pass 1001-A (Warehouse A): Item A qty X, Item C qty Y
- → Gate Pass 1001-B (Warehouse B): Item B qty Z

**Gate passes print separately**, warehouse staff collects items per their gate pass, confirms pickup, bill moves to "fulfilled" state.

### 21C — Cash Book Integration

Data entry operator enters the physical cash book into ERP. The bill must include:
- Customer name, contact
- Items (product code, qty, unit price)
- **Warehouse selection per item** (dropdown: Warehouse A / B / C)
- Payment method (cash / credit / card)
- Discount (if any)
- Total amount

Once entered, system generates:
- Invoice (for customer, sent via WhatsApp/print)
- Gate passes (one per warehouse, sent to warehouse staff)

### 21D — Warehouse Fulfillment Workflow

After bill is entered, warehouse staff see their gate passes:

1. **Gate Pass List** — show all pending gate passes for this warehouse
2. **Pick** — warehouse staff opens gate pass, picks items, marks "picked"
3. **Shortage Handling** — if item not available, mark as "shortage qty X"
4. **Confirm Dispatch** — warehouse manager confirms "all items picked and handed to customer/delivery"
5. **Inventory Update** — only when gate pass is confirmed does inventory decrease
6. **Bill Status** — bill shows "partially fulfilled" (if shortages) or "fulfilled" (all warehouses confirmed)

### 21E — Website Orders (Minimal, Same Flow)

Website orders are rare but follow the same gate pass logic:
1. Customer orders on website
2. ERP auto-creates an Order with default warehouse (or user assigns)
3. Gate pass generated for that warehouse
4. Warehouse picks and confirms
5. Order marked fulfilled, customer notified via email/WhatsApp

---

## Foundation 22 — API Design (REST, Warehouse & Bill Focused)

Core API endpoints for your workflow:

```
POST   /api/v1/bills                    — create bill (from cash book entry or website)
GET    /api/v1/bills/:id                — view bill detail
PUT    /api/v1/bills/:id                — update bill (before warehouse confirms)
GET    /api/v1/bills                    — list bills (filterable by date, customer, status)

GET    /api/v1/bills/:billId/gatepass   — get all gate passes for a bill
GET    /api/v1/bills/:billId/gatepass/:warehouseId  — get gate pass for specific warehouse

POST   /api/v1/gatepass/:id/confirm     — warehouse confirms gate pass (items picked)
POST   /api/v1/gatepass/:id/shortage    — report shortage on an item

GET    /api/v1/inventory/warehouse/:warehouseId  — stock levels for a warehouse
GET    /api/v1/products/:productId/stock  — stock across all warehouses
```

No bulk edit, no complex batch operations — simple, focused REST endpoints.

---

## Foundation 23 — Notification System (Shop & Warehouse Focused)

Notifications for your actual workflow:

- **Cashier/Data Entry:** "Bill 1001 entered, gate passes generated"
- **Warehouse A:** "Gate pass 1001-A: pick 10 phones + 20 chargers" (via notification + gate pass printout)
- **Warehouse B:** "Gate pass 1001-B: pick 5 cables" (via notification + gate pass printout)
- **Manager:** "Bill 1001 partially fulfilled (shortage in phones)" (needs manual approval to continue)
- **Customer:** "Order INV-2025-0001 ready for pickup" (WhatsApp)

**Channels:**
- In-app notifications (warehouse staff see pending gate passes)
- WhatsApp for customers (order ready, shipment updates)
- SMS for urgent shortages (warehouse reports stock issue)
- Email for summaries (daily fulfillment report)

---

## Foundation 24 — Physical Workflow Offline Support

Your Windows desktop (Tauri) is used by:
- **Data entry operator** (enters bills from cash book) — may lose connection briefly
- **Warehouse staff** (tracks gate passes) — may work in areas with poor connectivity

**Requirements:**
- Data entry offline: operator can write bills offline, sync when online
- Gate pass offline: warehouse can mark "picked" offline, sync when online
- Queue viewer: data entry operator sees pending bills to sync, warehouse sees pending confirmations to sync
- Conflict resolution: if operator modifies a bill AFTER warehouse started picking, clear warning

---

## Foundation 25 — Gate Pass Printing & Warehouse Display

Gate pass must be:
- Printable (A4 paper, thermal printer friendly)
- Displayable on warehouse display screen (warehouse manager pins to board)
- Mobile-viewable (warehouse staff see it on tablet or phone)

**Print layout:**
```
═══════════════════════════════════
        GATE PASS
Bill: 1001    Date: 2025-07-03
Customer: Ali Traders
Warehouse: Main Warehouse (WH-A)
───────────────────────────────────
Item Code    Description    Qty    Remarks
---
P001         Phone          10
C002         Charger        20
───────────────────────────────────
Pick by: 2025-07-03 3:00 PM
Confirmed by (signature): _________
═══════════════════════════════════
```

---

## Foundation 26 — Inventory Locking & Shortage Handling

When a bill is created with items from multiple warehouses:

1. **Reserve inventory** — items marked as "reserved for bill 1001" (not yet decremented)
2. **Generate gate passes** — one per warehouse
3. **Warehouse picks** — items physically removed
4. **Confirm on gate pass** — inventory finally decremented
5. **Shortage** — if warehouse can only pick 8 phones (bill says 10):
   - Gate pass shows "qty 10, picked 8, shortage 2"
   - Inventory decrements by 8, not 10
   - Bill status: "partially fulfilled"
   - Manager notified: approve this partial fulfillment or wait for restock?

---

## Foundation 27 — Cash Book Audit & Reconciliation

Your ERP must match the physical cash book:

- Every bill in ERP must have a cash book entry number
- Reconciliation report: cash book total = ERP bill total
- Missing entries flag: bill 1005 entered but 1004 missing
- Discrepancies: bill says Rs. 5000 in cash book but ERP says Rs. 4800 — raise alert

This is essential for accountants and auditors.

---

## Website as Secondary Channel (Low Priority)

Website orders follow the same bill → gate pass → fulfillment flow, but:
- Website orders are rare (you said so)
- Treat them like a separate "website customer" (one virtual customer per website)
- Assign default warehouse OR let system route based on inventory levels
- Same gate pass system, same fulfillment workflow

**Don't** build website-specific features. Everything website needs already exists in the core ERP.

---

## Foundation 28 — Bill Entry Form (Data Entry Operator Interface)

This is the primary UI for your data entry operator. It's used to convert physical cash book entries into ERP bills.

**Bill entry form fields:**
- Customer name (autocomplete from customers list)
- Customer contact (phone, email)
- Items section:
  - Product code (barcode scanner or dropdown)
  - Product name (auto-populated)
  - Unit price (auto-populated from product master, editable)
  - Quantity (editable)
  - **Warehouse** (dropdown: choose which warehouse to pull from) ← KEY FOR YOUR WORKFLOW
  - Line total (auto-calculated)
- Payment method (cash / credit / check / card)
- Discount (flat amount or percentage)
- Bill total
- Remarks
- Submit button

**Important behaviors:**
- Operator can add multiple items from different warehouses in one bill
- When item added: "Item X from Warehouse Y" is the unit
- Form calculates totals
- Before submit: show preview of all gate passes that will be generated
- On submit: bill created, gate passes auto-generated and queued for warehouse staff

---

## Foundation 29 — Mobile & Tablet Support (Warehouse Staff)

Warehouse staff use mobile/tablet to see and fulfill gate passes:

**Warehouse staff app contains:**
- **Login** — use warehouse ID + biometric
- **Pending Gate Passes** — list of gate passes assigned to this warehouse
- **Gate Pass Detail** — tap a gate pass to see:
  - Items to pick
  - Quantities
  - Remarks from bill
  - Customer name (for reference)
- **Pick Confirmation** — staff picks items and marks "picked"
- **Shortage Reporting** — if not enough stock, tap "shortage", enter actual qty picked
- **Photo Capture** — option to photo items picked (for audit)
- **Sync Status** — show pending confirmations, manual retry if needed
- **Offline Mode** — staff can mark items "picked" offline, syncs when online

---

## Foundation 30 — Daily Reports for Shop Manager

Manager needs visibility into:

1. **Bills Created Today** — how many, total amount, by customer
2. **Gate Passes Pending** — which warehouses have backlog
3. **Shortages** — which items in short supply today
4. **Cash Reconciliation** — cash book vs ERP bills match?
5. **Warehouse Status** — per warehouse: items picked, items pending, shortages
6. **Customer Credit** — which customers owe money (if you do credit sales)

---

## Updated Build Order for Your Actual Workflow

**Phase 1 — Core ERP Foundations:**
1. Auth + RBAC (already started) — data entry operator, warehouse staff, manager roles
2. Customer master (search, create, address, credit limit)
3. Product master (code, name, unit price, warehouse stock levels)
4. Warehouse master (warehouse names, locations, staff assignments)

**Phase 2 — Billing & Gate Pass (CRITICAL NEXT STEP):**
5. Bill entry form (operator enters cash book into ERP)
6. Automatic gate pass generation (one per warehouse, per bill)
7. Gate pass printing + display UI
8. Warehouse fulfillment workflow (staff pick, confirm, shortage handling)
9. Inventory reservation → confirmation (reserve when bill created, decrement when gate pass confirmed)

**Phase 3 — Warehouse Apps:**
10. Android/Tablet app for warehouse staff (see pending gate passes, confirm picks)
11. Offline sync for warehouse staff (can work without connectivity)

**Phase 4 — Reporting & Accounting:**
12. Daily manager dashboard (bills, gate passes, shortages, cash reconciliation)
13. Audit log with gate pass tracking
14. Customer statements (who owes what)
15. Warehouse stock reports

**Phase 5 — Advanced Features (after above works solid):**
16. Website order integration (rare, uses same bill/gate pass flow)
17. Purchase order system (buying from vendors)
18. Inventory transfers (between warehouses)
19. Stock returns/damage handling
20. Multi-user concurrent edit handling (two operators editing same bill)
21. Report builder (custom queries for accountant)
22. Cash book reconciliation automation
23. Customer credit management (credit limits, aging reports)

**DON'T build yet:** complex multi-channel sync, real-time dashboards, advanced reporting. Focus on getting bills → gate passes → warehouse fulfillment rock-solid first.

---

## Foundation 31 — Multi-Channel Product & Pricing Strategy

Your ERP serves **multiple sales channels** with **different pricing per channel and customer type**. This must be architected correctly from the start.

### 31A — Product Visibility Across Channels

Products exist in ERP. Which channels can they be sold through?

- **Physical Counter** — in-store sales (operator enters bill manually)
- **Wholesale** — bulk orders (may come via website or direct order)
- **Retail** — regular retail customers (may come via website or in-store)
- **Website** — online orders (e-commerce)

Each product has visibility flags:
```prisma
Product {
  id, code, name, description
  is_visible_on_website Boolean @default(false)
  is_visible_on_counter Boolean @default(true)
  is_visible_wholesale Boolean @default(false)
  is_visible_retail Boolean @default(true)
  // ... other fields
}
```

**Bidirectional Sync:**
- **ERP → Website:** Product created in ERP with `is_visible_on_website = true` → automatically syncs to website
- **Website → ERP:** Product created on website → automatically syncs to ERP with `is_visible_on_website = true`, visibility flags configurable
- Inventory link: stock in ERP decrements when website order created; website shows real-time stock from ERP

### 31B — Multi-Channel Pricing

Same product, different prices for different channels & customer types.

```prisma
ProductPrice {
  id
  product_id
  channel (COUNTER, WHOLESALE, RETAIL, WEBSITE)
  customer_type (INDIVIDUAL, WHOLESALE, CORPORATE, SPECIAL)
  price Int // stored as paisa
  min_quantity Int (e.g., "min 100 units for this price")
  max_quantity Int (optional ceiling)
  effective_from DateTime
  effective_to DateTime (null = no end date)
  is_active Boolean
}
```

**Example:**
```
Product: Phone XYZ
├─ Counter: Rs. 500/unit (retail customer walks in)
├─ Retail (website): Rs. 480/unit (online retail)
├─ Wholesale < 100 units: Rs. 450/unit
├─ Wholesale >= 100 units: Rs. 420/unit
├─ Corporate: Rs. 400/unit + special terms
```

When entering a bill:
- System knows channel (counter = physical, website = web order)
- System knows customer type (retail, wholesale, corporate)
- System looks up: `ProductPrice where product = X AND channel = Y AND customer_type = Z AND min_qty <= ordered_qty`
- Applies correct price automatically

### 31C — Website-to-ERP Bidirectional Sync

**Website Order → ERP Bill (Automated)**
```
Customer places order on website
  → ERP auto-creates Bill with:
     - customer info
     - items + quantities
     - channel = WEBSITE
     - payment method = online
     - status = "pending_fulfillment"
  → System generates Gate Pass(es) per warehouse
  → Warehouse staff picks and confirms (same flow as in-store orders)
  → Inventory decremented when gate pass confirmed
  → Website notified "order ready for pickup" or shipped
```

**ERP Bill → Website Inventory Sync (Automated)**
```
Warehouse confirms gate pass for product X
  → Inventory in ERP decremented by qty
  → Website inventory IMMEDIATELY updated (no delay)
  → If stock < threshold, website shows "low stock" or "coming soon"
```

### 31D — Pricing Rules Engine

Different rules for different scenarios:

```prisma
PricingRule {
  id, name, is_active
  conditions[] {
    condition_type (CHANNEL, CUSTOMER_TYPE, ORDER_QTY, CUSTOMER_ID, PRODUCT_CATEGORY)
    operator (EQUALS, GREATER_THAN, LESS_THAN, IN)
    value
  }
  action {
    type (FIXED_PRICE, DISCOUNT_PERCENT, DISCOUNT_AMOUNT)
    value
  }
  priority Int (higher = applied first)
}
```

**Examples:**
```
Rule 1: "Wholesale customers who order >= 100 units get 20% discount"
  Condition: customer_type = WHOLESALE AND order_qty >= 100
  Action: discount_percent = 20

Rule 2: "VIP customers always get 15% off"
  Condition: customer_id IN (vip_customer_list)
  Action: discount_percent = 15

Rule 3: "Website orders get 5% markup"
  Condition: channel = WEBSITE
  Action: markup = 5%

Rule 4: "End-of-season clearance: all electronics 50% off"
  Condition: product_category = ELECTRONICS AND date >= 2025-06-01
  Action: discount_percent = 50
```

When calculating bill line price:
1. Get base price from `ProductPrice` table
2. Apply all matching `PricingRule`s in priority order
3. Calculate final price with taxes
4. Show: original price, discount, final price

### 31E — Website Inventory Management

Website should show **real-time inventory** from ERP:

```
Website Query: "How many units of Product X in stock?"
→ Backend: SELECT SUM(qty) FROM inventory WHERE product_id = X AND status = AVAILABLE
→ Returns: 45 units available
→ Website displays: "In stock - only 45 left!" or "Low stock"
```

When customer buys on website:
1. Website reserves qty from ERP inventory (not yet decremented)
2. ERP auto-creates Bill + Gate Pass
3. Warehouse picks and confirms
4. Inventory officially decremented
5. If warehouse can't pick full qty (shortage): Website notified, customer offered partial/backorder

### 31F — Customer Type Hierarchy

Your customer types:

```prisma
enum CustomerType {
  INDIVIDUAL        // walks into shop, one-time purchases
  RETAIL            // small shops, regular customers
  WHOLESALE         // bulk orders, business customers
  CORPORATE         // large companies with terms
  VIP               // special pricing, priority service
}

Customer {
  id, name, phone, address
  customer_type CustomerType
  credit_limit Int
  
  // Website-specific
  website_account_id String? (links to website user account)
  is_website_active Boolean
  
  // Pricing
  custom_prices[]? (override ProductPrice for this specific customer)
}
```

**Example Flow:**
- Ali walks into counter → INDIVIDUAL → gets COUNTER prices
- Retailer shops on website → RETAIL → gets RETAIL/WEBSITE prices
- Distributor orders in bulk → WHOLESALE → gets tiered wholesale prices
- Corporate client → CORPORATE → gets custom contract pricing

### 31G — Order Origin Tracking

Every order/bill tracks where it came from:

```prisma
Bill {
  id, bill_number, bill_date
  customer_id
  channel (COUNTER, WEBSITE, PHONE, BULK)
  created_by (for counter: operator; for website: null/system)
  order_source_id String? (links back to website order ID for traceability)
  // ... other fields
}
```

Manager dashboard should show:
- Today's bills by channel: 50 counter, 15 website, 3 phone, 2 bulk
- Revenue by channel: counter Rs. X, website Rs. Y, bulk Rs. Z

### 31H — Website Settings & Controls

Admin dashboard for website:
- Enable/disable channel (temporarily pause website orders)
- Pricing override (special website-only pricing)
- Inventory threshold (show "out of stock" on website if ERP < X units)
- Fulfill from which warehouse(s) (config per product)
- Shipping methods (self-pickup, delivery, etc.)
- Auto-sync toggle (real-time vs. batch sync every 15 min)

---

## Updated Build Order with Multi-Channel

This changes your build order slightly:

**Phase 1 — Core Foundations:**
1. Auth + RBAC
2. Customer master — **add customer_type, website_account_id fields**
3. Product master — **add is_visible_on_* and pricing tables**
4. Warehouse master
5. **Pricing Rules Engine** (before billing)

**Phase 2 — Billing & Gate Pass:**
6. Bill entry form (applies pricing rules automatically)
7. Gate pass generation (per warehouse)
8. Gate pass fulfillment

**Phase 3 — Website Integration (CRITICAL):**
9. **Product Visibility Sync** (ERP ↔ Website)
10. **Inventory Real-Time Sync** (ERP → Website live)
11. **Website Order → ERP Bill** (auto-convert orders to bills)
12. **Pricing Sync** (ProductPrice table → website)

**Phase 4 — Warehouse Apps:**
13. Warehouse staff app (same gate pass logic, no changes)

**Phase 5 — Reporting:**
14. Daily dashboard (add channel breakdown)
15. Sales by channel report
16. Pricing effectiveness report (which rules are used most)

---

## For Website Product Entry → ERP Sync

**Scenario:** Team member creates product on website (e.g., new phone model arrives).

**Current problem:** Manual data entry in both places.

**Solution:**
```
Website: "Create New Product"
→ Form filled: name, description, category, cost, wholesale_price, retail_price
→ Submit
→ API POST /api/v1/sync/products/from_website
  {
    "name": "Phone Model XYZ",
    "category": "Electronics",
    "cost_price": 400,
    "website_retail_price": 500,
    "is_visible_on_website": true
  }
→ ERP automatically creates:
   - Product record
   - ProductPrice entry for RETAIL/WEBSITE channel
   - Inventory record (qty = 0, needs warehouse to add stock)
   - Notification: "New product synced from website, add opening stock"
→ Warehouse manager: "Add 50 units to WH-A, 30 units to WH-B"
→ Inventory populated
→ Website immediately shows stock
```

---

## 31I — Website Approval Workflow (YOUR REQUIREMENT)

Website orders do NOT auto-create bills. Manager approval required.

**Flow:**
```
Customer places order on website
  → Order status = PENDING_APPROVAL
  → Website shows: "Your order is being processed"
  → Manager dashboard: shows pending website orders
  → Manager reviews:
      - Customer
      - Items + quantities
      - Warehouse fulfillment plan (customer selected warehouse or manager selects)
      - Pricing
  → Manager action: APPROVE or REJECT
    - APPROVE: Auto-creates Bill in ERP, generates Gate Pass(es), warehouse fulfillment begins
    - REJECT: Notify customer "order rejected", don't create bill
```

Website inventory display:
- **NO quantity shown** — customers see "In Stock" or "Out of Stock" only
- Prevents: customers ordering based on stale quantity data
- Actual quantity only visible after manager approval + bill created

---

## 31J — Product Warehouse Selection in Invoice Bill Entry

**Data Entry Operator Experience:**

When operator enters invoice/bill and adds a product:

### Step 1: Product Selection
```
Operator: clicks "Add Product" or searches in dropdown
→ Selects: "Phone XYZ" from dropdown
→ System opens POPUP A: "Warehouse & Stock Availability"
```

### Popup A: Warehouse Stock & Selection
```
┌─────────────────────────────────────────┐
│  Product: Phone XYZ                     │
│  Current Stock by Warehouse:            │
│  ─────────────────────────────────────  │
│  □ Warehouse A (WH-A): 45 units        │
│  □ Warehouse B (WH-B): 12 units        │
│  □ Warehouse C (WH-C): 0 units (grayed)│
│                                         │
│  Select warehouse: [dropdown ▼]         │
│  (or click checkbox above)              │
│                                         │
│  Quantity: [________]                  │
│                                         │
│  [CONFIRM] [CANCEL]                    │
└─────────────────────────────────────────┘
```

**Operator can:**
- Click checkbox on warehouse row (auto-selects that warehouse)
- OR use "Select warehouse" dropdown
- Enter quantity
- Click CONFIRM

**On CONFIRM:**
- Product + warehouse + quantity added to bill
- Bill shows: "Phone XYZ, WH-A, qty 45"
- Operator can add same product from different warehouse in same bill

---

## 31K — Customer Sale History Popup (Context for Operator)

**Step 2: Customer Selection**

When operator selects customer for the bill:

```
Operator: selects "Ali Trades" from customer dropdown
→ System opens POPUP B: "Customer Sale History"
```

### Popup B: Last 10 Transactions with This Customer
```
┌─────────────────────────────────────────────────────────────┐
│  Customer: Ali Trades                                       │
│  Last 10 Sales Transactions:                                │
│  ─────────────────────────────────────────────────────────  │
│  Date         | Items Purchased      | Qty  | Amount | Bill │
│  ─────────────────────────────────────────────────────────  │
│  2025-03-15   | Phone XYZ            | 50   | 25,000 | 1001 │
│  2025-03-10   | Charger USB-C        | 100  | 5,000  | 999  │
│  2025-03-05   | Phone XYZ, Charger   | 30   | 15,500 | 998  │
│  2025-02-28   | Cable HDMI           | 200  | 4,000  | 987  │
│  2025-02-20   | Phone XYZ            | 25   | 12,500 | 985  │
│  ...                                                        │
│  (scroll to see more)                                       │
│                                         [CLOSE]             │
└─────────────────────────────────────────────────────────────┘
```

**Shows:**
- Date of last sale
- Products customer bought last time
- Quantities
- Total amount
- Bill number (clickable → open bill detail)

**Why:** Operator instantly knows:
- What does this customer usually buy?
- When did they last order?
- How much do they typically spend?
- Helps with cross-selling (if they bought phones, remind about chargers)

---

## 31L — Product Purchase History Popup (Sourcing Info)

**Step 3: While entering product details**

Operator might want to know: where does this product come from?

### Popup C: Last 5 Purchases from Vendors
```
┌─────────────────────────────────────────────────────────┐
│  Product: Phone XYZ                                     │
│  Last 5 Vendor Purchases:                               │
│  ─────────────────────────────────────────────────────  │
│  Date       | Vendor Name      | PO Number | Qty | Cost │
│  ─────────────────────────────────────────────────────  │
│  2025-03-10 | Distributor Inc  | PO-2025-101 | 200| 80K  │
│  2025-02-28 | Distributor Inc  | PO-2025-087 | 150| 60K  │
│  2025-02-15 | Retailer XYZ     | PO-2025-064 | 100| 40K  │
│  2025-01-30 | Distributor Inc  | PO-2025-045 | 300|120K  │
│  2025-01-15 | Retailer XYZ     | PO-2025-022 | 100| 40K  │
│                                 [CLOSE]                 │
└─────────────────────────────────────────────────────────┘
```

**Shows:**
- Which vendor we usually buy from
- When was last purchase
- Purchase order number (clickable → open PO)
- Quantity typically ordered
- Cost price (for manager reference, operator can see markup)

**Why:** Helps:
- Understand product sourcing
- Reorder planning (if we buy 200-300 units at a time, we should maintain that stock)
- Price transparency (operator sees we buy at 400, sell at 500)

---

## 31M — Warehouse Transfer Foundation

Products can move between warehouses.

```prisma
WarehouseTransfer {
  id, transfer_number
  from_warehouse_id, to_warehouse_id
  transfer_date DateTime
  expected_arrival_date DateTime?
  
  items[] {
    product_id, quantity
  }
  
  status (IN_TRANSIT, RECEIVED, REJECTED)
  received_by User? (warehouse manager confirms receipt)
  received_date DateTime?
  
  remarks String?
  created_by User
}
```

**Flow:**
```
Manager: "We have too much stock in WH-A, need it in WH-B"
  → Opens "Warehouse Transfer"
  → Selects: from WH-A, to WH-B
  → Adds items: Phone XYZ (50 units), Charger (100 units)
  → Submits
  → System creates transfer document (like a gate pass, but internal)
  → WH-A staff: removes items, marks "shipped"
  → WH-B staff: receives items, marks "received"
  → Inventory automatically updates:
      WH-A: Phone XYZ -50, Charger -100
      WH-B: Phone XYZ +50, Charger +100
```

**Audit trail:** Every transfer is logged (who transferred, when, from where, to where)

---

## Key Decisions (Updated)

1. **Website quantity display:** NO — only show "In Stock" / "Out of Stock"
2. **Website order approval:** Manager approval required before bill created
3. **Warehouse selection:** Customer selects in order form; operator can override
4. **Pricing:** Manager only (no channel-level override)
5. **Product in bill entry:** Popup shows warehouses + stock + customer history + sourcing
6. **Warehouse transfer:** Internal transfers tracked and audited

---

## Add This to FOUNDATIONS.md Now

This is NOT optional. It changes your product model, pricing model, and sync architecture. Better to design it now than patch it later.
