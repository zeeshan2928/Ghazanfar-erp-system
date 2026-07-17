# Ghazanfar ERP — Founding Vision (English)

**This is a faithful English rendering of the original founding document
(`help/FOUNDATIONS.md`), which was written mostly in Roman-Urdu.** Every point is
preserved, in the original order. The raw original is unchanged at `help/FOUNDATIONS.md`.
For build-status against each point, see `help/PRODUCT_AUDIT.md`.

---

## 0. Development discipline
- The recurring problem: while testing one function (e.g. a bill), we remove some
  logic — that one gets fixed, but another function breaks because of it.
- So: bring the code into **one consistent format**, and develop in a **strict order**.
  Inventory first, then billing. Choose which sections to take to **100% complete**.
- Get the **basic functions** every software must have to **100%** first; advanced
  functions come later.

## 1. Lightweight / offline fundamentals
- Fundamental things should **not be downloaded from the internet again and again** —
  their offline files should live inside the software, very lightweight. When a screen
  loads, the software's engine reads them locally. *(What is this called, and what's the
  better approach?)*

## 2. Roles, permissions & approvals
- How many roles can be defined in an org (min): **admin, manager, accountant, salesman,
  warehouse keeper** — and what permissions per role.
- I want **strict control** over what's happening, with **proper approvals** designed into
  the system. Study other software deeply for this — **especially who can see what in
  reports.**
- **Hard privacy rule:** no one except **me, my brother (co-founder), and my sons** may see
  **profit, expenses (akhrajat), or profit & loss.**

## 3. The Invoice screen (nothing is more important)
- Fields: **customer details, salesman details, dispatch warehouse, discount (fixed & %),
  discount on total bill, delivery charges**, and **payment method (cash/online) in one
  field.**
- **Ctrl+Shift+S** completes the invoice -> prompt: *"print the gate pass?"* -> **Yes**
  prints gate pass; **No** goes to the invoice-printing screen (printer already selected).
- Second method: **Ctrl+S** directly prints the gate passes.
- **A separate gate pass per warehouse** the goods leave from. Two copies each: one with the
  **warehouse** heading, one with the **office** heading.
- Once a gate pass is issued, **no one except admin** can re-issue it or edit the
  invoice/gate pass. If an accountant edits a gate pass/invoice, it goes to **admin for
  approval.**
- If **admin** re-issues a gate pass, it is marked **"duplicate."** (invoice or gate pass).
- If 10 gate passes are to be printed, the system asks before each next one.
- Ideal setup: **gate pass -> thermal printer, invoice -> A5**, but printing on **any paper
  size** must be an option.

## 4. Send any document by WhatsApp / Email
- The gate pass's details should go to that **warehouse's WhatsApp**; a full backend system
  for **WhatsApp + email sending** must exist — and **not just for one function**: **any
  document or screen** must be sendable via WhatsApp/email.
- In the screen, a menu to pick each warehouse's storekeeper (name + number) so they get
  *"take this stock out of your warehouse."*

## 5. Sales orders
- A sales-order function should exist (not top priority, but it should be there). If a sales
  order is approved with the customer, **one button converts it to an invoice.**

## 6. Invoice specifics
- A **non-editable field** with a **unique, serialized transaction number**, like
  **`INV-124-XXXXX`**.
- A field where I can **write the cashbook number** myself.
- **Customer contact number is mandatory** — invoice won't save without it.
- **"Walk-in customer"** is a heading: type a walk-in name -> all walk-ins with that name
  open -> select one; since many walk-ins share a name, **search/identify by contact
  number.**
- The **3 popup screens** I designed earlier are the most important part of this invoice.
- **Two radio buttons: Sales / Return** (Sales by default). Choosing Return + selecting
  customer + the warehouse the returned item goes to -> sets all records.

## 7. HR & Payroll
- Employee needs: **profiles, salary structure, attendance, payroll**; maybe **leave
  management, performance rating, compliance docs** — this needs deep digging.
- Two employee types: **management + sales staff**, and **labour (mazdoor).**
- Sales staff have **commission on some products** -> I need a **whole separate section to
  monitor that commission.** Example: salesman Qurban has a list of 15 products with
  per-product or per-sale commission; a **progress bar** shows how much target he's hit / how
  much remains, monitorable on **desktop & mobile**, and shareable with the staff.
- The software should **intelligently import external reports**, analyze a salesman's
  previous sales **by month**, and **assign new targets.**
- **Labour performance monitoring:** pay is cut for leave; **no-leave bonus**, **on-time
  bonus**, **extra bonus for arriving early / penalty logic.**
- **Accountant monitoring** system too. **All of this admin-only** — define roles & rules
  later.

## 8. Performance at scale (very important)
- After 3-4 months data grows and the software slows; after 1-2 years reports load very
  slowly, and full detailed transaction checks are worse.
- I want reports to **never** get sluggish no matter how much time passes. The engine should
  read **only the specific segment**, not search the whole database.
- Idea: save data in **date-wise folders by head** (purchasing, sales, etc.); the engine
  searches only the relevant folder for a given period. I'm not an expert — **give me a
  better approach.** And how to **purge** data after a year.

## 9. Backup & restore
- Backup **every 30 minutes** to **local disk and multiple cloud services simultaneously.**
  Backup file at **minimum/lightweight size.**

## 10. Security
- From the start, procedures to protect against **hacking & attacks**; how to add
  **encryption/decryption.** Define **which phases** to add all this in, and refine the ideas.

## 11. Universal search bar (top-right)
- A complete search bar to find any transaction across heads, with **filters/sort.**
- **Partial, out-of-order matching:** "Makki Crockery Lala Mausa" should be found by
  **`mak mus`**; "176 Panasonic Juicer 7025 Copper" by **`pana 70`**. Refine this and add
  best practices.

## 12. Salesman commission (dedicated)
- A dedicated place: enter salesman name, select the products he gets commission on, enter
  **% or per-product** commission, and at any time **calculate his target & commission** with
  a progress bar per product. Commission paid should **deduct from the right account head**,
  and **P&L reflects it.**

## 13. Auto Purchase Order
- Product creation has a **minimum quantity** field; when stock drops below it -> **dashboard
  notification**; all such products collect in one place with **auto-generate or
  manual-generate** options.
- If a product comes from **multiple vendors**, choose the vendor. Press create -> PO is
  generated, receipts printable.
- **Vendor's invoice is created only when goods are received** (partial receipts monitored —
  how much came, how much remains).

## 14. Manufacturing
- A separate manufacturing portion: combine **parts from different vendors** via a
  **formula** -> a product is made -> **parts subtract from inventory, finished product
  adds**, all records update accordingly.
- Give me an **out-of-the-box best-practice approach** — my suggestion is only a reference.

## 15. Website integration
- **Don't show quantity on the website;** no website bill is made until I **approve.**
  Website order has a **warehouse-selection** field. **Manager can set prices.** Products
  transferable **warehouse-to-warehouse.** Products created in ERP show on website (and vice
  versa). **Separate prices** for physical/wholesale/retail/website.

## 16. Invoice dropdown popups (the 3 popups)
- Scrolling a product in the invoice dropdown instantly opens a popup showing **warehouse +
  quantity** (select warehouse from popup or a field).
- 2nd popup: that product's **sale history for the selected customer** (last 10 transactions
  with date/price/bill number).
- 3rd popup: that product's **last 5 purchases** with **vendor names, purchase bill number,
  date.**

## 17. Universal UI functions (do before building, to avoid big rewrites later)
- Sorting, filtering, **next/previous bill**, shortcuts.
- **Click a field in a report to open it** (click bill number -> that bill opens; vendor name
  -> that vendor opens...).
- **Click-to-edit** any field (double-click a customer name in a report -> edit it, and the
  whole database updates accordingly). Think long about what else to add here upfront.

## 18. Bulk Excel import
- Import data from any file (Excel) for: **users, vendors, opening balances, salesmen,
  warehouses, previous transactions, inventory items + opening balances, account heads,
  account tables, general entries**, etc.

## 19. Vendor scorecard
- **Price trend per product over time** (data already in ProductVendor/PurchaseOrderReceipt),
  best-price highlighting, **auto reorder suggestions (auto-PO)**, printable transfer slip.

## 20. Accounting heads — built vs missing (your own status notes)
- **AR (Customers):** Built — Customer list/history, Aged Receivables. Missing — Cash Receipts
  Journal, Sales Journal, Invoice Register, Items Sold, Sales Taxes report.
- **AP (Vendors):** Built — Vendor list/ledgers, Aged Payables, PO Register, Items Purchased.
  Missing — Cash Disbursements Journal, Cash Requirements, Check Register (no cheque module).
- **General Ledger:** Built — Chart of Accounts, General Journal, Budget Variance. Missing —
  per-account GL detail, GL Trial Balance, Cash Account Register, Working Trial Balance.
- **Financial statements:** Built — Balance Sheet, Income Statement. Missing — Cash Flow,
  Retained Earnings, Statement of Changes, multi-period variants.
- **Inventory:** Built — Item/Master list, Reorder Worksheet. Missing — Inventory Valuation,
  Stock Status detail, COGS Journal, Physical count sheet.
- **Account reconciliation:** entirely missing (no bank-account model).

## 21. Speed demand (stated at the very start)
- The server must handle **thousands of products and millions of transactions over 1-2 years
  without slowing down**, with **reports loading instantly.** Does the structure we built
  react that fast — and what's needed to make it lightning-fast?
