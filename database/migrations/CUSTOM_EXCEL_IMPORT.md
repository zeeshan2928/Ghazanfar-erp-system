# Custom Excel Data Import Procedure
**For:** Ghazanfar ERP  
**From:** Excel/CSV exports from previous ERP  
**Data Volume:** 10,000+ Bills + 20,000 Products + 5,000 Customers  
**Date:** 2026-07-04

---

## Quick Start (5 minutes)

```bash
# 1. Copy your Excel files to project
cp ~/Downloads/Bills.xlsx database/imports/
cp ~/Downloads/Products.xlsx database/imports/
cp ~/Downloads/Customers.xlsx database/imports/

# 2. Convert to CSV (using Excel)
# File → Save As → CSV UTF-8 (.csv)
# Save as: Bills.csv, Products.csv, Customers.csv

# 3. Run import (choose option A or B below)

# OPTION A: Using Node.js (Recommended - safer, with validation)
npm install xlsx csv-parse
node database/imports/importBills.js
node database/imports/importProducts.js
node database/imports/importCustomers.js

# OPTION B: Using PostgreSQL COPY (Fast - for large volumes)
psql your_db < database/imports/import_from_csv.sql
```

---

## Part 1: Prepare Excel Files

### Step 1.1: Open Your Bills Excel File

Your Excel should have these columns (or similar):

| Bill Number | Bill Date | Customer Name | Amount | Status | Notes |
|-------------|-----------|---------------|--------|--------|-------|
| INV-001 | 2024-01-15 | Ahmed Ali | 15000 | Paid | - |
| INV-002 | 2024-01-16 | Fatima Khan | 25000 | Pending | - |

**Required columns:**
- Bill Number (unique identifier)
- Bill Date (format: YYYY-MM-DD or MM/DD/YYYY)
- Customer Name (must match customer list)
- Amount/Total
- Status (Pending, Approved, Paid, Draft, Rejected)

**Optional columns:**
- Description
- Notes
- Discount
- Tax
- Payment Method

### Step 1.2: Clean Your Excel Data

Before exporting, fix these issues:

```
✅ REMOVE:
  - Empty rows/columns
  - Duplicate entries
  - Test/sample data
  - Any headers/footers

✅ FIX:
  - Inconsistent date formats → Use YYYY-MM-DD
  - Text amounts with commas → Remove $ and ,
  - Status values → Standardize (Pending, Approved, Paid, Draft)
  - Customer names → Match exactly with Customers sheet
```

**Check:**
```excel
# In Excel, highlight duplicates:
Data → Conditional Formatting → Duplicate Values
# Delete any duplicates

# Check for empty rows:
Ctrl+End → Should go to your last data cell
```

### Step 1.3: Export as CSV

```
File → Save As → Choose "CSV UTF-8 (.csv)"
Save location: D:\ghazanfar-erp-backend\database\imports\Bills.csv
```

**Important Settings:**
- ✅ Encoding: UTF-8 (prevents special characters breaking)
- ✅ Format: CSV (not CSV, Macintosh or other variants)
- ✅ Include headers: Yes (first row = column names)

---

## Part 2: Create Import Scripts

### Option A: Node.js Import (RECOMMENDED - Safer with validation)

#### Step 2.1: Install Dependencies

```bash
npm install xlsx csv-parse
```

#### Step 2.2: Create Bills Import Script

📄 Create file: `database/imports/importBills.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parse/sync');

const prisma = new PrismaClient();

async function importBills() {
  console.log('🔄 Starting Bills Import...\n');
  
  try {
    // 1. Read CSV file
    const filePath = 'database/imports/Bills.csv';
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`✅ Read ${records.length} bills from CSV\n`);
    
    if (records.length === 0) {
      console.log('❌ No records found. Check CSV file.');
      return;
    }
    
    // 2. Pre-fetch all customers (optimization)
    const customers = await prisma.customer.findMany({
      where: { organizationId: 2, isActive: true },
      select: { id: true, name: true }
    });
    
    const customerMap = new Map(
      customers.map(c => [c.name.toLowerCase().trim(), c.id])
    );
    
    console.log(`✅ Found ${customers.length} customers for linking\n`);
    
    // 3. Validate and transform data
    const validRecords = [];
    const invalidRecords = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 because CSV has header
      
      // Validation
      const errors = [];
      
      if (!record['Bill Number'] || record['Bill Number'].trim() === '') {
        errors.push('Missing Bill Number');
      }
      
      if (!record['Bill Date'] || record['Bill Date'].trim() === '') {
        errors.push('Missing Bill Date');
      } else {
        // Try to parse date
        const billDate = parseDate(record['Bill Date']);
        if (!billDate || isNaN(billDate.getTime())) {
          errors.push(`Invalid date format: "${record['Bill Date']}" (use YYYY-MM-DD or MM/DD/YYYY)`);
        }
      }
      
      if (!record['Amount'] && !record['Total']) {
        errors.push('Missing Amount/Total');
      } else {
        const amount = parseAmount(record['Amount'] || record['Total']);
        if (isNaN(amount)) {
          errors.push(`Invalid amount: "${record['Amount'] || record['Total']}"`);
        }
      }
      
      if (errors.length > 0) {
        invalidRecords.push({
          rowNum,
          billNumber: record['Bill Number'],
          errors: errors.join('; ')
        });
        continue;
      }
      
      // Transformation
      const customerName = record['Customer Name']?.trim().toLowerCase() || '';
      const customerId = customerMap.get(customerName);
      
      validRecords.push({
        ...record,
        customerId,
        errors: customerId ? null : `Customer not found: "${record['Customer Name']}"`
      });
    }
    
    console.log(`📊 Validation Results:`);
    console.log(`   Valid records: ${validRecords.filter(r => !r.errors).length}`);
    console.log(`   Invalid format: ${invalidRecords.length}`);
    console.log(`   Customer not found: ${validRecords.filter(r => r.errors).length}\n`);
    
    if (invalidRecords.length > 0) {
      console.log('❌ Format Errors:');
      invalidRecords.slice(0, 10).forEach(r => {
        console.log(`   Row ${r.rowNum}: ${r.billNumber} - ${r.errors}`);
      });
      if (invalidRecords.length > 10) {
        console.log(`   ... and ${invalidRecords.length - 10} more errors\n`);
      }
    }
    
    // 4. Insert into database
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const record of validRecords) {
      try {
        // Check if bill already exists
        const existing = await prisma.order.findFirst({
          where: {
            organizationId: 2,
            billNumber: record['Bill Number'].toString().trim()
          }
        });
        
        if (existing) {
          console.log(`⏭️  Skipping duplicate: ${record['Bill Number']}`);
          skippedCount++;
          continue;
        }
        
        const billDate = parseDate(record['Bill Date']);
        const amount = parseAmount(record['Amount'] || record['Total']);
        const status = mapStatus(record['Status'] || 'Draft');
        
        const order = await prisma.order.create({
          data: {
            organizationId: 2,
            billNumber: record['Bill Number'].toString().trim(),
            billDate: billDate,
            customerId: record.customerId || null,
            totalAmount: amount,
            status: status,
            createdAt: new Date()
          }
        });
        
        insertedCount++;
        
        // Progress indicator
        if (insertedCount % 100 === 0) {
          console.log(`⏳ Inserted ${insertedCount} bills...`);
        }
      } catch (err) {
        console.error(`❌ Error inserting ${record['Bill Number']}: ${err.message}`);
      }
    }
    
    console.log(`\n✅ Import Complete!`);
    console.log(`   Inserted: ${insertedCount}`);
    console.log(`   Skipped (duplicates): ${skippedCount}`);
    console.log(`   Failed: ${validRecords.filter(r => r.errors).length}`);
    console.log(`   Invalid format: ${invalidRecords.length}`);
    console.log(`   TOTAL: ${records.length}`);
    
    // 5. Reconciliation
    const totalInDb = await prisma.order.count({
      where: { organizationId: 2 }
    });
    console.log(`\n📊 Reconciliation:`);
    console.log(`   Total bills in database: ${totalInDb}`);
    
  } catch (err) {
    console.error('❌ Fatal Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  const str = dateStr.toString().trim();
  
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str + 'T00:00:00Z');
  }
  
  // Try MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [month, day, year] = str.split('/');
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
  }
  
  // Try DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
    const [day, month, year] = str.split('-');
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
  }
  
  // Let JavaScript try
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  const str = amountStr.toString()
    .replace(/[$,]/g, '') // Remove $ and ,
    .trim();
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

function mapStatus(oldStatus) {
  const statusMap = {
    'draft': 'DRAFT',
    'pending': 'DRAFT',
    'approval': 'DRAFT',
    'approved': 'APPROVED',
    'confirmed': 'APPROVED',
    'paid': 'FULFILLED',
    'completed': 'FULFILLED',
    'rejected': 'CANCELLED',
    'cancelled': 'CANCELLED'
  };
  
  const key = (oldStatus || '').toLowerCase().trim();
  return statusMap[key] || 'DRAFT';
}

// Run import
importBills().catch(console.error);
```

**Run:**
```bash
node database/imports/importBills.js
```

---

### Step 2.3: Create Products Import Script

📄 Create file: `database/imports/importProducts.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parse/sync');

const prisma = new PrismaClient();

async function importProducts() {
  console.log('🔄 Starting Products Import...\n');
  
  try {
    const filePath = 'database/imports/Products.csv';
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`✅ Read ${records.length} products from CSV\n`);
    
    // Get or create default category
    let defaultCategory = await prisma.productCategory.findFirst({
      where: { organizationId: 2, name: 'General' }
    });
    
    if (!defaultCategory) {
      defaultCategory = await prisma.productCategory.create({
        data: {
          organizationId: 2,
          name: 'General',
          description: 'Default category for imported products'
        }
      });
    }
    
    let insertedCount = 0;
    let skippedCount = 0;
    const invalidRecords = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2;
      
      // Validation
      const errors = [];
      
      if (!record['Product Name'] || record['Product Name'].trim() === '') {
        errors.push('Missing Product Name');
      }
      
      if (!record['SKU'] || record['SKU'].trim() === '') {
        errors.push('Missing SKU');
      }
      
      if (errors.length > 0) {
        invalidRecords.push({
          rowNum,
          product: record['Product Name'] || '?',
          errors: errors.join('; ')
        });
        continue;
      }
      
      try {
        // Check if product already exists
        const existing = await prisma.product.findFirst({
          where: {
            organizationId: 2,
            sku: record['SKU'].toString().trim()
          }
        });
        
        if (existing) {
          skippedCount++;
          continue;
        }
        
        const product = await prisma.product.create({
          data: {
            organizationId: 2,
            name: record['Product Name'].toString().trim(),
            sku: record['SKU'].toString().trim(),
            description: record['Description'] || null,
            categoryId: defaultCategory.id,
            basePrice: parseAmount(record['Price'] || record['Sale Price'] || 0),
            costPrice: parseAmount(record['Cost'] || record['Cost Price'] || 0),
            isActive: record['Active'] === 'Yes' || record['Active'] === '1' || record['Active'] === true,
            createdAt: new Date()
          }
        });
        
        // Create inventory record if quantity provided
        if (record['Quantity'] || record['Stock']) {
          const qty = parseInt(record['Quantity'] || record['Stock'] || 0);
          if (qty > 0) {
            // Assuming warehouse_id = 1 is default
            await prisma.inventory.create({
              data: {
                organizationId: 2,
                productId: product.id,
                warehouseId: 1,
                physicalOnHand: qty,
                available: qty,
                openingBalance: qty
              }
            });
          }
        }
        
        insertedCount++;
        
        if (insertedCount % 100 === 0) {
          console.log(`⏳ Inserted ${insertedCount} products...`);
        }
      } catch (err) {
        console.error(`❌ Error: Row ${rowNum} - ${err.message}`);
      }
    }
    
    console.log(`\n✅ Import Complete!`);
    console.log(`   Inserted: ${insertedCount}`);
    console.log(`   Skipped (duplicates): ${skippedCount}`);
    console.log(`   Invalid: ${invalidRecords.length}`);
    console.log(`   TOTAL: ${records.length}`);
    
    if (invalidRecords.length > 0) {
      console.log('\n❌ Invalid Records:');
      invalidRecords.slice(0, 5).forEach(r => {
        console.log(`   Row ${r.rowNum}: ${r.product} - ${r.errors}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Fatal Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  const str = amountStr.toString().replace(/[$,]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

importProducts().catch(console.error);
```

**Run:**
```bash
node database/imports/importProducts.js
```

---

### Step 2.4: Create Customers Import Script

📄 Create file: `database/imports/importCustomers.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parse/sync');

const prisma = new PrismaClient();

async function importCustomers() {
  console.log('🔄 Starting Customers Import...\n');
  
  try {
    const filePath = 'database/imports/Customers.csv';
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`✅ Read ${records.length} customers from CSV\n`);
    
    let insertedCount = 0;
    let skippedCount = 0;
    const invalidRecords = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2;
      
      // Validation
      if (!record['Customer Name'] || record['Customer Name'].trim() === '') {
        invalidRecords.push({
          rowNum,
          errors: 'Missing Customer Name'
        });
        continue;
      }
      
      try {
        // Check if customer already exists
        const existing = await prisma.customer.findFirst({
          where: {
            organizationId: 2,
            name: record['Customer Name'].toString().trim()
          }
        });
        
        if (existing) {
          skippedCount++;
          continue;
        }
        
        const customer = await prisma.customer.create({
          data: {
            organizationId: 2,
            name: record['Customer Name'].toString().trim(),
            phone: record['Phone'] || record['Mobile'] || null,
            email: record['Email'] || null,
            address: record['Address'] || record['City'] || null,
            customerType: record['Customer Type'] || record['Type'] || 'RETAIL',
            creditLimit: parseAmount(record['Credit Limit'] || record['Credit'] || 0),
            isActive: record['Active'] !== 'No' && record['Active'] !== '0',
            createdAt: new Date()
          }
        });
        
        // Create credit limit record if specified
        if (record['Credit Limit'] || record['Credit']) {
          const creditAmount = parseAmount(record['Credit Limit'] || record['Credit']);
          if (creditAmount > 0) {
            await prisma.customerCreditLimit.create({
              data: {
                organizationId: 2,
                customerId: customer.id,
                creditLimitAmount: creditAmount,
                currentBalance: 0,
                availableCredit: creditAmount
              }
            });
          }
        }
        
        insertedCount++;
        
        if (insertedCount % 100 === 0) {
          console.log(`⏳ Inserted ${insertedCount} customers...`);
        }
      } catch (err) {
        console.error(`❌ Error: Row ${rowNum} - ${err.message}`);
      }
    }
    
    console.log(`\n✅ Import Complete!`);
    console.log(`   Inserted: ${insertedCount}`);
    console.log(`   Skipped (duplicates): ${skippedCount}`);
    console.log(`   Invalid: ${invalidRecords.length}`);
    console.log(`   TOTAL: ${records.length}`);
    
  } catch (err) {
    console.error('❌ Fatal Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  const str = amountStr.toString().replace(/[$,]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

importCustomers().catch(console.error);
```

**Run:**
```bash
node database/imports/importCustomers.js
```

---

## Part 3: Expected Excel Column Names

### Bills.csv Expected Columns:

```
Bill Number, Bill Date, Customer Name, Amount, Status, [Optional: Notes, Discount, Tax]

Example:
INV-001,2024-01-15,Ahmed Ali,15000,Paid
INV-002,2024-01-16,Fatima Khan,25000,Pending
```

### Products.csv Expected Columns:

```
Product Name, SKU, Category, Price, Cost, Quantity, Active, [Optional: Description]

Example:
Laptop,LAP-001,Electronics,120000,80000,50,Yes
Notebook,NB-001,Stationery,500,200,1000,Yes
```

### Customers.csv Expected Columns:

```
Customer Name, Phone, Email, Address, Customer Type, Credit Limit, Active

Example:
Ahmed Ali,0300-1234567,ahmed@email.com,Karachi,Wholesale,100000,Yes
Fatima Khan,0321-9876543,fatima@email.com,Lahore,Retail,50000,Yes
```

---

## Part 4: Quick Troubleshooting

### "File not found" Error
```bash
# Make sure CSV files are in correct location:
ls -la database/imports/*.csv

# If not there, convert Excel to CSV first:
# 1. Open Excel file
# 2. File → Save As
# 3. Format: CSV UTF-8 (.csv)
# 4. Save to: database/imports/
```

### "Customer not found" Error
```bash
# This means customer in Bills.csv doesn't match Customers sheet

# Solution 1: Import Customers first
node database/imports/importCustomers.js
node database/imports/importBills.js

# Solution 2: Check spelling/exact match required
# Customer name in Bills.csv must exactly match Customers.csv
```

### Date Format Issues
```
Script handles:
  ✅ YYYY-MM-DD (2024-01-15)
  ✅ MM/DD/YYYY (01/15/2024)
  ✅ DD-MM-YYYY (15-01-2024)

If still failing: Convert in Excel first using TEXT function:
  =TEXT(A1,"YYYY-MM-DD")
```

### Amount/Decimal Issues
```
Script handles:
  ✅ 15000
  ✅ 15,000
  ✅ $15,000.00
  ✅ 15000.50

Auto-removes: $ and commas
Auto-rounds: to 2 decimals
```

---

## Part 5: Reconciliation Report

After import, run this to verify:

```javascript
// database/imports/reconcile.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reconcile() {
  console.log('\n📊 RECONCILIATION REPORT\n');
  
  const billCount = await prisma.order.count({
    where: { organizationId: 2 }
  });
  
  const productCount = await prisma.product.count({
    where: { organizationId: 2 }
  });
  
  const customerCount = await prisma.customer.count({
    where: { organizationId: 2 }
  });
  
  const billTotal = await prisma.order.aggregate({
    where: { organizationId: 2 },
    _sum: { totalAmount: true }
  });
  
  console.log(`Bills Imported: ${billCount}`);
  console.log(`Products Imported: ${productCount}`);
  console.log(`Customers Imported: ${customerCount}`);
  console.log(`Total Bill Amount: ${billTotal._sum.totalAmount}`);
  
  // Check for orphaned bills
  const orphaned = await prisma.order.count({
    where: {
      organizationId: 2,
      customerId: null
    }
  });
  
  if (orphaned > 0) {
    console.log(`\n⚠️  WARNING: ${orphaned} bills without customer!`);
  } else {
    console.log(`\n✅ All bills linked to customers`);
  }
  
  await prisma.$disconnect();
}

reconcile();
```

**Run:**
```bash
node database/imports/reconcile.js
```

---

## Your Next Step:

**Please provide:**

1. **Customers Excel columns** - What columns do you have? (Name, Phone, Email, etc?)
2. **Bills Excel sample** - Show me first 3 rows so I can verify format
3. **Products Excel sample** - Show me first 3 rows
4. **File location** - Where will you put these files?

Then I'll:
✅ Create specific mapping for your data  
✅ Test import with sample 100 records  
✅ Create validation queries  
✅ Provide go-live checklist

**Also tell me about Customers:**
- How many? 
- What info do you have? (Name, Phone, Email, Type, Credit Limit?)
- Do you track customer groups/categories?
