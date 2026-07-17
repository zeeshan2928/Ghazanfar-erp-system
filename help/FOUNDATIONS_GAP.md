# Founding Vision -> Build Status (Gap List)

**Date:** 2026-07-17. Maps each of the 21 points in `FOUNDATIONS_EN.md` to its real
build status. Legend: ✅ done · 🟡 partial · 🔴 missing/stub. Companion to
`PRODUCT_AUDIT.md`.

| # | Founding point | Status | What exists / what's missing |
|---|---|---|---|
| 0 | Dev discipline (one format, basics 100% first) | 🟡 | Backend clean & naming-disciplined; frontend has 215 type errors, several phases stubbed |
| 1 | Lightweight / offline engine files | 🟡 | Offline hooks + mobile SQLite scaffolded (~65%); type errors; not a polished engine |
| 2 | Roles, permissions, approvals, profit privacy | 🟡 | Roles + action-permissions + canViewFinancials profit-hiding work; advanced field-level permissions & approval chains missing/stub |
| 3 | Invoice screen (fields, Ctrl+Shift+S, gate-pass prompt) | 🟡 | Core form built; gate-pass duplicate-marking & print-prompts still open |
| 4 | WhatsApp / Email sending (any document) | 🔴 | Email module is a stub (no models); WhatsApp not built |
| 5 | Sales orders -> convert to invoice | 🟡 | Module exists; one-click convert-to-invoice needs verification |
| 6 | Invoice specifics (INV-124 #, mandatory phone, walk-in, 3 popups, Sales/Return) | 🟡 | Numbering, phone, walk-in, 3 popups done; Sales/Return toggle & cashbook-number field open |
| 7 | HR / Payroll / Labour / Accountant monitoring | 🔴 | Labour/attendance/bonus/accountant = stub (no models); commission partial (see #12) |
| 8 | Performance at scale (segment reads, date folders, purge) | 🔴 | Not built (Phase 6) |
| 9 | Backup every 30 min (local + multi-cloud) | 🔴 | Not built (Phase 7) |
| 10 | Security / encryption | 🔴 | Not built (Phase 8); production is HTTP not HTTPS |
| 11 | Universal search (partial, out-of-order) | ✅ | Done — 16-operator search + "every word matches, any order" |
| 12 | Salesman commission (per-product %, target/progress, deduct->P&L) | 🟡 | Models + dashboard exist (dashboard has 11 type errors); account-deduction / P&L link unverified |
| 13 | Auto-PO (min-qty -> notify -> one-click PO, partial receipts) | 🟡 | Auto-gen, min-qty, phased receipts work; "vendor invoice only on receipt" missing (no VendorInvoice model) |
| 14 | Manufacturing (parts -> formula -> product, stock updates) | ✅ | Done & live-tested (Phases 0-4); only demand-driven (Phase 5) remains |
| 15 | Website integration (approval-gated, warehouse pick, per-channel prices) | 🟡 | Website-orders + approval + per-channel pricing + transfers exist; full 2-way sync unverified |
| 16 | Invoice 3 popups (stock-by-warehouse, customer history, vendor history) | ✅ | Done & verified live |
| 17 | Universal UI (sort, filter, next/prev, shortcuts, click-to-open, click-to-edit) | 🟡 | Sort/filter/search done; click-field-to-open & click-to-edit inconsistent across screens |
| 18 | Bulk Excel import (users, vendors, opening balances, inventory, accounts) | 🟡 | Products/bills/POs/customers/vendors importable (products verified in prod); opening balances, inventory, account heads, general entries NOT |
| 19 | Vendor scorecard (price trends, best price, reorder) | 🟡 | Data exists + defect scorecard built; price-trend scorecard UI not confirmed |
| 20 | Accounting heads (AR/AP/GL/statements/inventory/reconciliation) | 🟡 | Chart, journal, trial balance, balance sheet, income statement, AR/AP aging, budget built; cash journals, check register, GL detail, cash-flow, valuation, bank reconciliation missing |
| 21 | Speed at scale (millions of txns, instant reports) | 🟡 | Structure reasonable but unproven; scale strategy from #8 not built; no real data yet to test |

## Tally
- **Done: 3** — universal search (11), manufacturing (14), invoice 3 popups (16)
- **Partial: 13** — most of the core (invoice, permissions/privacy, commission, auto-PO, website, accounting, UI universals, imports, offline, scale)
- **Missing/stub: 6** — WhatsApp/Email (4), HR/Labour/Accountant (7), performance-at-scale (8), backup (9), security (10), + vendor-invoice-on-receipt inside (13)

## Gaps to close (highest value first)
1. Finish the near-done partials — Sales/Return toggle, click-to-open/edit, vendor-invoice-on-receipt, commission->P&L link.
2. Data & imports (#18) — opening balances + inventory import = the operational unblocker.
3. Owner-priority missing items — HR/labour/accountant monitoring (#7), WhatsApp/email (#4).
4. Production hardening (#9, #10) — backups + HTTPS.
5. Performance-at-scale (#8/#21) — design archival/segmenting before data grows.
