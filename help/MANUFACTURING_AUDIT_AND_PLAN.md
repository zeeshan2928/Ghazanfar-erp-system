# Manufacturing & Assembly — Audit Report, Execution Plan & Phased Guide

**Date:** 2026-07-14
**Author:** Engineering audit (Claude Code)
**Status:** PROPOSAL — nothing in this document has been implemented. No code was changed to produce it.
**Scope:** Why the ERP cannot currently represent manufacturing, what is broken today, and the exact
step-by-step path to fix it.

---

## 0. How to read this document

- **Part A — Audit.** What exists, what is broken, verified against the real code. Read this first.
- **Part B — The Core Problem.** The one-paragraph version of why manufacturing does not work.
- **Part C — Execution Plan.** Phase 0 through Phase 5, in strict dependency order.
- **Part D — Step-by-step procedure** for the phases that must be done first.
- **Part E — Recommendations & explicit non-goals.**

Every claim in Part A was verified by reading the source. File paths and line numbers are given so
you can check them yourself. Where this document says "does not exist", it means a grep of the
codebase returned nothing — not that it was hard to find.

---

# PART A — AUDIT REPORT

## A1. What exists today (and works)

The `assembly-formulas` module is real, well-built, and does exactly one thing: **it calculates a
derived cost figure**. It is a Bill-of-Materials *costing calculator*, not a manufacturing system.

### The three models

| Model | Purpose | Key fields |
|---|---|---|
| `AssemblyPart` | Shared catalog of components (Motor, Complete Body, Box, Labor…) | `id`, `organizationId`, `family`, `name`, `unitCost`, `hadPriceConflict`, `conflictNote` |
| `AssemblyFormula` | A product's BOM | `id`, `organizationId`, `family`, `label`, `productCodes[]`, `sourceFile` |
| `AssemblyFormulaLine` | One line of a BOM: which part, how many | `id`, `formulaId`, `partId`, `quantity` |
| `AssembledItemCost` | Maps a sales-report line item → a formula (or a manual cost override) | `id`, `organizationId`, `itemKey`, `itemName`, `formulaId`, `manualCost` |

Defined at `prisma/schema.prisma:1594-1692`.

### The one genuinely excellent design decision

**Formula total cost is DERIVED at read time, never stored.**

`src/modules/assembly-formulas/services/assembly-formulas.service.ts:88-111` (`toView`) computes:

```
totalCost = SUM( line.quantity × line.part.unitCost )
```

This means re-pricing a single `AssemblyPart` (e.g. Motor goes from ₨500 → ₨520) instantly re-costs
**every** formula that uses that part, with no recalculation job, no stale cache, no migration.
`updatePartCost()` (line 67) is the "change one thing" action. This is the right architecture and
**must be preserved** through everything that follows.

### What it is actually used for

`AssembledItemCost` is consumed **only** by the sales-analysis module. Its job: when an item appears
in an uploaded purchase file at price ₨0 (because you *assembled* it rather than *bought* it), the
system needs a cost to compute profit. It resolves that cost from the BOM formula.

That is the entire current purpose of the BOM. **It is a reporting input. It has never moved a
single unit of stock.**

---

## A2. FINDING #1 (CRITICAL) — Assembly never touches inventory

**Verified:** No file in the codebase references both `AssemblyFormula`/`AssemblyPart` *and*
`Inventory`/`InventoryMovement`. The two domains are completely disconnected.

### What this means in practice

When your team physically assembles 50 juicers on the shop floor:

| Reality | What the ERP records |
|---|---|
| 50 Motors consumed | *nothing* |
| 50 Complete Bodies consumed | *nothing* |
| 50 Boxes consumed | *nothing* |
| 50 Juicers created | *nothing* |

**Your inventory is silently wrong the moment anything is assembled.** Components show as still
in stock (they are not). Finished goods show as absent (they exist). Nothing in the system knows
the assembly event happened, because there is no document that represents it.

This is not a missing feature. It is a **hole in the ledger**.

### Severity

This is the root cause of a family of downstream symptoms you have already been fighting:

- The "parts vs genuine sales" pollution problem (see `parts_vs_genuine_sales_rule` memory) exists
  *because* the system cannot distinguish a part from a product — so a manual exclusion list had to
  be maintained by hand.
- Stock counts drift from physical reality, and there is no audit record explaining the drift.
- Reorder logic (`minimum_quantity` / `reorder_quantity` on `Product`) fires on wrong numbers.

---

## A3. FINDING #2 (CRITICAL) — `AssemblyPart` is a phantom catalog

`AssemblyPart` is a **standalone table with no link to `Product`**:

```prisma
model AssemblyPart {
  id               Int            @id @default(autoincrement())
  organizationId   Int
  family           AssemblyFamily
  name             String          // <-- a free-text string. NOT a Product FK.
  unitCost         Decimal        @db.Decimal(12, 2)
  ...
  @@unique([organizationId, family, name])
}
```

There is **no `productId`**. There is no foreign key to `Product` anywhere on this model.

### What this means

The "Motor" in your BOM and the "Motor" sitting in Warehouse 2 that you bought from a vendor are
**two unrelated records in two unrelated tables that merely happen to share a name string**.

They are two parallel universes:

```
PURCHASING UNIVERSE                    BOM UNIVERSE
-------------------                    ------------
Product "Motor" (id=412)               AssemblyPart "Motor" (id=7)
  ├─ bought from Vendor X                ├─ unitCost: ₨500
  ├─ Inventory: 340 in W2                └─ used in 4 formulas
  ├─ cost_price, reorder_qty
  └─ PurchaseOrderItems

         ^^^ NO LINK BETWEEN THESE ^^^
```

**Consequence:** even if you built a manufacturing order tomorrow, it could not consume stock —
because the BOM does not reference anything that *has* stock. This must be fixed before anything
else in this document is possible. It is the hard dependency.

---

## A4. FINDING #3 (CRITICAL) — `Product` has no type

`prisma/schema.prisma:498-536`. The `Product` model has:

`id`, `organizationId`, `code`, `name`, `description`, `categoryId`, `brandId`, `cost_price`,
`isVisibleOnCounter`, `isVisibleOnWebsite`, `isVisibleWholesale`, `isVisibleRetail`, `base_unit`,
`isActive`, `minimum_quantity`, `primary_vendor_id`, `reorder_quantity`

**There is no `productType`. No `isManufactured`. No raw-material vs finished-good distinction.**

Motors, boxes, handles, thermostats, and the juicers you sell all sit in one undifferentiated list.
The system has no way to know that one is an input and the other is an output.

This is the **single most consequential missing field in the schema**. Almost everything else in
this document depends on it. Note that `base_unit` (default `"piece"`) already exists — so
unit-of-measure is at least partially handled.

---

## A5. FINDING #4 (HIGH, INDEPENDENT BUG) — Two major stock flows write no audit record

This is a **separate bug from manufacturing** and is worth fixing on its own merits.

### The correct pattern exists

`src/modules/inventory/services/inventory-operations.service.ts` does it right:

- `stockIn(organizationId, productId, warehouseId, quantity, reference, createdBy, remarks)` — line 85
- `stockOut(organizationId, productId, warehouseId, quantity, reference, createdBy, remarks)` — line 160

Each wraps in `TransactionService.run()`, updates `Inventory.physical_on_hand` **and** `available`,
and writes an `InventoryMovement` audit record. This is the gateway all stock changes should go
through.

### Two flows bypass it entirely

**Verified by grep — both files contain ZERO references to `inventoryMovement`, `stockIn`, `stockOut`,
or `InventoryOperationsService`. Both mutate `tx.inventory.physical_on_hand` directly:**

| File | Method | Lines touching `physical_on_hand` | Writes `InventoryMovement`? |
|---|---|---|---|
| `src/modules/purchase-orders/services/purchase-orders.service.ts` | `confirmReceipt()` | 267, 275 | **NO** |
| `src/modules/warehouse-transfers/services/warehouse-transfers.service.ts` | `confirmReceipt()` | 310, 325, 349 | **NO** |

### Why this matters

`InventoryMovement` is the table that answers *"why does this warehouse have 47 motors instead of
50?"*. Your two **highest-volume stock operations** — receiving goods from a vendor, and moving
stock between godams — change quantities without leaving a trace.

The audit trail has holes exactly where the most activity happens.

**Do not build manufacturing traceability on top of this.** Fix it first (Phase 0). It is cheap:
both services should call `InventoryOperationsService` instead of touching `tx.inventory` directly.

---

## A6. FINDING #5 (MEDIUM) — `AssemblyFamily` is a two-value enum

```prisma
enum AssemblyFamily {
  JUICER
  BLENDER
}
```

Every BOM must be a JUICER or a BLENDER. Adding a third product family (fan, iron, heater…) requires
a schema migration. This will not scale as the business grows. It should eventually become a
`ProductCategory` reference or a free-form string, but it is **not urgent** — flagged for Phase 4,
not now. Changing it early would churn the parser and import services for no immediate gain.

---

## A7. Existing patterns worth reusing (the good news)

Almost everything a manufacturing module needs **already exists**. This is why the estimate is weeks,
not months.

### Transaction wrapper
`src/common/services/transaction.service.ts` — `run<T>(cb: (tx: Prisma.TransactionClient) => Promise<T>)`.
Every stock flow uses it. A manufacturing order will too.

### Stock movement gateway
`InventoryOperationsService.stockIn()` / `.stockOut()`. **A manufacturing completion is literally
N stock-outs and one stock-in inside one transaction.** No new inventory logic needs to be
written at all — this is the key insight that makes Phase 2 small.

### Status-progression convention
There is **no separate approval engine** in this codebase. Approval is implicit in a `status` field,
guarded at the top of each service method.

```prisma
enum PurchaseOrderStatus { DRAFT  SENT  PARTIAL_RECEIVED  RECEIVED  REJECTED  CANCELLED }
enum TransferStatus      { PENDING  IN_TRANSIT  RECEIVED  REJECTED }
enum GatePassStatus      { PENDING  PICKED  CONFIRMED  REJECTED }
```

`ManufacturingOrder` must follow the same shape — no new abstraction.

### Movement type enum (already has what we need)
```prisma
enum InventoryMovementType {
  STOCK_IN  STOCK_OUT  ADJUSTMENT  TRANSFER_OUT  TRANSFER_IN  DAMAGE  SHRINKAGE  RETURN
}
```
Two new values will be added: `MANUFACTURE_IN`, `MANUFACTURE_OUT`.

### Module folder convention
```
src/modules/warehouse-transfers/
  ├── dto/
  │   └── transfer.dto.ts
  ├── services/
  │   └── warehouse-transfers.service.ts
  ├── warehouse-transfers.controller.ts
  └── warehouse-transfers.module.ts
```
Mirror this exactly for `manufacturing-orders`.

---

## A8. ⚠️ Naming convention warning (read before writing any code)

Per `CLAUDE.md`: **there is no automatic camelCase conversion in this project.** The schema mixes
conventions **per model**. Relevant to this work:

| Model | Convention | Example fields |
|---|---|---|
| `Inventory` | **snake_case** | `physical_on_hand`, `opening_balance` (but `organizationId`, `productId`, `warehouseId` are camelCase!) |
| `PurchaseOrderReceipt` | **snake_case** | `quantity_received`, `warehouse_id`, `received_by` |
| `WarehouseTransfer` | **MIXED** | `transfer_number`, `from_warehouse_id` + `organizationId`, `status` |
| `InventoryMovement` | **camelCase** | `organizationId`, `movementType`, `createdBy` |
| `AssemblyPart` / `AssemblyFormula` | **camelCase** | `organizationId`, `unitCost`, `formulaId` |
| **`ManufacturingOrder` (new)** | **camelCase — all of it** | new models use camelCase, always |

**Before touching any model for the first time in a session:**
```bash
grep -n "^model <ModelName> {" -A 30 prisma/schema.prisma
```

**Never write `// @ts-nocheck`.** CI fails on it. The type checker is the safety net that catches
naming errors — do not blind it.

---

# PART B — THE CORE PROBLEM (the one-paragraph version)

> You have a BOM that knows what a juicer *costs*, and an inventory that knows what you *have*.
> Nothing connects them. There is no document in the system that represents the act of assembling
> something. So when you assemble, components are not deducted, finished goods are not created,
> and no record is written. The BOM references parts (`AssemblyPart`) that are not the same records
> as the parts you actually stock (`Product`), so even if you wanted to deduct them, you couldn't.
> And `Product` has no field saying which items are inputs and which are outputs, so the system
> cannot tell a motor from a juicer.

Fixing manufacturing means fixing exactly those three things, in that order. Everything else —
quality control, batch traceability, labor costing, demand-driven production — is a **report or a
field hanging off the document created in Phase 2**, and none of it is possible before it exists.

---

# PART C — EXECUTION PLAN (phased, in dependency order)

**The ordering is not negotiable.** Each phase is a hard dependency of the next. This mirrors the
discipline already stated in `FOUNDATIONS.md`: *"inventory 100% before billing."* The same rule
applies here — **manufacturing must move stock correctly before it does anything clever.**

```
Phase 0  ──►  Phase 1  ──►  Phase 2  ──►  Phase 3  ──►  Phase 4  ──►  Phase 5
Fix audit     Classify      THE           Costing &     Traceability   Demand-
trail         & link        DOCUMENT      GL            & Quality      driven
(3-5 d)       (1 wk)        (2 wks)       (1.5 wks)     (2 wks)        (2 wks)

└──────── MUST-HAVE: inventory stops lying ────────┘└──── VALUE LAYER ────┘
```

---

## PHASE 0 — Close the audit-trail holes  *(3–5 days)*

**Independent of manufacturing. Do it first regardless.** You cannot build traceability on a ledger
that already has gaps.

| # | Task | File |
|---|---|---|
| 0.1 | Make `PurchaseOrder.confirmReceipt()` call `InventoryOperationsService.stockIn()` instead of mutating `tx.inventory` directly | `src/modules/purchase-orders/services/purchase-orders.service.ts` (~line 267) |
| 0.2 | Make `WarehouseTransfer.confirmReceipt()` call `stockOut()` (source) + `stockIn()` (destination) | `src/modules/warehouse-transfers/services/warehouse-transfers.service.ts` (~lines 310, 325, 349) |
| 0.3 | Both must run inside the existing `TransactionService.run()` so partial failure rolls back | — |
| 0.4 | Backfill note: historical rows have no movements. **Do NOT fabricate them.** Document the cutover date instead. | — |

**Exit criteria:** Receive a PO and complete a warehouse transfer via real HTTP; confirm an
`InventoryMovement` row appears for each, with correct `reference` and `createdBy`.

**Why first:** if manufacturing writes perfect audit records while POs and transfers write none,
your movement ledger still cannot reconcile, and the whole traceability story is worthless.

---

## PHASE 1 — Classify products & link the BOM to reality  *(1 week)*

**This is the hard dependency for everything downstream.** Nothing works until the BOM references
things that actually have stock.

### 1.1 Add product type

```prisma
enum ProductType {
  RAW_MATERIAL     // a component you buy: Motor, Box, Handle, Thermostat
  FINISHED_GOOD    // a product you buy and resell as-is
  ASSEMBLED_GOOD   // a product you manufacture from RAW_MATERIALs
}

model Product {
  ...
  productType  ProductType  @default(FINISHED_GOOD)   // safe default: preserves current behaviour
}
```

Default of `FINISHED_GOOD` means **every existing product keeps behaving exactly as it does today**.
Nothing breaks on migration day.

### 1.2 Link `AssemblyPart` → `Product` (the critical join)

```prisma
model AssemblyPart {
  ...
  productId  Int?                                            // nullable during migration
  product    Product?  @relation(fields: [productId], references: [id])
}
```

**Nullable on purpose.** Some `AssemblyPart` rows are not physical parts at all — `"Labor"` is a
line in your BOM. Labor has a cost but no stock. `productId = null` means *"cost-only, not
stock-tracked"*, and the manufacturing order will correctly skip it when deducting inventory.
This is a feature, not a compromise.

### 1.3 Build a mapping UI (do NOT auto-match)

This is the same lesson already learned in the parts-vs-genuine-sales work: **BOM part names and
product names do not match, and a fuzzy auto-match will silently corrupt your data.**

- BOM says: `"White Body 7025 Copper"`
- Product master says: `"1818 White Body 3in1 7025 Copper Philips"`

Build a review screen: two columns, suggested matches on the left, user confirms each one. Exactly
like the Parts Review screen that already exists. **Never auto-apply.** A wrong mapping means the
wrong component gets deducted from stock forever.

### 1.4 Mark the manufactured products

Set `productType = ASSEMBLED_GOOD` on every product that has an `AssemblyFormula`, and
`RAW_MATERIAL` on every mapped `AssemblyPart.product`.

**Exit criteria:** Every `AssemblyPart` is either linked to a real `Product` **or** explicitly
confirmed as cost-only (like Labor). A report lists any unmapped parts. Zero silent gaps.

**Bonus:** this phase alone fixes the parts-vs-genuine-sales pollution at its root. Once parts are
typed `RAW_MATERIAL`, sales reports can filter them structurally instead of by a hand-maintained
exclusion list.

---

## PHASE 2 — THE DOCUMENT: `ManufacturingOrder`  *(2 weeks) — THE WHOLE BALLGAME*

**The moment this ships, your inventory stops lying.** Everything before it is preparation;
everything after it is enhancement.

### 2.1 Schema (all camelCase — it is a new model)

```prisma
enum ManufacturingOrderStatus {
  DRAFT         // being planned, nothing reserved
  IN_PROGRESS   // materials committed, assembly happening
  COMPLETED     // stock moved: components out, finished goods in
  CANCELLED     // abandoned; any reservation released
}

model ManufacturingOrder {
  id                Int      @id @default(autoincrement())
  organizationId    Int
  orderNumber       String                          // "MO-2026-00001"
  formulaId         Int                             // which BOM
  finishedProductId Int                             // what comes out
  warehouseId       Int                             // where it happens
  quantityPlanned   Int
  quantityProduced  Int      @default(0)
  quantityScrapped  Int      @default(0)
  status            ManufacturingOrderStatus @default(DRAFT)
  unitCostSnapshot  Decimal? @db.Decimal(12, 2)     // BOM cost frozen AT COMPLETION
  createdBy         Int
  completedBy       Int?
  completedAt       DateTime?
  remarks           String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  formula           AssemblyFormula    @relation(fields: [formulaId], references: [id])
  finishedProduct   Product            @relation("MOFinishedProduct", fields: [finishedProductId], references: [id])
  warehouse         Warehouse          @relation(fields: [warehouseId], references: [id])
  lines             ManufacturingOrderLine[]

  @@unique([organizationId, orderNumber])
  @@index([organizationId, status])
}

model ManufacturingOrderLine {
  id                   Int      @id @default(autoincrement())
  manufacturingOrderId Int
  partId               Int                            // the AssemblyPart
  productId            Int?                           // NULL = cost-only line (e.g. Labor)
  quantityRequired     Decimal  @db.Decimal(12, 2)
  quantityConsumed     Decimal  @default(0) @db.Decimal(12, 2)
  unitCostSnapshot     Decimal  @db.Decimal(12, 2)    // part cost frozen at completion

  manufacturingOrder   ManufacturingOrder @relation(fields: [manufacturingOrderId], references: [id], onDelete: Cascade)
  part                 AssemblyPart       @relation(fields: [partId], references: [id])
  product              Product?           @relation(fields: [productId], references: [id])

  @@index([manufacturingOrderId])
}
```

Add to `InventoryMovementType`:
```prisma
MANUFACTURE_IN     // finished good produced
MANUFACTURE_OUT    // component consumed
```

### 2.2 The `unitCostSnapshot` decision (important, and deliberate)

The BOM derives cost live — that is the good design from A1 and it stays. **But a completed
manufacturing order must freeze its cost.**

If you assemble 50 juicers in July at ₨1,200 each, and in September the motor price rises, your
**July COGS must not change**. History is immutable. So:

- **Live/derived cost** → planning, quoting, "what would this cost to make?"
- **Snapshot cost** → written once, at `COMPLETED`, never recalculated. This is what hits the books.

Both are correct. They serve different questions. Getting this wrong means your P&L silently
rewrites itself every time a part price changes.

### 2.3 The completion transaction (the heart of the whole system)

```
completeOrder(orderId, actualQuantityProduced):

  guard: status must be IN_PROGRESS          // same convention as PO/Transfer

  TransactionService.run(async tx => {

    for each line in order.lines:
        if line.productId is NULL:  continue          // cost-only (Labor) — no stock
        qty = line.quantityRequired × actualQuantityProduced
        InventoryOperationsService.stockOut(
            orgId, line.productId, order.warehouseId, qty,
            reference: order.orderNumber,              // <-- traceable
            createdBy: userId,
        )
        line.quantityConsumed  = qty
        line.unitCostSnapshot  = line.part.unitCost    // FREEZE

    InventoryOperationsService.stockIn(
        orgId, order.finishedProductId, order.warehouseId, actualQuantityProduced,
        reference: order.orderNumber,
        createdBy: userId,
    )

    order.unitCostSnapshot = SUM(line.quantityRequired × line.unitCostSnapshot)
    order.quantityProduced = actualQuantityProduced
    order.status           = COMPLETED
    order.completedAt      = now()
  })
```

**Note what this is NOT doing: it is not writing any new inventory logic.** It calls the same
`stockIn`/`stockOut` your purchase receipts use. All the hard parts — the transaction, the
`InventoryMovement` record, the `available` recalculation — are already solved. That is why this
phase is two weeks and not two months.

### 2.4 Material availability check

Before allowing `DRAFT → IN_PROGRESS`, verify every stock-tracked line has enough `available` in
the target warehouse. If short, block and report the shortfall:

> *"Cannot start MO-2026-00042: short 20 × Motor in Warehouse 2 (have 30, need 50)."*

⚠️ **Guard against the `NaN` class of bug.** Per `CLAUDE.md`, the single most dangerous bug found in
the 2026-07-06 audit was a typo (`physicalOnHand` vs `physical_on_hand`) that made
`NaN < quantity` evaluate to `false` — silently **bypassing** an insufficient-stock check. Assert
the value is a finite number *before* comparing:

```typescript
if (!Number.isFinite(available)) throw new Error(`Bad inventory read for product ${productId}`);
if (available < required) throw new BadRequestException(...);
```

A clean `tsc` build does **not** prove this correct. Test it with real stock, deliberately short.

### 2.5 Module structure (mirror `warehouse-transfers` exactly)

```
src/modules/manufacturing-orders/
  ├── dto/
  │   └── manufacturing-order.dto.ts          # camelCase, as all DTOs are
  ├── services/
  │   └── manufacturing-orders.service.ts
  ├── manufacturing-orders.controller.ts
  └── manufacturing-orders.module.ts
```

### 2.6 Endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/manufacturing-orders` | Create (DRAFT) from a formula + quantity |
| `GET` | `/manufacturing-orders` | List / filter by status |
| `GET` | `/manufacturing-orders/:id` | Detail incl. lines + live material availability |
| `POST` | `/manufacturing-orders/:id/start` | DRAFT → IN_PROGRESS (runs availability check) |
| `POST` | `/manufacturing-orders/:id/complete` | IN_PROGRESS → COMPLETED (**the stock transaction**) |
| `POST` | `/manufacturing-orders/:id/cancel` | → CANCELLED |

**Exit criteria (non-negotiable — this is the definition of done for the entire effort):**

1. Create an MO for 10 juicers.
2. Note component stock levels before.
3. Start → complete it via **real HTTP** (not a unit test).
4. Component stock **decreased by exactly the BOM quantity × 10**.
5. Finished-goods stock **increased by exactly 10**.
6. An `InventoryMovement` row exists for **every** stock-tracked line, referencing the MO number.
7. `unitCostSnapshot` is populated and matches the BOM total at that moment.
8. Change a part's price afterwards → **the completed MO's snapshot does not move.**
9. `npm run build` → **0 errors.** No `@ts-nocheck` anywhere.

---

## PHASE 3 — Cost accounting & GL integration  *(1.5 weeks)*

Now that a production event exists and has a frozen cost, it can hit the books.

- Post the completion to the GL: **Dr. Finished Goods Inventory / Cr. Raw Materials Inventory**
  (using the existing `GLPosting` / `JournalEntry` models).
- Labor absorption: `AssemblyPart` rows with `productId = null` (like "Labor") already carry a cost.
  Roll them into `unitCostSnapshot` — they are already handled by the design in 2.1.
- Overhead allocation: a configurable rate per unit (rent, electricity) added to the snapshot.
- **Variance report:** planned BOM cost vs. actual snapshot cost. *"We planned ₨1,200/unit, actual
  was ₨1,250 — the motor batch cost more."*
- True gross margin per manufactured product, now that COGS is real.

**Dependency:** requires the `unitCostSnapshot` from Phase 2. Cannot start earlier.

---

## PHASE 4 — Traceability & quality  *(2 weeks)*

Everything here is a **field or a table hanging off `ManufacturingOrder`**. All of it is impossible
before Phase 2.

- **Batch/lot tracking.** Add `batchNumber` to `PurchaseOrderReceipt` and to
  `ManufacturingOrderLine`. Now a defective juicer traces back to the exact vendor batch of motors.
- **Scrap & yield.** `quantityScrapped` already exists on the model from Phase 2. Report on it:
  which product, which stage, which component, what did the waste cost.
- **QC pass/fail records** at completion, with a reason code on failure.
- **Vendor defect scorecard.** Join scrap reasons → component → `PurchaseOrderReceipt` batch →
  vendor. *"Vendor X batch MOT-2026-001 has a 5% defect rate vs. 0.8% normal — request credit."*
  You already store price trends in `ProductVendor`; this completes the scorecard with a quality axis.
- **Recall path.** Customer complains 6 months later → find the MO → find the batch → find every
  other unit from that batch → find which invoices they went out on → find those customers.
- Also here: widen `AssemblyFamily` beyond `JUICER | BLENDER` (Finding A6).

---

## PHASE 5 — Demand-driven production  *(2 weeks)*

- Sales forecast → suggested manufacturing orders (*"July needs 150 juicers; start an MO by June 15"*).
- Auto-PO for components, driven by the **production plan**, not just by `minimum_quantity`. This is
  the auto-PO idea from `FOUNDATIONS.md`, but finally with real demand behind it.
- Component shortage alerts *before* an MO is scheduled to start, not when it is already blocked.
- Shop-floor view: what is in progress, what is blocked and why.

---

# PART D — STEP-BY-STEP PROCEDURE (Phases 0–2)

Follow **`CLAUDE.md` § "Sequence for writing or changing any function that touches Prisma"** at every
step. Reproduced here in operational form.

### Before writing a single line of code

```bash
# 1. Read the REAL field names. Do not guess. Do not infer from a sibling model.
grep -n "^model Product {"            -A 40 prisma/schema.prisma
grep -n "^model Inventory {"          -A 22 prisma/schema.prisma
grep -n "^model AssemblyPart {"       -A 18 prisma/schema.prisma
grep -n "^model InventoryMovement {"  -A 18 prisma/schema.prisma

# 2. Check current type-safety debt
npm run check:hidden-errors
```

Remember: `id`, `organizationId`, `createdAt`, `updatedAt`, `isActive` are camelCase on **every**
model — including the snake_case ones. **Seeing them proves nothing about the model's convention.**
This exact mistake produced ~20 production bugs in one day.

### Phase 0 — procedure

1. Read `inventory-operations.service.ts` `stockIn`/`stockOut` fully. Note the exact signature.
2. In `purchase-orders.service.ts` `confirmReceipt()`: replace the direct `tx.inventory.update({ physical_on_hand: ... })`
   calls with `InventoryOperationsService.stockIn(...)`, passing the PO number as `reference`.
3. Same in `warehouse-transfers.service.ts` `confirmReceipt()` — `stockOut` from source, `stockIn` to destination.
4. Inject `InventoryOperationsService` into both modules' providers.
5. `npm run build` → 0 errors. `npm run lint`.
6. **Live test over HTTP:** receive a real PO. Query `InventoryMovement`. A row must exist.
7. Repeat for a warehouse transfer.

### Phase 1 — procedure

1. Add `ProductType` enum + `Product.productType` (default `FINISHED_GOOD`) to `schema.prisma`.
2. Add `AssemblyPart.productId` (**nullable**) + relation.
3. `npx prisma migrate dev --name add_product_type_and_assembly_part_link`
4. `npx prisma generate` — **before** writing any code against the new fields.
5. Build the mapping review screen (backend endpoint + frontend). Suggest matches, **user confirms
   each**. Never auto-apply.
6. Run the mapping. Produce a report of unmapped parts. Explicitly mark cost-only parts (Labor).
7. Set `productType` on all products with a formula → `ASSEMBLED_GOOD`; all mapped parts → `RAW_MATERIAL`.
8. `npm run build` → 0 errors.

### Phase 2 — procedure

1. Add `ManufacturingOrder`, `ManufacturingOrderLine`, `ManufacturingOrderStatus`, and the two new
   `InventoryMovementType` values to `schema.prisma`. **All new fields camelCase.**
2. Add the back-relations on `Organization`, `Product`, `Warehouse`, `AssemblyFormula`, `AssemblyPart`.
   (Prisma will refuse to generate without them.)
3. `npx prisma migrate dev --name add_manufacturing_orders`
4. `npx prisma generate`
5. Scaffold `src/modules/manufacturing-orders/` mirroring `warehouse-transfers/`.
6. Implement `create()` → DRAFT. Explode the formula into `ManufacturingOrderLine` rows
   (`quantityRequired = formulaLine.quantity × quantityPlanned`).
7. Implement `checkMaterialAvailability()`. **Assert `Number.isFinite()` before every comparison.**
8. Implement `start()` — guard `status === DRAFT`, run availability check, → `IN_PROGRESS`.
9. Implement `complete()` — **the core transaction from §2.3.** Guard `status === IN_PROGRESS`.
10. Implement `cancel()`.
11. Controller + DTOs (camelCase) + register the module in `app.module.ts`. Apply the permission guard.
12. `npm run build` → 0 errors. `npm run lint`.
13. **Run the full Exit Criteria checklist from §2.6 over real HTTP.** A clean compile does not prove
    correctness — the worst bug in this codebase's history compiled perfectly.

---

# PART E — RECOMMENDATIONS

## E1. What to do

1. **Do Phase 0 immediately, regardless of whether manufacturing ever gets built.** Your PO receipts
   and warehouse transfers are moving stock without leaving an audit record. That is a standalone
   defect in a live system.

2. **Treat Phase 2 as the deliverable.** Phases 0 and 1 are prerequisites; Phases 3–5 are upside.
   If you build nothing else this quarter, `ManufacturingOrder` is the one that stops your inventory
   from lying.

3. **Never auto-map BOM parts to products.** You already learned this lesson once with
   parts-vs-genuine-sales. The names do not match, and a silent mis-map corrupts stock permanently.
   User confirmation, every time.

4. **Preserve the derived-cost design.** Live BOM cost for planning; frozen snapshot for completed
   orders. Do not "simplify" by storing one figure — you will either break instant re-pricing or
   silently rewrite history.

5. **Test over real HTTP, with real stock, deliberately short.** The insufficient-stock check is
   exactly the kind of code that passes `tsc`, passes lint, and silently does nothing.

## E2. What NOT to do (explicit non-goals)

- **Do not build QC records, batch traceability, vendor scorecards, labor tracking, a shop-floor
  mobile app, or predictive maintenance before Phase 2.** All of them are reports and fields on top
  of a document that does not exist yet. Building them first is putting a roof on a house with no
  walls. (An earlier draft of this advice proposed exactly that. It was wrong.)
- **Do not build a separate approval-workflow engine.** This codebase does approval through status
  fields guarded at method entry. Match it.
- **Do not widen `AssemblyFamily` yet.** It is a real limitation, but changing it now churns the
  parser and import services for zero immediate gain. Phase 4.
- **Do not write `// @ts-nocheck`.** CI fails on it, and it is how ~20 naming bugs hid in plain sight.

## E3. Timeline

| Phase | Duration | Cumulative | Outcome |
|---|---|---|---|
| 0 — Audit trail | 3–5 days | ~1 week | Every stock change leaves a trace |
| 1 — Classify & link | 1 week | ~2 weeks | BOM references real, stockable products |
| 2 — **The document** | 2 weeks | **~4 weeks** | **Inventory stops lying. Assembly is real.** |
| 3 — Costing & GL | 1.5 weeks | ~5.5 weeks | True COGS, true margins, variance analysis |
| 4 — Traceability & QC | 2 weeks | ~7.5 weeks | Batch trace, scrap, vendor quality scorecard |
| 5 — Demand-driven | 2 weeks | ~9.5 weeks | Production follows forecast; auto-PO with real demand |

**~4 weeks to the thing that matters. ~10 weeks to the full vision.**

---

## Appendix — verified source references

| Claim | Evidence |
|---|---|
| BOM cost is derived, not stored | `src/modules/assembly-formulas/services/assembly-formulas.service.ts:88-111` |
| `AssemblyPart` has no `productId` | `prisma/schema.prisma:1606-1622` |
| `Product` has no type field | `prisma/schema.prisma:498-536` |
| `AssemblyFamily` = JUICER \| BLENDER only | `prisma/schema.prisma:1594-1597` |
| PO receipt writes no `InventoryMovement` | `src/modules/purchase-orders/services/purchase-orders.service.ts:267,275` — grep for `inventoryMovement` returns nothing |
| Transfer writes no `InventoryMovement` | `src/modules/warehouse-transfers/services/warehouse-transfers.service.ts:310,325,349` — grep returns nothing |
| Correct stock pattern exists | `src/modules/inventory/services/inventory-operations.service.ts:85` (`stockIn`), `:160` (`stockOut`) |
| Transaction wrapper | `src/common/services/transaction.service.ts` |
| Status-progression convention | `prisma/schema.prisma:958-979` (`TransferStatus`, `PurchaseOrderStatus`) |
| Movement types | `prisma/schema.prisma:987-996` (`InventoryMovementType`) |

---

**Nothing in this document has been implemented.** It is an audit and a proposal, awaiting your
approval before any code is written.
