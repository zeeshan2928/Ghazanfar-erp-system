# Founding Vision -> Build Status (Gap List)

**Date:** 2026-07-17, updated 2026-07-21. Maps each of the 21 points in
`FOUNDATIONS_EN.md` to its real build status. Legend: ✅ done · 🟡 partial ·
🔴 missing/stub. Companion to `PRODUCT_AUDIT.md`. This is the single
authoritative status doc for the project — see "Docs cleanup" below.

| # | Founding point | Status | What exists / what's missing |
|---|---|---|---|
| 0 | Dev discipline (one format, basics 100% first) | 🟡 | Backend clean & naming-disciplined; frontend has 215 type errors, several phases stubbed |
| 1 | Lightweight / offline engine files | 🟡 | Offline hooks + mobile SQLite scaffolded (~65%); type errors; not a polished engine |
| 2 | Roles, permissions, approvals, profit privacy | 🟡 | Roles + action-permissions + canViewFinancials profit-hiding work; advanced field-level permissions & approval chains missing/stub |
| 3 | Invoice screen (fields, Ctrl+Shift+S, gate-pass prompt) | 🟡 | Core form built; gate-pass duplicate-marking & print-prompts still open |
| 4 | WhatsApp / Email sending (any document) | 🔴 | Email module is a stub (no models); WhatsApp not built |
| 5 | Sales orders -> convert to invoice | 🟡 | Module exists; one-click convert-to-invoice needs verification |
| 6 | Invoice specifics (INV-124 #, mandatory phone, walk-in, 3 popups, Sales/Return) | ✅ | Numbering, phone, walk-in, 3 popups done; **Sales/Return is fully built** (radio toggle + Return-to-Warehouse field + backend stock-back-in via `applyReturnStock`) — earlier "open" note was stale |
| 7 | HR / Payroll / Labour / Accountant monitoring | 🔴 | Labour/attendance/bonus/accountant = stub (no models); commission partial (see #12) |
| 8 | Performance at scale (segment reads, date folders, purge) | 🔴 | Not built (Phase 6) |
| 9 | Backup every 30 min (local + multi-cloud) | 🔴 | Not built (Phase 7) |
| 10 | Security / encryption | 🔴 | Not built (Phase 8); production is HTTP not HTTPS |
| 11 | Universal search (partial, out-of-order) | ✅ | Done — 16-operator search + "every word matches, any order" |
| 12 | Salesman commission (per-product %, target/progress, deduct->P&L) | 🟡→✅ | **P&L link now built & live-verified (15/15):** marking a commission paid posts Dr Commission Expense / Cr Cash to the ledger (expense account auto-created). Also fixed a pre-existing bug where the commission DTOs had no validators (create/calculate silently failed). Dashboard UI polish (11 type errors) still pending. |
| 13 | Auto-PO (min-qty -> notify -> one-click PO, partial receipts) | ✅ | Auto-gen, min-qty, phased receipts work; **"vendor invoice only on receipt" is met** — AP aging books a vendor payable only against received quantity (unreceived PO = zero payable) |
| 14 | Manufacturing (parts -> formula -> product, stock updates) | ✅ | Done & live-tested (Phases 0-4); only demand-driven (Phase 5) remains |
| 15 | Website integration (approval-gated, warehouse pick, per-channel prices) | 🟡 | Website-orders + approval + per-channel pricing + transfers exist; full 2-way sync unverified |
| 16 | Invoice 3 popups (stock-by-warehouse, customer history, vendor history) | ✅ | Done & verified live |
| 17 | Universal UI (sort, filter, next/prev, shortcuts, click-to-open, click-to-edit) | 🟡 | Sort/filter/search done; click-to-**edit** on master screens done; **click-to-open added on Purchase Orders + Customers lists** (row opens a detail modal); still to extend to more report screens |
| 18 | Bulk Excel import (users, vendors, opening balances, inventory, accounts) | 🟡 | Products/bills/POs/customers/vendors importable (products verified in prod); opening balances, inventory, account heads, general entries NOT |
| 19 | Vendor scorecard (price trends, best price, reorder) | 🟡 | Data exists + defect scorecard built; price-trend scorecard UI not confirmed |
| 20 | Accounting heads (AR/AP/GL/statements/inventory/reconciliation) | 🟡 | Chart, journal, trial balance, balance sheet, income statement, AR/AP aging, budget built; cash journals, check register, GL detail, cash-flow, valuation, bank reconciliation missing |
| 21 | Speed at scale (millions of txns, instant reports) | 🟡 | Structure reasonable but unproven; scale strategy from #8 not built; no real data yet to test |

## Tally (updated 2026-07-17 after the "near-done partials" pass)
- **Done: 5** — invoice specifics incl. Sales/Return (6), universal search (11), auto-PO incl. payable-on-receipt (13), manufacturing (14), invoice 3 popups (16); commission P&L (12) now posts to the ledger (dashboard UI polish aside)
- **Partial: 11** — permissions/privacy, website, accounting, UI universals (click-to-open now on 2 more screens), imports, offline, scale, etc.
- **Missing/stub: 5** — WhatsApp/Email (4), HR/Labour/Accountant (7), performance-at-scale (8), backup (9), security (10)

## Gaps to close (highest value first)
1. Finish the near-done partials — Sales/Return toggle, click-to-open/edit, vendor-invoice-on-receipt, commission->P&L link.
2. Data & imports (#18) — opening balances + inventory import = the operational unblocker.
3. Owner-priority missing items — HR/labour/accountant monitoring (#7), WhatsApp/email (#4).
4. Production hardening (#9, #10) — backups + HTTPS.
5. Performance-at-scale (#8/#21) — design archival/segmenting before data grows.

## Spare-parts / BOM costing issue — action plan (2026-07-21)

**The problem, as the owner described it:** finished products are assembled in
inventory from spare parts via BOM/recipes (#14). One vendor ("Saddam") supplies
some of those parts at Rs 0 recorded cost. Two knock-on effects:
1. **Parts stock isn't being decremented** when a manufacturing order consumes
   them — so the component's on-hand quantity keeps climbing (some parts are now
   reportedly sitting above 5,000 units), which inflates that part's inventory
   valuation on paper even though it was actually used up building finished goods.
2. **Zero-cost parts flow into finished-good cost_price as zero**, so any product
   whose BOM includes a Rs 0 component shows artificially high (near-100%) margin
   — the P&L can't be trusted for those SKUs.
3. A pricing formula was already worked out earlier to derive product price from
   BOM/recipe cost, but it inherits the same zero-cost distortion for any recipe
   touching a Saddam-sourced part.

**Root cause to confirm first (don't fix symptoms before this):** check whether
`ManufacturingOrder` completion is actually calling the stock-deduction path for
BOM components (`BomLine.componentProductId` -> `Inventory.physical_on_hand`
decrement) — Gap #14 says manufacturing is "done & live-tested," so either this
specific vendor's parts are bypassing that path (e.g. entered via an opening-stock
or adjustment flow that skips BOM consumption), or the zero-cost parts are simply
never being run through a `ManufacturingOrder` at all (no MO = no deduction, by
design).

**Plan:**
1. **Audit, don't assume.** Query `Inventory` joined to `Product` where
   `physical_on_hand > 5000`, restricted to components that appear in any
   `BomLine.componentProductId` — this is the concrete "which parts, how much"
   list the owner asked for. **Not run yet** — this machine can only reach the
   local dev DB (`ghazanfar_erp_dev` on `localhost:5432`), whose `Inventory`
   table is empty (the purchase/sales import wrote `PurchaseOrder`/`Bill` history
   directly and never touched `Inventory`). The real >5,000-unit parts live in
   **production**, which is not reachable from here (`.env.production` points at
   host `prod-postgres`, only resolvable from inside the production
   network/server). This step needs to be run *there*, either by someone with
   prod access running the query below, or by giving this session a working
   production connection string.

   Ready-to-run SQL (adjust `organizationId` if not `1`):
   ```sql
   SELECT
     p.id, p.code, p.name, p."productType", p.cost_price,
     i."warehouseId", i.physical_on_hand
   FROM "Inventory" i
   JOIN "Product" p ON p.id = i."productId"
   WHERE i."organizationId" = 1
     AND i.physical_on_hand > 5000
     AND EXISTS (
       SELECT 1 FROM "BomLine" bl WHERE bl."componentProductId" = p.id
     )
   ORDER BY i.physical_on_hand DESC;
   ```
   Export the result (CSV or pasted output) — that becomes the concrete
   "which parts, how much" list steps 2-5 below act on.
2. **Fix the Saddam zero-price data**, not the code, first: find every
   `ProductVendor` row (or `Vendor.name = 'Saddam...'`) with `unit_price = 0` and
   correct it to a real cost — Rs 0 cost is the actual source of the 100%-margin
   illusion, and no formula change can fix a bad input price.
3. **Verify BOM consumption is wired for these specific parts**: pick 2-3 of the
   >5,000-stock parts, run one real `ManufacturingOrder` that consumes them, and
   confirm `Inventory.physical_on_hand` actually drops by the BOM quantity. If it
   doesn't, that's the bug to fix (not a data problem).
4. **Re-run the price-from-BOM formula** only after steps 2-3 are fixed, so
   finished-good cost/price and margin reports stop being distorted by Rs 0 inputs.
5. **Decide what to do with the existing >5,000-stock balances**: once real cost
   is known, either (a) run a stock adjustment/write-down to the true consumed
   quantity if it's confirmed the parts were used but never deducted, or (b) leave
   the balance if it's genuinely on-hand (e.g. bulk opening stock not yet used) —
   this decision needs the audit from step 1 before it can be made correctly.

**Status:** 🔴 not started — planning only, captured here per owner request before
resuming the sales import work.

## Numbered-phase status (2026-07-21 audit)

Historical docs used "Phase N" for at least three unrelated numbering schemes
(early build-out 1-5, mobile/i18n/websocket/labour 9-12, and three different,
mutually contradictory "roadmap 6-10" lists). This table is the reconciled,
code-verified status — treat it as canonical over any older phase doc.

| Phase | Status | Remaining work |
|---|---|---|
| 1-2 (Core CRUD, compilation) | ✅ Done | none found |
| 3 (Purchase Order automation) | ✅ Done | none — matches #13 above |
| 4 (Screen search) | ✅ Done | none — matches #11 above |
| 5 (DB scale / schema) | 🟡 Partial | Vendor Branch system, system-generated IDs (V-00001 style), credit-term rules — proposed in `VENDOR_BRANCH_ARCHITECTURE.md`, not in schema (`grep`-confirmed: no `VendorBranch`/`parentVendorId`) |
| 5 (Manufacturing demand-driven) | 🔴 Not started | MRP/demand-driven planning not in code; **plus the BOM zero-cost/stock-deduction audit above — highest-priority open item** |
| 6 (Performance at scale) | 🔴 Mostly missing | Segmented reads, archival/partitioning, purge policy, load testing (`20260719103000_high_performance_indexes` migration landed some indexing since this doc was first written, but the broader design is still open) |
| 7 (Backup, 30-min/multi-cloud) | 🔴 Not built | No backup job/schedule/cloud target/restore test found anywhere in `src/` |
| 8 (Security/encryption) | 🔴 Not built | Production still HTTP not HTTPS; no encryption at rest/in transit; `SECURITY_CHECKLIST.md` is the live to-do list for this |
| 9 (Mobile: maps/biometric/voice) | 🟡 Foundation only | UI screens, sync manager, integration tests, perf validation all pending |
| 10 (Real-time backend / mobile API) | 🟡 Foundation only | Push notifications, conflict-resolution UI, integration tests |
| 11 (i18n) | 🟡 Foundation only | 5 of 7 languages incomplete (only en/ur solid), RTL only tested for Urdu, not wired into all screens |
| 12 (Labour/Accountant monitoring) | 🔴 Stub | **Schema-confirmed: no `Labour`/`Attendance`/`Bonus` models exist.** Backend controllers exist under `src/modules/labour/` but have nothing to persist to; frontend dashboards and mobile screens not built |
| Gate Pass / warehouse fulfillment | ✅ Better than old docs claimed | `src/modules/gate-passes/` (controller/service/DTOs) confirmed built — an older doc claiming "0% built" was stale and has been deleted (see cleanup below) |

## Docs cleanup (2026-07-21)

Audited all 70 files in `help/` against actual code (`src/modules/*`,
`prisma/schema.prisma`) and git history. Deleted 39 files that were stale status
snapshots superseded by this doc + `PRODUCT_AUDIT.md`, or exact-duplicate-purpose
docs (e.g. three separate "test suite delivery" reports, four separate "Phase 2
complete" reports). Kept 31: this doc, `PRODUCT_AUDIT.md`, the founding-vision
source docs, evergreen reference/how-to guides (deployment, Docker, CI/CD,
security checklist, API references, testing guide), and open architecture
proposals for features not yet built (`VENDOR_BRANCH_ARCHITECTURE.md`,
`MANUFACTURING_AUDIT_AND_PLAN.md`, `MANUFACTURING_ARCHITECTURE_AND_PERFORMANCE.md`
— note: the latter two describe manufacturing as unbuilt; `boms`/
`manufacturing-orders` modules have since landed, so read them as historical
design rationale, not current status).

Full delete list (all confirmed superseded, not merely old):
`WHATS_LEFT_BEHIND.md`, `MISSING_ITEMS_CHECKLIST.md`,
`COMPREHENSIVE_STATUS_REVIEW.md`, `BACKEND_STATUS.md`,
`TIER1_CRITICAL_IMPLEMENTATION.md`, `MIGRATION_STATUS.md`,
`peachtree account reporting system.md.txt`, `PHASE2_COMPILATION_COMPLETE.md`,
`PHASE2_PARALLEL_DEVELOPMENT_CHECKPOINT.md`, `PHASE_2_IMPLEMENTATION_COMPLETE.md`,
`FEATURES_SUMMARY.md`, `QUICK_REFERENCE.md`, `IMPLEMENTATION_SUMMARY.md`,
`DATA_IMPORT_STRATEGY.md`, `DATA_IMPORT_SUMMARY.md`, `IMPLEMENTATION_COMPLETE.md`,
`IMPORT_COMPLETE_WORKFLOW.md`, `PHASE5_COMPLETE_SUMMARY.md`,
`PHASE5_EXECUTION_PLAN.md`, `PHASE3_SUMMARY.md`, `PHASE4_SEARCH_IMPLEMENTATION.md`,
`PHASE4_SUMMARY.md`, `TESTING_CHECKLIST.md`, `TEST_RESULTS.md`,
`DEPLOYMENT_GUIDE.md`, `TESTING_SUITE_DELIVERY.md`, `TEST_IMPLEMENTATION_INDEX.md`,
`TEST_SUITE_SUMMARY.md`, `PHASES_9_10_11_IMPLEMENTATION.md`,
`PHASES_9_10_11_STATUS.md`, `COMPLETE_SYSTEM_IMPLEMENTATION_SUMMARY.md`,
`PHASE_12_IMPLEMENTATION_READY.md`, `PHASE_12_LABOUR_ACCOUNTANT_SYSTEM.md`,
`QUICK_START_PHASES_9_12.md`, `SCREENS_IMPLEMENTATION_SUMMARY.md`,
`SCREENS_INTEGRATION_CHECKLIST.md`, `DEVOPS_README.md`,
`DEVOPS_SETUP_SUMMARY.md`, `FEATURES.md`. All deleted via `git rm`, fully
recoverable from git history if any turn out to still be needed.

**Known follow-up, not yet done:** `help/00_START_HERE.md` references files that
don't exist in this repo at all (`SYSTEMATIC_DEVELOPMENT_ROADMAP.md`,
`PHASE1_DETAILED_ACTION_PLAN.md`, `DATABASE_SCHEMA_ASSESSMENT.md`) — it appears
to be an orphaned index from an even earlier planning stage. Also out of scope
for this pass: the ~25 planning `.md` files sitting at the **repo root**
(`PROJECT_STATUS_COMPREHENSIVE.md`, `CASH_BOOK_*.md`, etc.) were not audited —
this cleanup covered `help/` only.
