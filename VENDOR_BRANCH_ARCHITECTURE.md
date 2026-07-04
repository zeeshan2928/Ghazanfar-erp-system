# Vendor Branch Architecture - Better Solution

**Problem Statement:**
Sitara Trading Company split into 2 vendor accounts to track Microwave Oven khata separately:
- Sitara Trading Company (main)
- Sitara Traders Micro Deal (microwave-only)

**Issue:** Must combine reports to see actual balance

---

## ✅ BETTER APPROACH: Vendor Branches + Product-Based Credit Terms

### Solution Architecture

#### 1. **Vendor Branches** (New Feature)
Instead of separate vendor accounts, create **branches within one vendor account**:

```
Sitara Trading Company (ID: 001)
├── Main Branch (Kitchen Items, General Products)
│   └── Credit Terms: 30 days, Net payment
├── Microwave Division (Microwave Ovens Only)
│   └── Credit Terms: 45 days, Special khata tracking
└── Branch-specific:
    - Separate contact person
    - Separate delivery address
    - Separate credit limit
    - Separate balance tracking
    - Separate payment history
```

#### 2. **Product-Based Credit Terms** (Existing but Enhanced)
Current system has `ProductPrice` with channel & customerType. Extend to include:
- **Vendor-specific credit terms** per product category
- **Automatic term application** when ordering from vendor

#### 3. **Credit Term Rules** (New)
```
Rule: If product_category = "MICROWAVE_OVEN" 
      AND vendor = "Sitara Trading Company"
Then: Apply 45-day credit term
      Route to "Microwave Division" branch
      Track separately
```

---

## Database Schema Changes

### Add: VendorBranch Table
```sql
model VendorBranch {
  id                    Int      @id @default(autoincrement())
  organizationId        Int
  vendorId              Int
  branchName            String   -- "Main Branch", "Microwave Division", etc.
  branchCode            String   -- Unique within vendor: "SITARA-001", "SITARA-MW"
  
  contactPerson         String?
  phone                 String?
  email                 String?
  address               String?
  
  creditLimit           Decimal  @db.Decimal(15, 2)
  creditTermDays        Int      -- 30, 45, 60 days
  paymentTerms          String?  -- "Net 30", "2/10 Net 30", etc.
  
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  -- Relations
  organization          Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  vendor                Vendor       @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  
  purchaseOrders        PurchaseOrder[]
  invoices              VendorInvoice[]
  payments              VendorPayment[]
  outstanding           VendorOutstanding[]
  communications        VendorCommunicationLog[]
  
  @@unique([vendorId, branchCode])
  @@index([vendorId, isActive])
}
```

### Enhanced: ProductCategory Table
```sql
model ProductCategory {
  id                    Int      @id @default(autoincrement())
  organizationId        Int
  categoryName          String
  description           String?
  
  -- Tracking options
  trackSeparately       Boolean  @default(false)
  creditTermsOverride   Int?     -- Days (null = use default)
  
  createdAt             DateTime @default(now())
  
  organization          Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  products              Product[]
  
  @@unique([organizationId, categoryName])
}
```

### Link Product to Category
```sql
-- Add to Product model:
categoryId            Int?
category              ProductCategory? @relation(fields: [categoryId], references: [id])
```

### Update: PurchaseOrder
```sql
model PurchaseOrder {
  -- ... existing fields ...
  
  vendorBranchId        Int?     -- NEW: Links to specific branch
  branchName            String?  -- Cache for reports: "Microwave Division"
  
  vendorBranch          VendorBranch? @relation(fields: [vendorBranchId], references: [id])
}
```

---

## Workflow Example: Microwave Oven Order

### Current Problem:
1. Create PO to "Sitara Traders Micro Deal"
2. Create PO to "Sitara Trading Company" (other items)
3. Need to run 2 separate reports to see total Sitara exposure

### With New Solution:
```
1. Create PO to "Sitara Trading Company" → "Microwave Division" branch
   └─ Automatically applies 45-day credit terms
   └─ Routes to Microwave Division khata

2. Create PO to "Sitara Trading Company" → "Main Branch"
   └─ Applies 30-day credit terms
   └─ Routes to Main branch khata

3. Single report shows:
   ✅ Sitara Trading Company (TOTAL)
   ├─ Main Branch: Rs. 500,000 outstanding
   ├─ Microwave Division: Rs. 250,000 outstanding
   └─ TOTAL: Rs. 750,000
```

---

## Benefits

| Aspect | Old Split Accounts | New Branches |
|--------|-------------------|--------------|
| **Vendor Count** | 2 (Sitara x2) | 1 (Sitara) |
| **Combined Report** | ❌ Manual merge | ✅ Automatic |
| **Credit Terms** | Fixed per vendor | Flexible per branch |
| **Balance Tracking** | Separate ledgers | Unified ledger |
| **Payment Clarity** | Confusing | Crystal clear |
| **Audit Trail** | Complex | Transparent |
| **Relationship** | Broken (appears as 2) | Unified (really 1) |

---

## Implementation Steps

### Phase 1: Create Branch Infrastructure
1. Add `VendorBranch` table
2. Migrate existing vendor as "Main Branch"
3. Create "Microwave Division" branch
4. Migrate all Sitara Traders Micro Deal invoices to branch
5. Update all related records (POs, invoices, payments)

### Phase 2: Implement Credit Term Rules
1. Create `CreditTermRule` table
2. Define: "Microwave products → 45 days from Sitara"
3. Apply rules in PO creation
4. Add UI to configure rules

### Phase 3: Reporting & Analytics
1. Update dashboard to show branch breakdown
2. Create branch-wise P&L reports
3. Create combined vendor reports
4. Create branch balance tracking

### Phase 4: Delete Duplicate
1. Verify all Sitara Traders Micro Deal data migrated
2. Consolidate payments & balance
3. Archive/delete duplicate vendor account

---

## Alternative Consideration: Product-Only Approach

If you don't need separate contact/address per microwave khata:

**Simpler Solution:**
```sql
-- Just use ProductCategory + CreditTermRule
-- No need for VendorBranch if:
-- - Same contact person for all products
-- - Same delivery address
-- - Only difference is credit terms

CreditTermRule:
  IF vendor = "Sitara" AND category = "MICROWAVE"
  THEN creditTerms = 45 days
  ELSE creditTerms = 30 days
```

**This approach is simpler if:**
- ✅ Same contact/address
- ✅ Only need different credit terms
- ✅ Don't need separate balance monitoring

**Use VendorBranch if:**
- ✅ Need separate contact person
- ✅ Need separate delivery locations
- ✅ Need completely separate tracking
- ✅ Different payment terms or bank details

---

## System-Generated IDs (Your Requirement) ✅

Implement immutable system IDs:

### ID Generation Strategy
```sql
-- Every entity gets system_id on creation
-- This ID CANNOT be changed

-- Vendor IDs: V-001, V-002, ...
-- Branch IDs: B-001, B-002, ...
-- Product IDs: P-001, P-002, ...
-- Customer IDs: C-001, C-002, ...
-- Employee IDs: E-001, E-002, ...

-- All relationships use these IDs, not names
```

### Implementation
```typescript
// Auto-generate on creation
async createVendor(data) {
  const vendorId = await generateSystemId('VENDOR'); // Returns "V-001"
  
  return prisma.vendor.create({
    data: {
      ...data,
      systemId: vendorId,  // Immutable
      systemIdLocked: true
    }
  });
}

// Prevent ID modification
@Put('/:id')
updateVendor(@Param('id') id: string, @Body() data) {
  // Remove systemId from data to prevent changes
  delete data.systemId;
  delete data.systemIdLocked;
  
  return this.vendorService.update(id, data);
}
```

### Database Constraints
```sql
ALTER TABLE vendors 
  ADD CONSTRAINT system_id_immutable 
  CHECK (system_id_locked = true);

CREATE UNIQUE INDEX idx_vendor_system_id 
  ON vendors(system_id) 
  WHERE system_id IS NOT NULL;
```

---

## Recommendation

### For Sitara Trading Company:

**My Suggestion: Use VendorBranch Approach**

Because you mentioned:
- "I need separate account to monitor microwave oven khata separately"
- "Microwave ovens get special credit terms"
- "Need to track: quantity received, payments, balance"
- "Separate monitoring of Microwave division"

This suggests you need **separate physical/organizational tracking**, not just different credit terms.

### Implementation Order:
1. ✅ **First:** Create `VendorBranch` table (simple, non-breaking)
2. ✅ **Second:** Create "Microwave Division" branch for Sitara
3. ✅ **Third:** Migrate "Sitara Traders Micro Deal" data to branch
4. ✅ **Fourth:** Delete duplicate vendor
5. ✅ **Final:** Consolidate all Sitara reports

---

## Questions for You:

1. **Do you need separate contact person** for Microwave Division?
2. **Different delivery address** for microwave orders?
3. **Different bank account** for Microwave payments?
4. **Will there be other product-specific branches** in future?

**If all NO:** Use simpler ProductCategory + CreditTermRule approach  
**If any YES:** Use VendorBranch approach

---

## Migration Plan for Current Data

**Current State:**
- Sitara Trading Company (V-001): 86 records
- Sitara Traders Micro Deal (V-002): ? records

**After Migration:**
```
Sitara Trading Company (V-001) - KEEP, UNLOCK
├─ Main Branch (B-001) - NEW
│  └─ Migrate non-microwave products
├─ Microwave Division (B-002) - NEW
│  └─ Migrate from "Sitara Traders Micro Deal"
└─ History maintained, reports accurate

Sitara Traders Micro Deal (V-002) - ARCHIVE
└─ Keep as historical reference only
```

---

**Status:** Ready for implementation  
**Complexity:** Low-Medium  
**Impact:** High-value feature for vendor management

Which approach would you like to proceed with?
