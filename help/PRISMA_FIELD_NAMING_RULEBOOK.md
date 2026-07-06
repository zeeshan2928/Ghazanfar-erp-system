# PRISMA FIELD NAMING RULEBOOK

**Status:** MANDATORY — read before writing any service code that touches Prisma
**Applies to:** `ghazanfar-erp-backend` (all backend modules)
**Created after:** The 273-error incident (mass field-name mismatch caught only at full build)

---

## 0. TL;DR — The One Rule

> **The TypeScript property name is EXACTLY the field name written in `prisma/schema.prisma`. Character for character. No conversion happens. Ever.**

Prisma does **not** convert snake_case to camelCase. It does **not** convert camelCase to snake_case. The generated client copies the schema field name **verbatim**.

**This project's schema mixes both conventions inside the same model.** You cannot guess. You must look.

```prisma
model Bill {
  bill_number    String                      // TS: bill.bill_number   ← snake_case
  createdAt      DateTime  @default(now())   // TS: bill.createdAt     ← camelCase
  salesmanId     Int       @default(1)       // TS: bill.salesmanId    ← camelCase
  created_by     Int                         // TS: bill.created_by    ← snake_case
}
```

All four of those are in the **same model**. Assuming a uniform convention — in *either* direction — is exactly what produced 273 errors.

---

## 1. Core Concept — How Prisma Actually Generates Names

There are **three separate name layers**. Confusing them is the root cause of every naming bug:

| Layer | Where it lives | Who decides the name |
|---|---|---|
| 1. Database column | PostgreSQL table | `@map("col_name")` if present, otherwise the schema field name |
| 2. Prisma schema field | `prisma/schema.prisma` | The developer who wrote the model |
| 3. TypeScript property | Generated client (`node_modules/.prisma/client`) | **Always identical to layer 2** |

Key facts:

1. **Layer 3 = Layer 2, always.** The generated client is a verbatim copy of schema field names.
2. **`@map` only affects Layer 1** (the DB column). It never changes what you type in TypeScript.
3. **This project uses zero `@map` directives.** Therefore all three layers are identical here — the DB column, the schema field, and the TS property are the same string.

### Why do people believe "Prisma generates camelCase"?

Because the *official Prisma convention* is to write camelCase fields in the schema and add `@map("snake_case")` for the DB column:

```prisma
// Prisma's RECOMMENDED style (NOT what this project does):
model Bill {
  billNumber String @map("bill_number")   // DB: bill_number, TS: billNumber
}
```

Tutorials show this pattern, so developers assume Prisma converts automatically. **It does not.** The camelCase came from the schema author, not from Prisma. This project was `db pull`'d / written with raw column names for some fields, so those fields are snake_case in TypeScript too.

### Proof (verified against this repo's generated client)

`node_modules/.prisma/client/index.d.ts` literally contains:

```typescript
bill_number: string   // NOT billNumber — the type that exists
createdAt: Date       // NOT created_at — the type that exists
```

---

## 2. The Rule — How to Know Which Name to Use

```
┌─────────────────────────────────────────────────────────────┐
│  BEFORE typing any field name in a Prisma call:             │
│                                                             │
│  1. Open prisma/schema.prisma                               │
│  2. Find the model. Find the field.                         │
│  3. Copy the field name EXACTLY as written.                 │
│  4. Never type a field name from memory or convention.      │
└─────────────────────────────────────────────────────────────┘
```

Where this applies — **every** place a Prisma name appears:

- `where: { ... }` filters
- `data: { ... }` in create/update/upsert
- `select: { ... }` and `include: { ... }`
- `orderBy: { ... }`
- `groupBy`, `_sum`, `_count` field references
- Reading properties off query results (`bill.bill_number`)
- Relation names (`include: { User_Bill_created_byToUser: true }` — yes, that ugly auto-generated name is the real one)

Where schema names do **not** apply:

- **Raw SQL** (`$queryRaw`, `$executeRaw`, `.sql` files): use the **database column name** (Layer 1). In this project Layer 1 = Layer 2 because there is no `@map`, but if `@map` is ever introduced, raw SQL keeps using the DB name while the client uses the schema name.
- **Frontend DTOs / API contracts**: those are your own design. Map explicitly at the controller/service boundary — never let a DTO shape flow straight into `prisma.x.create({ data: dto })` without checking each field.

---

## 3. Examples — Real Models from This Project

### 3.1 Reading query results

```typescript
const bill = await prisma.bill.findUnique({ where: { id } });

// ✅ CORRECT — copied verbatim from schema.prisma
bill.bill_number        // schema: bill_number
bill.total_amount       // schema: total_amount
bill.createdAt          // schema: createdAt
bill.approvalStatus     // schema: approvalStatus
bill.salesmanId         // schema: salesmanId
bill.created_by         // schema: created_by

// ❌ INCORRECT — these properties DO NOT EXIST (TS2339)
bill.billNumber         // guessed camelCase; schema says bill_number
bill.totalAmount        // guessed camelCase; schema says total_amount
bill.created_at         // guessed snake_case; schema says createdAt
bill.approval_status    // guessed snake_case; schema says approvalStatus
```

### 3.2 Create with nested lines (`Bill` + `BillLine`)

```typescript
// ✅ CORRECT
await prisma.bill.create({
  data: {
    organizationId,                 // camelCase in schema
    bill_number: nextNumber,        // snake_case in schema
    customerId,
    channel,
    created_by: userId,             // snake_case in schema
    subtotal,
    tax_amount: taxAmount,          // snake_case in schema
    total_amount: total,            // snake_case in schema
    lines: {
      create: lines.map((l) => ({
        productId: l.productId,     // camelCase in schema
        warehouseId: l.warehouseId,
        quantity: l.quantity,
        unit_price: l.unit_price,   // snake_case in schema
        line_total: l.quantity * l.unit_price,
      })),
    },
  },
});

// ❌ INCORRECT — every one of these is a compile error
await prisma.bill.create({
  data: {
    organization_id: orgId,   // schema says organizationId
    billNumber: nextNumber,   // schema says bill_number
    createdBy: userId,        // schema says created_by
    taxAmount: tax,           // schema says tax_amount
  },
});
```

### 3.3 Filters, ordering, selecting

```typescript
// ✅ CORRECT
const lastBill = await prisma.bill.findFirst({
  where: { organizationId, bill_number: { startsWith: prefix } },
  orderBy: { bill_number: 'desc' },
  select: { bill_number: true, createdAt: true },
});

// ❌ INCORRECT
orderBy: { billNumber: 'desc' }     // TS2353: Object literal may only specify known properties
where: { created_at: { gte: d } }   // schema says createdAt
```

### 3.4 Relations — never guess relation names

Relation field names are also verbatim from the schema, including auto-generated ones:

```typescript
// Schema (model Bill):
//   User_Bill_created_byToUser  User  @relation("Bill_created_byToUser", ...)
//   customer                    Customer @relation(...)
//   lines                       BillLine[]

// ✅ CORRECT
include: { customer: true, lines: true, User_Bill_created_byToUser: true }

// ❌ INCORRECT
include: { createdByUser: true }   // no such relation — the real name is User_Bill_created_byToUser
include: { billLines: true }       // the relation is named `lines`
```

### 3.5 Use generated types instead of hand-written interfaces

Hand-written interfaces drift from the schema. The generated types can never drift:

```typescript
import { Prisma, Bill } from '@prisma/client';

// ✅ CORRECT — types come from the schema, mismatches are impossible
type BillWithLines = Prisma.BillGetPayload<{ include: { lines: true; customer: true } }>;
function formatBill(bill: BillWithLines) { ... }

const data: Prisma.BillCreateInput = { ... };  // compiler enforces exact field names

// ❌ INCORRECT — hand-rolled twin that silently drifts
interface BillData {
  billNumber: string;   // wrong name, and nothing will catch it until runtime/undefined
  totalAmount: number;
}
```

### 3.6 Raw SQL boundary

```typescript
// Raw SQL uses DATABASE column names (Layer 1).
// In this project they equal schema names, but keep the layers straight:
const rows = await prisma.$queryRaw`
  SELECT bill_number, total_amount, "createdAt"
  FROM "Bill" WHERE "organizationId" = ${orgId}
`;
// Note: Postgres folds unquoted identifiers to lowercase — camelCase columns
// like createdAt MUST be double-quoted in raw SQL.
```

---

## 4. Pre-Write Checklist

Run through this **before** writing any service/repository code:

- [ ] **1. Schema open?** `prisma/schema.prisma` is open in a split pane next to the file you're writing.
- [ ] **2. Field names copied, not typed.** Every field name in `where`/`data`/`select`/`orderBy`/property access is copy-pasted or autocompleted — never typed from memory.
- [ ] **3. Autocomplete confirmed.** You pressed Ctrl+Space inside the object literal and picked from the list. If the IDE doesn't offer the name you expected, **the schema wins, not your expectation.**
- [ ] **4. Generated types used.** Inputs typed as `Prisma.XCreateInput` / `Prisma.XUpdateInput` / `Prisma.XWhereInput`; results typed as model types or `Prisma.XGetPayload<...>`. No hand-written twins, no `any`.
- [ ] **5. Relations verified.** Every `include`/nested-write key checked against the relation field name in the schema (watch for auto-generated names like `User_Bill_created_byToUser`).
- [ ] **6. Client fresh.** If the schema changed, `npx prisma generate` was run before writing code against it.
- [ ] **7. Compile check per file.** `npx tsc --noEmit` after finishing each service file — not after finishing ten files. Catch 3 errors, not 273.

---

## 5. Automation — Catching This Before It Compounds

### 5.1 Incremental type-checking (the single biggest fix)

The 273-error incident happened because type-checking ran once, at the end. Make it continuous:

```jsonc
// package.json — add:
"scripts": {
  "typecheck": "tsc --noEmit",
  "typecheck:watch": "tsc --noEmit --watch"
}
```

- Keep `npm run typecheck:watch` running in a terminal during development. Errors appear the second you save the file that introduced them.
- **Rule: never move to the next file with a nonzero error count** (this is also Rulebook rule "0 errors mandatory" in the Code Development Rulebook).

### 5.2 ESLint — ban the escape hatches

Field-name bugs survive when developers silence the compiler. Forbid the silencers:

```jsonc
// .eslintrc — rules that keep Prisma mismatches loud:
"@typescript-eslint/no-explicit-any": "error",
"@typescript-eslint/no-unsafe-member-access": "error",
"@typescript-eslint/no-unsafe-assignment": "error",
"@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-expect-error": "allow-with-description" }]
```

`bill.billNumber` on a properly-typed result is a **guaranteed compile error**. It only becomes a runtime `undefined` when someone casts to `any` — so make `any` illegal.

### 5.3 Pre-commit hook

```bash
# .husky/pre-commit (or lint-staged equivalent)
npx prisma validate
npx tsc --noEmit
```

Nothing with a type error can enter the repo. `prisma validate` also catches schema edits that were never regenerated.

### 5.4 Regenerate on schema change, automatically

```jsonc
// package.json
"scripts": {
  "postinstall": "prisma generate"
}
```

And whenever `schema.prisma` is edited: `npx prisma generate` immediately. Stale generated types are the #2 source of "the field exists but TS says it doesn't."

### 5.5 CI gate

The build pipeline must run `tsc --noEmit` (or `nest build`) as a required check. This already exists as the final backstop — the layers above exist so it never fires with more than a handful of errors.

### 5.6 Policy for NEW models (do not touch existing ones)

For any **newly added** model, follow the official Prisma convention so future code is uniform:

```prisma
model NewThing {
  id          Int      @id @default(autoincrement())
  someAmount  Int      @map("some_amount")     // camelCase field + @map to snake DB column
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("new_things")
}
```

**NEVER rename fields on existing models** to "clean them up" — that changes the generated client and breaks every call site (and renaming without `@map` also breaks the DB). Existing mixed naming is frozen; consistency is enforced only going forward. (See also: Deletion Policy — destructive schema changes require explicit permission.)

---

## 6. Common Mistakes — The Top 10 Failure Patterns

Ranked by how many of the 273 errors each pattern class caused:

| # | Mistake | Wrong | Right (per schema) |
|---|---|---|---|
| 1 | Camelizing a snake field | `bill.billNumber` | `bill.bill_number` |
| 2 | Snake-casing a camel field | `bill.created_at` | `bill.createdAt` |
| 3 | Wrong name inside `data:` on create/update | `data: { taxAmount }` | `data: { tax_amount }` |
| 4 | Wrong name inside `where:` / `orderBy:` | `orderBy: { billNumber: 'desc' }` | `orderBy: { bill_number: 'desc' }` |
| 5 | Guessing relation names | `include: { billLines: true }` | `include: { lines: true }` |
| 6 | Copying convention from a *different* model | `Bill.created_by` exists, so assuming `GatePass.created_by` — always check that model | Look up each model individually |
| 7 | Hand-written interface twins of Prisma models | `interface BillData { billNumber: string }` | `Prisma.BillGetPayload<...>` / `Bill` from `@prisma/client` |
| 8 | Passing a DTO straight into Prisma | `create({ data: dto })` where DTO uses API naming | Map DTO → `Prisma.BillCreateInput` field by field |
| 9 | Silencing errors with `as any` | `(bill as any).billNumber` → runtime `undefined` | Fix the name; `any` is banned |
| 10 | Coding against a stale client after schema edit | Field exists in schema, TS says it doesn't | `npx prisma generate`, restart TS server |

### Fast lookup table for this project's hot fields

| Model | snake_case fields (use as-is) | camelCase fields (use as-is) |
|---|---|---|
| `Bill` | `bill_number`, `bill_date`, `created_by`, `discount_amount`, `tax_amount`, `total_amount`, `payment_method`, `website_order_id`, `order_source_id` | `organizationId`, `customerId`, `isActive`, `createdAt`, `updatedAt`, `salesmanId`, `discountPercentage`, `discountType`, `deliveryCharges`, `cashbookNumber`, `approvalStatus`, `lastModifiedBy`, `approvedBy`, `approvedAt` |
| `BillLine` | `unit_price`, `tax_id`, `tax_amount`, `line_total` | `billId`, `productId`, `warehouseId`, `quantity`, `createdAt`, `updatedAt`, `organizationId` |
| `ProductVendor` | `unit_price` | (check schema) |
| `User` | `bills_approved` (relation) | `firstName`, `lastName`, `organizationId`, `warehouseId`, `isActive`, `createdAt` |

> This table is a convenience snapshot. **The schema file is the only source of truth** — when in doubt, or for any model not listed, open `prisma/schema.prisma`.

---

## 7. When You Hit a Naming Error Anyway

1. Read the TS error. `TS2339 Property 'x' does not exist` or `TS2353 ... may only specify known properties` = naming mismatch, 95% of the time.
2. Open `prisma/schema.prisma`, find the model, find the real name.
3. Fix **all occurrences in the current file** (search the file for the wrong name — it's never used just once).
4. Grep the repo for the same wrong name — the pattern that produced one error usually produced many:
   ```bash
   grep -rn "billNumber" src/   # find every guess before the build does
   ```
5. Re-run `npx tsc --noEmit`. Zero errors before moving on.

---

*Related: [Code Development Rulebook](rulebook_code_development.md) — Rule "Schema First" and "0 errors mandatory" both derive from this document.*
