# Data Import Strategy - Phase 5
**Date:** 2026-07-04  
**Status:** Ready to Execute

---

## Import Priority & Sequence

### Order (CRITICAL: Must follow sequence)
```
1. Vendors → 2. Customers → 3. Products → 4. Bills → 5. Inventory
```

**Why:** Maintaining foreign key relationships

---

## Import Details by Entity

### 1. VENDORS ✅ (Already Done)
**Status:** 86 vendors imported  
**Source:** `D:\ghazanfar-erp-backend\Unique_Vendors_List.csv`

**Special Handling - Sitara Trading Split:**
See: `VENDOR_BRANCH_ARCHITECTURE.md`
- Plan: Merge "Sitara Trading Company" + "Sitara Traders Micro Deal"
- Implementation: Use VendorBranch feature
- Timeline: Post-initial import

---

### 2. CUSTOMERS (Next)

**Source File:** `database/imports/Customers.csv`

**Expected Columns:**
```
Customer Name | Phone | Email | Address | Type | Credit Limit | Status
```

**Import Details:**
```bash
# Setup
cp /path/to/Customers.csv database/imports/Customers.csv

# Execute
node database/imports/importCustomers.js

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM customers WHERE organization_id = 2;"
```

**Expected:** 5,000+ customers

---

### 3. PRODUCTS (Next)

**Source File:** `database/imports/Products.csv` (from your Excel data)

**Expected Columns:**
```
Product Name | SKU | Category | Price | Cost | Quantity | Active | Vendor
```

**Special Handling:**
```javascript
// From your requirements:

1. ✅ "import items that have any quantity"
   → Include products with quantity = 0
   → Include products with quantity > 0
   
2. ✅ "ignore duplicate products"
   → Check: product name + sku combination
   → If exists: Skip (log warning)
   → If new: Create

3. ✅ "vendor relationship adjustment"
   → IF product.vendor = "Sitara Trading Company"
      AND product_type = "MICROWAVE_OVEN"
   THEN assign to "Sitara Traders Micro Deal" (temporarily)
   
   Note: Post-import, will migrate to VendorBranch

4. ✅ "No opening stock mapping for now"
   → Don't create OpeningStockTransaction
   → Just populate Inventory.opening_balance with quantity
   → Will handle stock history in Phase 6
```

**Import Script Enhancement:**

```javascript
// database/imports/importProducts.js (UPDATED)

const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ORGANIZATION_ID = 2; // Your org

async function importProducts() {
  const stats = {
    total: 0,
    imported: 0,
    skipped: 0,
    zeroQuantity: 0,
    errors: []
  };

  const productMap = new Map(); // Track imported (name + sku)
  const errors = [];

  return new Promise((resolve) => {
    fs.createReadStream('database/imports/Products.csv')
      .pipe(csv())
      .on('data', async (row) => {
        stats.total++;
        
        try {
          const {
            'Product Name': name,
            'SKU': sku,
            'Category': category,
            'Price': price,
            'Cost': cost,
            'Quantity': quantity,
            'Active': active,
            'Vendor': vendorName
          } = row;

          // Validation
          if (!name || !sku) {
            stats.skipped++;
            errors.push(`Row ${stats.total}: Missing name or SKU`);
            return;
          }

          // Check for duplicates (name + sku)
          const key = `${name}|${sku}`;
          if (productMap.has(key)) {
            stats.skipped++;
            console.log(`⏭️  Skipping duplicate: ${name} (SKU: ${sku})`);
            return;
          }

          // IMPORTANT: Include zero quantity items
          const qty = parseInt(quantity) || 0;
          if (qty === 0) {
            stats.zeroQuantity++;
          }

          // Find vendor
          let vendorId = null;
          if (vendorName && vendorName.trim()) {
            const vendor = await prisma.vendor.findFirst({
              where: {
                name: vendorName.trim(),
                organizationId: ORGANIZATION_ID
              }
            });
            
            if (vendor) {
              vendorId = vendor.id;
            } else {
              errors.push(
                `Row ${stats.total}: Vendor not found: "${vendorName}"`
              );
              // Don't fail, just log warning
            }
          }

          // Create product
          const product = await prisma.product.create({
            data: {
              organizationId: ORGANIZATION_ID,
              code: sku.trim(),
              name: name.trim(),
              description: category || null,
              categoryId: null,
              costPrice: parseInt(cost) || 0,
              isVisibleOnCounter: active === 'true' || active === '1',
              isVisibleOnWebsite: false,
              isVisibleWholesale: true,
              isVisibleRetail: true,
              baseUnit: 'piece',
              minimumQuantity: 0,
              reorderQuantity: 0,
              primaryVendorId: vendorId,
              isActive: active === 'true' || active === '1'
            }
          });

          // Create inventory record
          // NO opening stock transactions for now
          // Just set opening_balance
          await prisma.inventory.create({
            data: {
              organizationId: ORGANIZATION_ID,
              productId: product.id,
              warehouseId: 1, // Default warehouse
              physicalOnHand: qty,
              reserved: 0,
              available: qty,
              openingBalance: qty // Direct assignment, no mapping
            }
          });

          // Create product price
          await prisma.productPrice.create({
            data: {
              organizationId: ORGANIZATION_ID,
              productId: product.id,
              channel: 'RETAIL',
              customerType: 'RETAIL',
              price: parseInt(price) || 0,
              minQuantity: 0,
              isActive: true
            }
          });

          productMap.set(key, product.id);
          stats.imported++;
          
          if (stats.imported % 100 === 0) {
            console.log(`✅ Imported ${stats.imported} products...`);
          }

        } catch (error) {
          stats.errors.push(error.message);
          errors.push(`Row ${stats.total}: ${error.message}`);
        }
      })
      .on('end', async () => {
        console.log(`\n✅ Import Complete`);
        console.log(`   Total rows: ${stats.total}`);
        console.log(`   Imported: ${stats.imported}`);
        console.log(`   Skipped (duplicates): ${stats.total - stats.imported - stats.skipped}`);
        console.log(`   Items with zero quantity: ${stats.zeroQuantity}`);
        
        if (errors.length > 0) {
          console.log(`\n⚠️  Warnings/Errors:`);
          errors.slice(0, 20).forEach(e => console.log(`   ${e}`));
          if (errors.length > 20) {
            console.log(`   ... and ${errors.length - 20} more`);
          }
        }

        await prisma.$disconnect();
        resolve();
      });
  });
}

importProducts();
```

**Execute:**
```bash
node database/imports/importProducts.js
```

**Expected:** 20,000+ products (including zero quantity)

---

### 4. BILLS (Next)

**Source File:** `database/imports/Bills.csv`

**Expected Columns:**
```
Bill Number | Bill Date | Customer Name | Amount | Status | Items JSON
```

**Special Handling:**
```javascript
// Bills are complex: have line items, taxes, discounts

// Requirements for you:
1. ✅ Create Bill header
2. ✅ Create Bill line items
3. ✅ Match products (by code/name)
4. ✅ Match customers (by name)
5. ✅ Calculate totals
6. ❌ No opening stock mapping
```

**Implementation:**

```javascript
// database/imports/importBills.js (UPDATED)

async function importBills() {
  const stats = {
    total: 0,
    imported: 0,
    skipped: 0,
    errors: []
  };

  const errors = [];

  return new Promise((resolve) => {
    fs.createReadStream('database/imports/Bills.csv')
      .pipe(csv())
      .on('data', async (row) => {
        stats.total++;

        try {
          const {
            'Bill Number': billNumber,
            'Bill Date': billDate,
            'Customer Name': customerName,
            'Amount': amount,
            'Status': status,
            'Items': itemsJson
          } = row;

          // Find customer
          const customer = await prisma.customer.findFirst({
            where: {
              name: customerName.trim(),
              organizationId: ORGANIZATION_ID
            }
          });

          if (!customer) {
            stats.skipped++;
            errors.push(`Bill ${billNumber}: Customer not found: "${customerName}"`);
            return;
          }

          // Parse items
          let items = [];
          try {
            items = JSON.parse(itemsJson);
          } catch (e) {
            // If JSON parsing fails, skip
            stats.skipped++;
            errors.push(`Bill ${billNumber}: Invalid items JSON`);
            return;
          }

          // Calculate totals
          let subtotal = 0;
          let taxAmount = 0;
          let discountAmount = 0;

          // Create bill
          const bill = await prisma.bill.create({
            data: {
              organizationId: ORGANIZATION_ID,
              billNumber: billNumber.trim(),
              billDate: new Date(billDate),
              customerId: customer.id,
              channel: 'RETAIL',
              createdBy: 1, // System user
              subtotal: 0, // Will calculate
              discountAmount: discountAmount,
              taxAmount: taxAmount,
              totalAmount: parseInt(amount) || 0,
              status: status || 'APPROVED',
              isActive: true
            }
          });

          // Create bill line items
          for (const item of items) {
            // Find product by code or name
            const product = await prisma.product.findFirst({
              where: {
                OR: [
                  { code: item.sku || item.code },
                  { name: item.name }
                ],
                organizationId: ORGANIZATION_ID
              }
            });

            if (!product) {
              errors.push(
                `Bill ${billNumber}: Product not found: "${item.name || item.code}"`
              );
              continue;
            }

            // Create bill line
            await prisma.billLine.create({
              data: {
                organizationId: ORGANIZATION_ID,
                billId: bill.id,
                productId: product.id,
                warehouseId: 1,
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                taxId: null,
                taxAmount: item.taxAmount || 0,
                lineTotal: (item.quantity || 0) * (item.unitPrice || 0)
              }
            });

            subtotal += (item.quantity || 0) * (item.unitPrice || 0);
          }

          // Update bill with calculated subtotal
          await prisma.bill.update({
            where: { id: bill.id },
            data: { subtotal }
          });

          stats.imported++;

          if (stats.imported % 100 === 0) {
            console.log(`✅ Imported ${stats.imported} bills...`);
          }

        } catch (error) {
          stats.errors.push(error.message);
          errors.push(`Row ${stats.total}: ${error.message}`);
        }
      })
      .on('end', async () => {
        console.log(`\n✅ Bill Import Complete`);
        console.log(`   Total: ${stats.total}`);
        console.log(`   Imported: ${stats.imported}`);
        console.log(`   Skipped: ${stats.skipped}`);
        
        if (errors.length > 0) {
          console.log(`\n⚠️  Issues:`);
          errors.slice(0, 20).forEach(e => console.log(`   ${e}`));
        }

        await prisma.$disconnect();
        resolve();
      });
  });
}

importBills();
```

**Execute:**
```bash
node database/imports/importBills.js
```

**Expected:** 10,000+ bills

---

### 5. INVENTORY (Auto-created)

**Status:** Auto-created during product import

**What happens:**
```javascript
// During product import:
1. Create Product record
2. Automatically create Inventory record
3. Set opening_balance = quantity from CSV
4. Calculate available = quantity (no reservations yet)

// NO transaction log for now
// NO opening stock mapping transactions
// Direct balance assignment only
```

---

## System-Generated IDs Implementation

### All Entities Must Have Immutable System IDs

**Add to Prisma Schema:**

```prisma
// Add to ALL models that need IDs:

model Vendor {
  id              Int     @id @default(autoincrement())
  systemId        String  @unique // V-001, V-002, ...
  systemIdLocked  Boolean @default(true)
  
  // ... rest of fields
}

model Customer {
  id              Int     @id @default(autoincrement())
  systemId        String  @unique // C-001, C-002, ...
  systemIdLocked  Boolean @default(true)
  
  // ... rest of fields
}

model Product {
  id              Int     @id @default(autoincrement())
  systemId        String  @unique // P-001, P-002, ...
  systemIdLocked  Boolean @default(true)
  
  // ... rest of fields
}
```

**ID Generation Service:**

```typescript
// src/common/services/system-id.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SystemIdService {
  constructor(private prisma: PrismaClient) {}

  async generateSystemId(entityType: string): Promise<string> {
    const prefix = this.getPrefix(entityType);
    
    // Get last ID
    const lastRecord = await this.getLast(entityType);
    const lastNum = lastRecord ? parseInt(lastRecord.systemId.split('-')[1]) : 0;
    const newNum = lastNum + 1;
    
    return `${prefix}-${String(newNum).padStart(5, '0')}`; // V-00001, V-00002
  }

  private getPrefix(type: string): string {
    const prefixes = {
      'VENDOR': 'V',
      'CUSTOMER': 'C',
      'PRODUCT': 'P',
      'EMPLOYEE': 'E',
      'BRANCH': 'B',
      'USER': 'U',
      'WAREHOUSE': 'WH'
    };
    return prefixes[type] || 'X';
  }

  private async getLast(entityType: string): Promise<any> {
    // Get last record by systemId
    // Implementation depends on entity type
  }
}
```

**Usage in Imports:**

```javascript
// Before creating any entity:
const systemId = await systemIdService.generateSystemId('PRODUCT');

const product = await prisma.product.create({
  data: {
    systemId: systemId,
    systemIdLocked: true, // IMMUTABLE
    // ... other fields
  }
});

// IMPORTANT: Prevent editing
app.put('/products/:id', (req, res) => {
  // Remove systemId from request body
  delete req.body.systemId;
  delete req.body.systemIdLocked;
  
  // Update only other fields
  return updateProduct(id, req.body);
});
```

---

## Data Quality Validation

**Before Import:**

```bash
# Check for:
1. Missing required fields
2. Invalid data types
3. Duplicate entries
4. Foreign key references
```

**During Import:**

```bash
# Log:
1. Success count
2. Error count
3. Warnings (vendor not found, etc.)
4. Duplicate detection
```

**After Import:**

```sql
-- Verify imports
SELECT 
  'Products' as entity, COUNT(*) as count FROM products WHERE organization_id = 2
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers WHERE organization_id = 2
UNION ALL
SELECT 'Bills', COUNT(*) FROM bills WHERE organization_id = 2
UNION ALL
SELECT 'Vendors', COUNT(*) FROM vendors WHERE organization_id = 2
UNION ALL
SELECT 'Inventory', COUNT(*) FROM inventory WHERE organization_id = 2;
```

---

## Import Execution Checklist

### Pre-Import
- [ ] Database verified and synced
- [ ] CSV files prepared and placed in `database/imports/`
- [ ] Vendor list finalized (resolve Sitara split)
- [ ] Duplicate product list removed
- [ ] Customer list validated

### Import Sequence
- [ ] Vendors: Already done ✅
- [ ] Customers: `node database/imports/importCustomers.js`
- [ ] Products: `node database/imports/importProducts.js` (with zero qty)
- [ ] Bills: `node database/imports/importBills.js`

### Post-Import
- [ ] Verify counts with SQL query
- [ ] Check reports for consistency
- [ ] Test Phase 4 search with real data
- [ ] Validate bill-to-customer links
- [ ] Validate product-to-vendor links

### Data Cleanup
- [ ] Remove duplicate vendor "Sitara Traders Micro Deal"
- [ ] Implement VendorBranch feature
- [ ] Migrate microwave orders to branch

---

## Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Prepare CSVs | 1-2 hours |
| 2 | Import Customers | 5-10 min |
| 3 | Import Products (20K+) | 10-15 min |
| 4 | Import Bills (10K+) | 15-20 min |
| 5 | Verify & Test | 30 min |
| 6 | Fix Issues | 1-2 hours |
| **TOTAL** | | **4-5 hours** |

---

## Next Actions

1. **Prepare Data Files**
   - Customers.csv → `database/imports/`
   - Products.csv → `database/imports/` (from extracted data)
   - Bills.csv → `database/imports/`

2. **Verify System IDs**
   - Add system ID fields to schema
   - Implement ID generation service

3. **Execute Imports**
   - Run import scripts in sequence
   - Monitor output for warnings

4. **Test & Validate**
   - Verify counts
   - Test search functionality
   - Test reports

5. **Implement VendorBranch**
   - Resolve Sitara split
   - Create microwave division branch

---

**Ready to start data import? Which file do you want to prepare first?**
