# Manufacturing Module — System Architecture & Performance Engineering

**Date:** 2026-07-14
**Status:** DESIGN — nothing here is implemented. No code was changed to produce it.
**Companion doc:** `help/MANUFACTURING_AUDIT_AND_PLAN.md` (the *why* — read that first).
This doc is the *how*: architecture, schema, endpoints, UI, and a verified performance audit.

---

## 0. Two framings I am deliberately rejecting

**"Build from scratch."** You have a working NestJS + Prisma ERP with 36 modules, live data, and
hard-won conventions. Greenfielding would throw that away. The manufacturing module is designed
here to **disappear into the existing architecture** — same transaction gateway, same status-guard
convention, same permission catalog, same screen template. Almost every primitive it needs
**already exists**; see §1.

**"Optimize for massive traffic."** You are one business, not a social network. Concurrency is not
your problem. Your real, lived failure — stated in your own `FOUNDATIONS.md` — is:

> *"after 3-4 months data piles up and the software slows down; after 1-2 years reports take forever."*

That is **unbounded queries over growing history**, and it is a *completely different* engineering
problem from traffic. Optimizing for imaginary concurrency would not move it one millisecond.
Part B attacks the real thing, with `file:line` evidence.

---

# PART A — MANUFACTURING MODULE ARCHITECTURE

## 1. Reuse inventory (build almost nothing new)

Before designing anything, here is what already exists and **must be reused**:

| Need | Already exists | Where |
|---|---|---|
| Atomic multi-step DB work | `TransactionService.run(tx => …)` | `src/common/services/transaction.service.ts` |
| Stock in/out + audit row | `InventoryOperationsService.stockIn/stockOut` | `src/modules/inventory/services/inventory-operations.service.ts` |
| Stock in/out **inside a caller's tx** | `applyStockInTx` / `recordMovementTx` | *added in Phase 0 (in progress)* |
| Document numbering (`MO-2026-00001`) | `TransactionSequenceService.getNext(orgId, docType)` | `src/common/services/transaction-sequence.service.ts` |
| Permission enforcement | `ActionPermissionGuard` + `@RequireAction('x.y')` | `src/common/guards/`, `src/common/decorators/` |
| Permission registration | `PERMISSION_CATALOG` | `src/common/config/permission-catalog.ts` |
| Org/user injection | `@OrgContext()` | `src/common/decorators/org-context.decorator.ts` |
| Server-side search/filter/paginate | `POST /{resource}/search` → `{ data, total }` | e.g. `purchase-orders-search.service.ts` |
| List screen template | `PurchaseOrdersScreen.tsx` | `frontend/src/components/screens/` |

**The only genuinely new things are: 2 Prisma models, 1 enum, 1 service, 1 controller, 1 screen.**
Everything else is wiring. This is why the estimate is weeks, not months.

> ⚠️ **`TransactionSequence` already solves MO numbering.** Do **not** write a new counter, and do
> **not** compute `MAX(number)` by loading rows — that is the exact bug documented in Part B §B5.

## 2. Schema (all camelCase — these are new models)

Per `CLAUDE.md`: the schema mixes conventions **per model**. `Inventory` is snake_case
(`physical_on_hand`), `InventoryMovement` is camelCase. **New models are camelCase throughout.**

```prisma
enum ManufacturingOrderStatus {
  DRAFT         // planned; nothing committed
  IN_PROGRESS   // materials verified, assembly underway
  COMPLETED     // stock moved: components out, finished goods in
  CANCELLED
}

enum ProductType {
  RAW_MATERIAL    // a component you buy: Motor, Box, Handle
  FINISHED_GOOD   // bought and resold as-is
  ASSEMBLED_GOOD  // manufactured from RAW_MATERIALs
}

model ManufacturingOrder {
  id                Int      @id @default(autoincrement())
  organizationId    Int
  orderNumber       String                        // via TransactionSequenceService, docType "MANUFACTURING_ORDER"
  formulaId         Int
  finishedProductId Int
  warehouseId       Int
  quantityPlanned   Int
  quantityProduced  Int      @default(0)
  quantityScrapped  Int      @default(0)
  status            ManufacturingOrderStatus @default(DRAFT)
  unitCostSnapshot  Decimal? @db.Decimal(12, 2)  // FROZEN at COMPLETED — see §3
  createdBy         Int
  completedBy       Int?
  completedAt       DateTime?
  remarks           String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  formula           AssemblyFormula @relation(fields: [formulaId], references: [id])
  finishedProduct   Product       @relation("MOFinishedProduct", fields: [finishedProductId], references: [id])
  warehouse         Warehouse     @relation(fields: [warehouseId], references: [id])
  lines             ManufacturingOrderLine[]

  @@unique([organizationId, orderNumber])
  @@index([organizationId, status])
  @@index([organizationId, createdAt])     // list screens sort by this — see Part B
  @@index([finishedProductId])
}

model ManufacturingOrderLine {
  id                   Int      @id @default(autoincrement())
  manufacturingOrderId Int
  partId               Int
  productId            Int?                          // NULL = cost-only line (e.g. "Labor")
  quantityRequired     Decimal  @db.Decimal(12, 2)
  quantityConsumed     Decimal  @default(0) @db.Decimal(12, 2)
  unitCostSnapshot     Decimal  @db.Decimal(12, 2)   // frozen at completion

  manufacturingOrder   ManufacturingOrder @relation(fields: [manufacturingOrderId], references: [id], onDelete: Cascade)
  part                 AssemblyPart       @relation(fields: [partId], references: [id])
  product              Product?           @relation(fields: [productId], references: [id])

  @@index([manufacturingOrderId])
}
```

Additions to existing models:

```prisma
model Product {
  productType  ProductType  @default(FINISHED_GOOD)   // safe default: nothing breaks on migration day
}

model AssemblyPart {
  productId  Int?                                      // NULLABLE ON PURPOSE — see below
  product    Product?  @relation(fields: [productId], references: [id])
}

enum InventoryMovementType {
  // ...existing...
  MANUFACTURE_IN     // finished good produced
  MANUFACTURE_OUT    // component consumed
}
```

**Why `AssemblyPart.productId` is nullable, and why that is a feature:** some BOM lines are not
physical parts. `"Labor"` has a cost but no stock. `productId = null` means *cost-only, not
stock-tracked* — the completion transaction skips it when deducting inventory but still counts it
in the cost. Modelling this as non-nullable would force you to invent a fake "Labor" product.

## 3. The one non-obvious design decision: live cost vs. frozen cost

`AssemblyFormula` derives its total at read time — `SUM(qty × part.unitCost)`
(`assembly-formulas.service.ts:88-111`). This is **good design and must be preserved**: re-pricing
one Motor instantly re-costs every product using it.

**But a completed manufacturing order must freeze its cost.** If you assemble 50 juicers in July at
₨1,200 and the motor price rises in September, **your July COGS must not change.** History is
immutable.

| Cost | Purpose | Behaviour |
|---|---|---|
| **Derived** (existing) | planning, quoting, "what would this cost?" | recomputed on every read |
| **Snapshot** (`unitCostSnapshot`) | what hits the books | written **once**, at `COMPLETED`, never recomputed |

Both are correct; they answer different questions. Collapsing them into one figure either breaks
instant re-pricing or silently rewrites your P&L every time a vendor changes a price.

## 4. The completion transaction (the heart of the module)

```
completeOrder(orderId, actualQuantityProduced):

  guard: status === IN_PROGRESS            // same convention as PO / WarehouseTransfer

  TransactionService.run(async tx => {

    for (const line of order.lines):
        if (line.productId == null) continue          // cost-only (Labor) — no stock
        qty = line.quantityRequired × actualQuantityProduced
        InventoryOperationsService.applyStockOutTx(tx, {
            productId: line.productId,
            warehouseId: order.warehouseId,
            quantity: qty,
            movementType: 'MANUFACTURE_OUT',
            reference: order.orderNumber,             // ← traceable
        })
        line.quantityConsumed = qty
        line.unitCostSnapshot = line.part.unitCost    // FREEZE

    InventoryOperationsService.applyStockInTx(tx, {
        productId: order.finishedProductId,
        warehouseId: order.warehouseId,
        quantity: actualQuantityProduced,
        movementType: 'MANUFACTURE_IN',
        reference: order.orderNumber,
    })

    order.unitCostSnapshot = SUM(line.quantityRequired × line.unitCostSnapshot)
    order.status = COMPLETED
  })
```

**Note what this is NOT doing: it writes no new inventory logic.** It calls the same gateway your PO
receipts use. The transaction, the `InventoryMovement` row, the `available` recalculation are all
already solved. That is the entire reason this module is small.

> **Phase 0 dependency:** Phase 0 currently adds `applyStockInTx` and `recordMovementTx`.
> **It must also add `applyStockOutTx`** (get inventory, assert sufficient, decrement
> `physical_on_hand` + `available`, write movement) or Phase 2 cannot deduct components.

### The `NaN` guard — do not skip this

Per `CLAUDE.md`, the most dangerous bug ever found in this codebase was a field-name typo
(`physicalOnHand` vs `physical_on_hand`) that made `NaN < quantity` evaluate `false`, **silently
bypassing an insufficient-stock check**. A clean `tsc` build does not catch it. Assert first:

```typescript
if (!Number.isFinite(available)) {
  throw new Error(`Bad inventory read for product ${productId} in warehouse ${warehouseId}`);
}
if (available < required) throw new BadRequestException(...);
```

Then test it **with real stock, deliberately short**.

## 5. File structure (mirrors `warehouse-transfers/` exactly)

```
src/modules/manufacturing-orders/
├── dto/
│   └── manufacturing-order.dto.ts        # camelCase, class-validator
├── services/
│   ├── manufacturing-orders.service.ts   # CRUD + status transitions + completion tx
│   └── manufacturing-orders-search.service.ts   # POST /search (paginated) — see Part B
├── manufacturing-orders.controller.ts
└── manufacturing-orders.module.ts        # imports DatabaseModule, CommonModule, InventoryModule

frontend/src/components/screens/
└── ManufacturingOrdersScreen.tsx         # clone PurchaseOrdersScreen — minus its double-fetch bug
```

Also touched: `src/common/config/permission-catalog.ts` (new `manufacturing` block),
`src/app.module.ts` (register), `frontend/src/services/api.ts` (add search methods),
`frontend/src/components/MainDashboard.tsx` (union + navItem + switch case).

## 6. API endpoints

| Method | Route | `@RequireAction` | Purpose |
|---|---|---|---|
| `POST` | `/manufacturing-orders` | `manufacturing.create` | Create DRAFT from formula + qty |
| `POST` | `/manufacturing-orders/search` | `manufacturing.view` | **Paginated** list (`{skip, take, filters}` → `{data, total}`) |
| `GET` | `/manufacturing-orders/:id` | `manufacturing.view` | Detail + lines + live material availability |
| `POST` | `/manufacturing-orders/:id/start` | `manufacturing.start` | DRAFT → IN_PROGRESS (runs availability check) |
| `POST` | `/manufacturing-orders/:id/complete` | `manufacturing.complete` | IN_PROGRESS → COMPLETED (**the stock transaction**) |
| `POST` | `/manufacturing-orders/:id/cancel` | `manufacturing.cancel` | → CANCELLED |

Register in `PERMISSION_CATALOG`:

```typescript
{
  module: 'manufacturing',
  label: 'Manufacturing',
  permissions: [
    { key: 'manufacturing.view',     label: 'View manufacturing orders' },
    { key: 'manufacturing.create',   label: 'Create a manufacturing order' },
    { key: 'manufacturing.start',    label: 'Start production (commit materials)' },
    { key: 'manufacturing.complete', label: 'Complete production (moves stock)' },
    { key: 'manufacturing.cancel',   label: 'Cancel a manufacturing order' },
  ],
},
```

**Note there is no `manufacturing.cost` permission.** Per `FOUNDATIONS.md`, profit/cost visibility is
gated on the existing `User.canViewFinancials` flag. `unitCostSnapshot` must be **omitted from the
API response** unless that flag is set — same rule as every other margin field.

## 7. UI architecture

Clone `PurchaseOrdersScreen.tsx` (the sanctioned pattern) — **with three deliberate deviations**,
because the template carries bugs (Part B §B6):

1. **One `useEffect`, not two.** The PO template has a `[]` effect *and* a
   `[filters, skip]` effect, so **every list screen fetches its data twice on mount**. Do not copy that.
2. **`useMemo` the `filterableColumns` array.** It is currently rebuilt every render and passed to
   `FilterPanel`, busting memoization in the child.
3. **No `searchProducts({ take: 500 })` dump.** Six screens do this to fill a dropdown; it silently
   truncates at 500 products and re-fetches on every mount. The MO product/BOM picker must use a
   **server-side typeahead** (`POST /products/search` with the typed term, `take: 20`, debounced —
   copy the debounce in `InvoiceScreen.tsx:433`, the only correct one in the codebase).

Screen layout: a filterable/paginated MO table; a create-MO modal (pick formula → pick warehouse →
enter quantity → live "can we build this?" material-availability panel); a detail view showing lines,
consumed quantities, and (if `canViewFinancials`) the cost snapshot.

---

# PART B — PERFORMANCE ENGINEERING

Every finding below was **verified against the source**, not inferred. Ranked by real-world impact
on *your* stated symptom.

## B1. 🔴 The reporting module has zero pagination and zero SQL aggregation

**Verified by counting:** `src/modules/reporting/services/reporting.service.ts` —

```
findMany calls : 24
take: clauses  : 0     ← every single query is unbounded
groupBy calls  : 0     ← every total is reduced in JavaScript
```

24 unbounded queries feeding 22 GET routes (`reporting.controller.ts:11-176`). Every report loads
**the entire matching history** into Node's heap and reduces it in JS. Worst offenders:

| Line | What it loads |
|---|---|
| `reporting.service.ts:283` | **the entire Inventory table**, with Product + Warehouse joined. No filter, no limit. |
| `reporting.service.ts:268` | every SalesOrder ever created. No date filter. |
| `reporting.service.ts:799` | three years of bills into memory |
| `reporting.service.ts:324/486/699` | all bills in range, with `lines → product` fully hydrated |

**This is the direct, mechanical cause of "reports get slower every month."** Response time is
O(all history) and always will be.

**Fix:**
- Add `take`/`skip` to every list-shaped report; return `{ data, total }` like the `/search` endpoints already do.
- Replace in-JS `.reduce()` totals with Prisma `groupBy` / `aggregate` — push the math into Postgres.
- **The team already knows how**: `sales-analysis.service.ts:211/232` uses `groupBy` and `:255` uses
  `$queryRaw` correctly. The pattern exists; core reporting just never adopted it.

## B2. 🔴 Missing index on `Bill(organizationId, bill_date)`

`Bill` (`prisma/schema.prisma:638-639`) has `@@unique([organizationId, bill_number])` and
`@@index([organizationId, customerId, bill_date])` — but **no `(organizationId, bill_date)` index.**

Postgres has no index skip-scan. A date-range sales report that does not filter by customer can only
use the `organizationId` prefix, then **filters the org's entire bill history in the heap.**

Every dated sales report degrades linearly with total bills. Forever.

Also unindexed and hot: `Bill.status`, `Bill.salesmanId`, `Bill.createdAt`;
`BillLine.productId` (**the largest table in the DB** — product-performance and COGS-by-product
queries sequential-scan it); `Product.categoryId` / `brandId`; `PurchaseOrderReceipt.organizationId`.

**Fix:** add the indexes. This is a migration and roughly the cheapest large win available.

## B3. 🔴 N+1 in every Balance Sheet / P&L / Trial Balance

`src/modules/journal-entries/services/gl-posting.service.ts:242-257`:

```typescript
for (const accountId of accountIds) {
  result.set(accountId, await this.getAccountBalance(organizationId, accountId, asOfDate));
}
```

`getAccountBalance` (line 206) issues **two** queries — an `aggregate` over `GLPosting` and a
`findUnique` on `ChartOfAccount`. Sequentially. Per account.

**With a 150-account chart of accounts that is ~300 round-trips to render one Balance Sheet** — and
each `aggregate` scans GL history that grows forever.

Callers: `balance-sheet.service.ts:81`, `income-statement.service.ts:84`,
`journal-entries.service.ts:155`.

**Fix:** one `groupBy` over `GLPosting` (`by: ['accountId']`, `_sum`) + one `findMany` on
`ChartOfAccount` with `where: { id: { in: accountIds } }`. **300 queries → 2.**

## B4. 🔴 No caching layer of any kind

Zero hits across `src/` for `CacheModule`, `redis`, `ioredis`, `cache-manager`, `@Cacheable`.

Every dashboard hit recomputes every figure from raw history. The Balance Sheet recomputes from the
beginning of time on every single render.

**Fix (in order of value):**
1. Nightly **P&L / Balance Sheet snapshot** into a table. Reports read the snapshot; only the current
   period is computed live. This is the structural fix and it makes report time **O(1) in history**.
2. Redis (or in-memory) cache for the genuinely static reads: product list, chart of accounts, warehouses.
3. Do **not** cache anything stock-related — correctness beats speed there.

## B5. 🟠 Invoice creation gets slower every day of the year

`bills.service.ts:56`, inside `generateGatePassNumber()`:

```typescript
const gatePasses = await this.prisma.gatePass.findMany({
  where: { organizationId, gate_pass_number: { startsWith: `GP-${year}-` } },
  select: { gate_pass_number: true },
});
// ...then finds the max sequence in a JS loop
```

**This runs on every invoice creation** and loads **every gate pass issued this calendar year**.
On 2 January it is fast. On 31 December it scans a year of history — on a write path.

The code comment explains *why* it was written this way (a real past bug: sorting a numeric field as
a string picked the wrong "last" row and generated duplicates). The diagnosis was right; the fix was
wrong.

**Fix — and this is the satisfying part: you already solved this correctly, 10 lines above.**
Invoice numbering (`bills.service.ts:40-45`) uses a dedicated `InvoiceSequence` counter row. And
there is already a **generic** counter — `TransactionSequence` + `TransactionSequenceService.getNext()`
(`src/common/services/transaction-sequence.service.ts:16`) — already used by cash-book and
journal-entries. The schema comment at `prisma/schema.prisma:708` even says gate passes "generate
their own numbers," unaware that they do it the slow way.

```typescript
const gatePassNumber = await this.transactionSequenceService.getNext(organizationId, 'GATE_PASS');
```

**O(year-to-date) → O(1).** No new infrastructure. This same service gives `ManufacturingOrder` its
number for free.

Also here: `bills.service.ts:99` issues a `findUnique` **per line** inside a loop in
`reserveSaleInventory` — replace with one `findMany({ where: { id: { in: ids } } })`.

## B6. 🟠 Frontend: every list screen fetches its data twice

`PurchaseOrdersScreen.tsx:36-43` has two `useEffect`s — one with `[]` calling `fetchOrders()`, and one
with `[primaryFilter, columnFilters, skip]` **which also fires on mount.** Both hit the API.

This template was copied into `BillsScreen`, `CustomersScreen`, `ProductsScreen`. **You are serving
every list screen's data twice, and paying for it twice on the server.**

Worse: `columnFilters` is a **new array identity on every render**, so any parent re-render can
retrigger the effect — a latent refetch loop.

**Fix:** collapse to a single effect keyed on the filter/pagination state; `useMemo` the filter arrays.

## B7. 🟠 Frontend: the 500-product dump

`searchProducts({ skip: 0, take: 500 })` is copy-pasted into **six** screens to populate a `<select>`:
`InvoiceScreen.tsx:474`, `SalesOrdersScreen.tsx:103`, `WarehouseTransfersScreen.tsx:69`,
`VendorsScreen.tsx:120`, `SalesCommissionScreen.tsx:45`, `ProductStudioScreen.tsx:45`.

Each one re-fetches on every mount (no cache), renders **500 `<option>` DOM nodes**, and — critically —
**silently truncates at 500 products.** `FOUNDATIONS.md` requires thousands of products. *This is
already broken*, not a future risk: product #501 simply cannot be selected on an invoice.

**Fix:** server-side typeahead — `POST /products/search`, `take: 20`, debounced (copy
`InvoiceScreen.tsx:433`, the codebase's only correct debounce).

## B8. 🟡 Frontend: all 45 screens ship in the initial bundle

There is **no router**. `MainDashboard.tsx` holds a 47-member string union (line 52) and a giant
`switch` (line 414), with all ~45 screens **eagerly imported** — including `InvoiceScreen.tsx` at
**2,550 lines**.

Consequences: huge first-paint bundle, no code splitting, no URL, no deep-linking, no back button.

**Fix:** `React.lazy()` + `<Suspense>` per screen. This is a ~30-line change to `MainDashboard.tsx`
and is the single biggest startup-time win available. (A real router is a bigger, separate discussion —
worth doing, but not required to get the bundle win.)

## B9. 🟡 No observability

`src/database/prisma.service.ts` is 13 lines: a bare `PrismaClient`. No `log` config, no slow-query
logging, no connection-pool tuning, no query timeouts. `DATABASE_URL` sets no `connection_limit`.

**You cannot fix what you cannot see.** Add slow-query logging (`$on('query')`, warn above ~200ms)
before the optimization work, so improvements are measurable rather than anecdotal.

## Performance work, ranked

| # | Fix | Effort | Impact |
|---|---|---|---|
| 1 | Slow-query logging (**do this first — it makes the rest measurable**) | 1 h | Visibility |
| 2 | Gate-pass number → `TransactionSequenceService` (§B5) | 1 h | Removes a write-path landmine |
| 3 | `getAccountBalances` N+1 → `groupBy` (§B3) | 2 h | ~300 queries → 2 per financial statement |
| 4 | Missing indexes, esp. `Bill(organizationId, bill_date)` (§B2) | 3 h | Every dated report |
| 5 | Frontend double-fetch (§B6) | 2 h | Halves list-screen API load |
| 6 | `React.lazy()` code splitting (§B8) | 3 h | Startup / first paint |
| 7 | Paginate + `groupBy` the reporting module (§B1) | 1–2 wks | **The actual cure for "reports get slow"** |
| 8 | Nightly P&L / Balance Sheet snapshot (§B4) | 1 wk | Report time becomes O(1) in history |
| 9 | Product typeahead (§B7) | 4 h | Fixes a live correctness bug (>500 products) |

**Items 1–6 total roughly two days and deliver most of the felt improvement.** Items 7–8 are the
structural cure and should be scheduled deliberately.

---

# PART C — EXECUTION ORDER

The manufacturing phases and the performance work are **independent tracks**. Do not interleave them
in the same commit.

```
TRACK 1 — MANUFACTURING (from MANUFACTURING_AUDIT_AND_PLAN.md)
  Phase 0  Audit trail        3-5 d   [IN PROGRESS — 1 of 4 edits done]
  Phase 1  Classify + link    1 wk
  Phase 2  ManufacturingOrder 2 wks   ← inventory stops lying
  Phase 3  Costing + GL       1.5 wk
  Phase 4  Traceability/QC    2 wks
  Phase 5  Demand-driven      2 wks

TRACK 2 — PERFORMANCE (this doc, Part B)
  Quick wins (#1-6)           ~2 d    ← can run any time; do #1 first
  Reporting overhaul (#7)     1-2 wks
  Snapshot layer (#8)         1 wk
```

**Recommended:** finish Phase 0, then take the two-day performance quick-win pass (it makes
everything after it faster to develop *and* test), then resume Phase 1.

---

## Verification

**Manufacturing (Phase 2 exit criteria — non-negotiable):**
1. Create an MO for 10 juicers; record component stock levels first.
2. Start → complete it **over real HTTP** (not a unit test).
3. Component stock decreased by exactly `BOM qty × 10`; finished-good stock increased by exactly 10.
4. An `InventoryMovement` row exists for **every** stock-tracked line, referencing the MO number.
5. Change a part's price afterwards → **the completed MO's `unitCostSnapshot` does not move.**
6. Try to start an MO with deliberately insufficient stock → it must be **blocked**, not silently pass.
7. `npm run build` → 0 errors. No `@ts-nocheck` anywhere.

**Performance:** capture `EXPLAIN ANALYZE` (or the slow-query log) for one dated sales report and one
Balance Sheet render **before and after**. Record the numbers. Do not accept "it feels faster."

---

**Nothing in this document has been implemented.** It is a design and an audit, awaiting approval.
