# Ghazanfar ERP Backend - Development Guide

## Naming Convention (CRITICAL)

**Full rulebook:** `help/PRISMA_FIELD_NAMING_RULEBOOK.md` — mandatory reading
before writing any service code that touches Prisma. The summary below is not
a substitute; read the full document for the naming-error recovery process,
the pre-write checklist, and the top-10 mistake patterns.

### The one rule that matters

**There is no automatic camelCase conversion in this project.** Zero `@map`/`@@map` directives exist in `prisma/schema.prisma`. Whatever case is literally typed in the schema is exactly what the Prisma Client uses at runtime for reads and writes — no exceptions, no magic.

This schema mixes two conventions **per model**, not globally:

- **Legacy/core transactional models — snake_case field names**: `Bill`, `BillLine`, `GatePass`, `GatePassItem`, `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseOrderReceipt`, `Vendor`, `ProductVendor`, `PurchaseHistory`, `WarehouseTransfer`, `Product` (partially), `Inventory` (partially), `WebsiteOrder`, `Tax`.
- **Newer models — genuinely camelCase field names**: `Customer`, `ChartOfAccount`, `JournalEntry`, `GLPosting`, `Budget`, `ProductCategory`, `CashBookEntry`, `CashBookMatch`, `CommissionRule`, `CommissionCalculation`, `ProductCommission`, `InventoryLevel`, `InventoryTransfer` (a *different* model from `WarehouseTransfer`).

The dangerous part: boilerplate fields (`id`, `organizationId`, `createdAt`, `updatedAt`, `isActive`) are camelCase on **every** model, including the snake_case ones. Checking one or two fields and concluding "this model is camelCase" is exactly how ~20 production bugs got written in a single day (bill creation, PO creation, vendor creation, warehouse transfer creation, and more were all completely broken by this before a 2026-07-06 audit fixed them).

### The only reliable process

Before writing any code that touches a Prisma model for the first time in a session:

```bash
grep -n "^model <ModelName> {" -A 30 prisma/schema.prisma
```

Read the literal field list. Do not assume based on:
- What a sibling model does
- What this document used to say (an earlier version of this file incorrectly claimed universal auto-conversion — that caused the bugs referenced above)
- The casing of `id`/`createdAt`/`organizationId` on the same model (those are camelCase everywhere, snake_case or not)

### Never write `// @ts-nocheck` at the top of a service file

Every naming bug found in the 2026-07-06 audit was hidden from `tsc`/`nest build` by a `// @ts-nocheck` comment. Files without it get real compile errors the moment a field name is wrong — that's the actual safety net, not documentation. If a file has `@ts-nocheck` and you're editing it, remove the comment and fix whatever errors surface as part of your change; don't add new code to a file while leaving the flag in place.

Run `npm run check:hidden-errors` to see which `@ts-nocheck` files currently have real errors hiding behind the comment (script: `scripts/check-ts-nocheck-debt.ts`). It never modifies files — it type-checks each one in memory as if the comment weren't there and reports a count per file, plus a list of any files where the comment is doing nothing (zero hidden errors) and can be deleted for free. Use `--full` for the actual error text.

### Layer-by-layer reality (once you know which convention the model uses)

```
Database column (schema.prisma):     whatever was typed there (snake_case or camelCase, model-dependent)
Prisma Client access (TS):           IDENTICAL to the schema.prisma field name - always
DTOs:                                camelCase (this layer is genuinely universal)
API JSON Responses:                  camelCase (this layer is genuinely universal)
Frontend TypeScript:                 camelCase (this layer is genuinely universal)
```

So the "translation" only happens at one specific point: inside the service method, when mapping a raw Prisma result to the DTO/response shape. Example, for a snake_case model like `Bill`:

```typescript
// Reading from Prisma: use the schema's real field name (snake_case for Bill)
const bill = await prisma.bill.findFirst({
  where: { bill_number: 'BILL-2026-000001' },   // real field name
  orderBy: { bill_date: 'desc' },                // real field name
});

// Mapping to an API response: convert to camelCase here, explicitly
return {
  billNumber: bill.bill_number,   // snake_case (Prisma) -> camelCase (API)
  billDate: bill.bill_date,
  totalAmount: bill.total_amount,
};
```

For a genuinely camelCase model like `Customer`, there is no translation step needed — the Prisma field and the API field are the same string.

### Sequence for writing or changing any function that touches Prisma

Follow these steps in order, every time, no exceptions:

1. **Does the model already exist?** `grep -n "^model <Name> {" -A 30 prisma/schema.prisma`. If it doesn't, stop — this is a schema decision (add the model via a real migration, with sign-off) not something to code around. On 2026-07-06, 9 separate features (Notification, AuditLog, EmailTemplate, the entire Labour/HR module, and others) were built by skipping this step, sat completely broken, and nobody noticed because of step 7 below.
2. **Read the literal field list from that grep output.** Don't infer from `id`/`organizationId`/`createdAt` (camelCase on every model regardless of the model's real convention), a sibling model, or memory of "how this project does it" — the schema mixes snake_case and camelCase per-model, not globally.
3. **New model:** use camelCase for every field. That's what every model added after the original legacy batch (Bill, PurchaseOrder, Vendor, GatePass, WarehouseTransfer, ProductVendor, PurchaseHistory, Tax, WebsiteOrder) already does, and it's Prisma's own default with no `@map`.
4. **New field on an existing model:** match whatever convention that specific model already uses. Don't mix styles within one model.
5. **Run `npx prisma generate`** after any schema edit, before writing code against it.
6. **Write the Prisma call using the exact field names from step 2/3/4** - `where`, `data`, `select`, `include`, `orderBy` all need the real names, not guesses.
7. **Never add `// @ts-nocheck`.** CI now fails the build if this comment exists anywhere in `src/`. If TypeScript complains about a field name, the field name is wrong - that's the checker doing its job, not a false positive to silence.
8. **Map to camelCase only at the DTO/API response boundary**, and only if the underlying model isn't already camelCase.
9. **Run `npm run build`.** Must show 0 errors - this is a required CI gate, not optional.
10. **Test the actual endpoint** (curl or equivalent), not just the build. A clean compile does not prove correctness: the most dangerous bug found on 2026-07-06 (`physicalOnHand` typo causing `NaN < quantity` to silently always evaluate `false`, bypassing an insufficient-stock check) was a runtime logic error that a type checker can never catch.

### Verification Steps

After making changes, verify naming consistency:

1. **Build the project**
   ```bash
   npm run build
   ```
   Must show 0 errors. CI also fails if any file has `@ts-nocheck` (see `scripts/check-ts-nocheck-debt.ts` if you ever need to audit a reintroduced instance - `npm run check:hidden-errors -- --full`).

2. **Run linter**
   ```bash
   npm run lint
   ```

3. **Test the affected endpoints** — create/update/query through the real HTTP path, not just unit-level. Several of the 2026-07-06 bugs (e.g. a `NaN < quantity` comparison always evaluating false) didn't crash — they silently corrupted data. A clean build and a clean lint pass do not prove correctness by themselves.

### Related Files

- `.eslintrc.js` - ESLint configuration
- `prisma/schema.prisma` - source of truth for every model's real field names; grep it, don't guess
- `scripts/check-ts-nocheck-debt.ts` - reports hidden type errors in `@ts-nocheck` files without modifying them
- All files in `src/modules/*/dto/` - DTO definitions (camelCase)
- All files in `src/modules/*/services/` - Service implementations (must match each model's real Prisma field names)
- All files in `src/modules/*/controllers/` - API controllers (JSON responses in camelCase)

---

## Project Structure

```
src/
├── modules/
│   ├── bills/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── ...
│   ├── customers/
│   ├── inventory/
│   ├── warehouses/
│   └── ... (other modules)
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── services/
│   └── dto/
├── database/
│   └── prisma.service.ts
└── app.module.ts
```

## Build & Validation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Report hidden type errors in files still marked @ts-nocheck
npm run check:hidden-errors

# Run ESLint
npm run lint

# Run tests
npm test

# Development server
npm run start:dev
```

---

**Last Updated:** 2026-07-06
**Naming Convention Status:** Corrected after a full audit found ~20 production bugs caused by this document's earlier (false) claim that Prisma auto-converts snake_case to camelCase. See the "Naming Convention" section above for what's actually true. 31 service files had `@ts-nocheck` removed and their real errors fixed; 14 files remain flagged — run `npm run check:hidden-errors` to see current status.
