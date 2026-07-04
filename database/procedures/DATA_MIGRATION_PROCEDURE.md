# Data Migration Procedure
**From Previous Software → New ERP System**  
**Date:** 2026-07-04  
**Status:** TEMPLATE - Customize for your source system  
**Estimated Time:** 4-8 hours (depends on data volume)

---

## Overview

This document provides a step-by-step procedure to migrate existing business data from your previous software to the Ghazanfar ERP system.

**Your Data Profile:**
- ~1,000 bills (active)
- ~20,000 products total (5,000 active)
- ~5,000 customers
- ~10 vendors
- Historical transactions & records

---

## Part 1: Pre-Migration Assessment

### Step 1.1: Identify Data Sources

Determine where your data currently lives:

```
YOUR PREVIOUS SYSTEM
├── Database (if SQL-based)
│   └── Connection string? Tables? Schema?
├── Spreadsheets (Excel/CSV)
│   └── File locations? Formats?
├── Cloud Storage (Google Drive, OneDrive, Dropbox)
│   └── File formats? Organization?
└── Manual Records (Paper, PDFs)
    └── Digitization required?
```

**Action:** Document all data sources in this table:

| Data Type | Location | Format | Volume | Notes |
|-----------|----------|--------|--------|-------|
| Bills | ? | ? | 1,000 | ? |
| Products | ? | ? | 20,000 | ? |
| Customers | ? | ? | 5,000 | ? |
| Vendors | ? | ? | 10 | ? |
| Inventory | ? | ? | ? | ? |
| Employees | ? | ? | ? | ? |

---

### Step 1.2: Data Quality Assessment

Before migration, audit your data:

```bash
# Questions to answer:
- Are there duplicate records? (e.g., duplicate customers/products)
- Missing required fields? (e.g., customer without email)
- Data integrity issues? (e.g., amount = "not provided")
- Inconsistent formatting? (e.g., dates as "01/01/2024" vs "2024-01-01")
- Orphaned records? (e.g., bill with non-existent customer_id)
```

**Action:** Run data quality checks BEFORE migration.

---

## Part 2: Data Extraction

### Step 2.1: Export from Previous System

#### **If Previous System is SQL-based:**

```sql
-- Example: Export Bills
SELECT 
    bill_id,
    bill_number,
    bill_date,
    customer_name,
    total_amount,
    status
FROM bills
WHERE bill_date >= '2024-01-01'
INTO OUTFILE '/tmp/bills_export.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';

-- Similarly for other tables
-- Products, Customers, Vendors, Inventory, etc.
```

#### **If Previous System Uses Excel/CSV:**

- Export each sheet to separate CSV files
- Save in UTF-8 encoding (prevents special character issues)
- Maintain consistent column headers
- Remove empty rows/columns

**Files to extract:**
```
previous_software_export/
├── bills.csv
├── bill_items.csv
├── customers.csv
├── products.csv
├── vendors.csv
├── inventory.csv
├── employees.csv
└── transactions.csv (if available)
```

#### **If Previous System is Cloud-based:**

- Contact support for data export options
- Request bulk export in CSV or JSON format
- Verify all fields are included
- Test with sample export first

---

## Part 3: Data Mapping & Transformation

### Step 3.1: Create Mapping Document

Map old field names → new field names:

#### **Example: Bills/Orders Mapping**

| Old System | New System | Type | Notes |
|-----------|-----------|------|-------|
| bill_id | id | INT | Primary key |
| bill_no | billNumber | VARCHAR(50) | Keep format |
| bill_date | billDate | TIMESTAMP | Convert to ISO format |
| cust_name | customerId + customer lookup | INT | MUST lookup customer ID |
| cust_phone | customer.phone | VARCHAR(20) | Update customer record |
| total | totalAmount | DECIMAL(15,2) | Round to 2 decimals |
| bill_status | status | VARCHAR(50) | Map: DRAFT/APPROVED/PAID |
| discount | ??? | DECIMAL(10,2) | Create in Discount table |
| tax | ??? | DECIMAL(10,2) | Create in Tax table |

#### **Example: Customers Mapping**

| Old System | New System | Type | Notes |
|-----------|-----------|------|-------|
| cust_id | ??? | INT | Will be auto-generated |
| name | name | VARCHAR(100) | Required |
| phone | phone | VARCHAR(20) | Format validation |
| email | email | VARCHAR(100) | Validation + dedup |
| address | address | TEXT | Optional |
| credit_limit | creditLimit | DECIMAL(15,2) | Create in customer_credit_limits |
| type | customerType | VARCHAR(50) | Map to: Retail/Wholesale/Corporate/VIP |
| active | isActive | BOOLEAN | Map: 1→true, 0→false |

#### **Example: Products Mapping**

| Old System | New System | Type | Notes |
|-----------|-----------|------|-------|
| product_id | ??? | INT | Will be auto-generated |
| product_name | name | VARCHAR(100) | Required |
| sku | sku | VARCHAR(50) | Unique validation |
| category | categoryId | INT | Lookup/create category |
| price | basePrice | DECIMAL(12,2) | Current selling price |
| cost | costPrice | DECIMAL(12,2) | Optional but valuable |
| quantity | ??? | INT | Create in Inventory table |
| active | isActive | BOOLEAN | Boolean conversion |

---

### Step 3.2: Create Transformation Scripts

#### **Option A: SQL-based Transformation (PostgreSQL)**

```sql
-- Create staging table (raw import)
CREATE TABLE IF NOT EXISTS staging_bills (
    old_bill_id VARCHAR(50),
    bill_number VARCHAR(50),
    bill_date VARCHAR(20),
    customer_name VARCHAR(100),
    total_amount VARCHAR(50),
    status VARCHAR(50)
);

-- Import from CSV
COPY staging_bills FROM '/tmp/bills_export.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',', ENCODING 'UTF-8');

-- Transform and insert into production
INSERT INTO orders (
    organization_id,
    billNumber,
    billDate,
    customerId,
    totalAmount,
    status,
    createdAt
)
SELECT 
    2 as organization_id,
    sb.bill_number,
    TO_TIMESTAMP(sb.bill_date, 'YYYY-MM-DD')::TIMESTAMP,
    c.id as customerId,  -- Lookup customer by name
    CAST(REPLACE(sb.total_amount, ',', '') AS DECIMAL(15,2)),
    CASE 
        WHEN sb.status = 'Draft' THEN 'DRAFT'
        WHEN sb.status = 'Approved' THEN 'APPROVED'
        WHEN sb.status = 'Paid' THEN 'FULFILLED'
        ELSE 'DRAFT'
    END,
    NOW()
FROM staging_bills sb
LEFT JOIN customers c ON c.name = sb.customer_name AND c.organization_id = 2
WHERE sb.bill_number IS NOT NULL;

-- Log results
SELECT COUNT(*) as inserted_count FROM orders WHERE created_at = NOW();
```

#### **Option B: Node.js/JavaScript Migration Script**

```javascript
// migration/importBills.js
const { PrismaClient } = require('@prisma/client');
const csv = require('csv-parse/sync');
const fs = require('fs');

const prisma = new PrismaClient();

async function importBills() {
  try {
    console.log('Starting bill import...');
    
    // 1. Read CSV
    const fileContent = fs.readFileSync('/tmp/bills_export.csv', 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Found ${records.length} bills to import`);
    
    // 2. Lookup all customers first (for faster processing)
    const customers = await prisma.customer.findMany({
      where: { organizationId: 2 },
      select: { id: true, name: true }
    });
    const customerMap = new Map(customers.map(c => [c.name, c.id]));
    
    // 3. Transform and insert
    let insertedCount = 0;
    let failedCount = 0;
    
    for (const record of records) {
      try {
        const customerId = customerMap.get(record.customer_name);
        
        if (!customerId && record.customer_name) {
          console.warn(`Customer not found: ${record.customer_name}`);
          failedCount++;
          continue;
        }
        
        const order = await prisma.order.create({
          data: {
            organizationId: 2,
            billNumber: record.bill_number,
            billDate: new Date(record.bill_date),
            customerId: customerId || null,
            totalAmount: parseFloat(record.total_amount),
            status: mapStatus(record.status),
            createdAt: new Date()
          }
        });
        
        insertedCount++;
        
        // Log every 100 records
        if (insertedCount % 100 === 0) {
          console.log(`Inserted ${insertedCount} bills...`);
        }
      } catch (err) {
        console.error(`Error importing bill ${record.bill_number}:`, err.message);
        failedCount++;
      }
    }
    
    console.log(`\nImport Complete:`);
    console.log(`  Inserted: ${insertedCount}`);
    console.log(`  Failed: ${failedCount}`);
    console.log(`  Total: ${insertedCount + failedCount}`);
    
  } finally {
    await prisma.$disconnect();
  }
}

function mapStatus(oldStatus) {
  const statusMap = {
    'Draft': 'DRAFT',
    'Pending': 'DRAFT',
    'Approved': 'APPROVED',
    'Confirmed': 'APPROVED',
    'Paid': 'FULFILLED',
    'Completed': 'FULFILLED'
  };
  return statusMap[oldStatus] || 'DRAFT';
}

importBills().catch(console.error);
```

**Run:** `node migration/importBills.js`

---

## Part 4: Data Validation

### Step 4.1: Pre-Import Validation

Before importing, validate source data:

```sql
-- Check for duplicates
SELECT bill_number, COUNT(*) 
FROM staging_bills 
GROUP BY bill_number 
HAVING COUNT(*) > 1;

-- Check for null required fields
SELECT COUNT(*) as missing_bill_number 
FROM staging_bills 
WHERE bill_number IS NULL;

SELECT COUNT(*) as missing_customer 
FROM staging_bills 
WHERE customer_name IS NULL;

-- Check date format validity
SELECT COUNT(*) as invalid_dates 
FROM staging_bills 
WHERE bill_date !~ '^\d{4}-\d{2}-\d{2}$';

-- Check amount format
SELECT COUNT(*) as invalid_amounts 
FROM staging_bills 
WHERE total_amount IS NULL OR total_amount = '';
```

### Step 4.2: Post-Import Validation

After import, verify data integrity:

```sql
-- 1. Count comparison
SELECT COUNT(*) as total_bills 
FROM staging_bills;

SELECT COUNT(*) as imported_bills 
FROM orders 
WHERE organization_id = 2 
  AND created_at >= NOW() - INTERVAL '1 hour';

-- 2. Check for orphaned records
SELECT COUNT(*) as bills_without_customer 
FROM orders 
WHERE customer_id IS NULL 
  AND organization_id = 2 
  AND created_at >= NOW() - INTERVAL '1 hour';

-- 3. Verify amounts
SELECT 
  SUM(CAST(total_amount AS DECIMAL(15,2))) as staging_total,
  (SELECT SUM(total_amount) FROM orders WHERE organization_id = 2 AND created_at >= NOW() - INTERVAL '1 hour') as imported_total;

-- 4. Status distribution
SELECT status, COUNT(*) 
FROM orders 
WHERE organization_id = 2 
GROUP BY status;
```

---

## Part 5: Import Procedure (Detailed Steps)

### Step 5.1: Prepare Environment

```bash
# 1. Create backup of production database
pg_dump your_db > /backups/backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# 2. Create staging schema (isolated from production)
psql your_db -c "CREATE SCHEMA IF NOT EXISTS staging;"

# 3. Verify database connection
psql -c "SELECT version();" your_db
```

### Step 5.2: Execute Import

```bash
# Option 1: Using SQL migration script
psql your_db < /tmp/migration_script.sql

# Option 2: Using Node.js script
node migration/importBills.js
node migration/importCustomers.js
node migration/importProducts.js
node migration/importInventory.js
node migration/importEmployees.js
```

### Step 5.3: Monitor Progress

```bash
# Watch import progress (in separate terminal)
watch -n 5 'psql your_db -c "SELECT COUNT(*) FROM orders WHERE organization_id = 2;"'

# Check for errors
tail -f /var/log/migration.log
```

---

## Part 6: Data Reconciliation

### Step 6.1: Reconciliation Checklist

After import is complete, verify everything:

```
RECONCILIATION CHECKLIST
========================

BILLS/ORDERS:
[ ] Total count matches: staging_bills vs orders
[ ] Total amount matches: SUM(staging) vs SUM(imported)
[ ] All bills have valid status
[ ] All bills linked to customers (or marked as walk-in)
[ ] Date range is correct (no future dates)

CUSTOMERS:
[ ] Total count: previous system vs new system
[ ] No duplicate customers
[ ] Required fields: name, phone (populated)
[ ] Credit limits created for applicable customers
[ ] Customer types assigned correctly

PRODUCTS:
[ ] Total count: 20,000 products imported
[ ] All products have SKU
[ ] All products linked to category
[ ] Inventory quantities match (if tracking quantity in products)
[ ] No duplicate SKUs

VENDORS:
[ ] Total count: 10 vendors
[ ] Contact information complete
[ ] Payment terms created
[ ] All vendors active/status correct

INVENTORY:
[ ] Total quantity matches
[ ] Warehouse assignments correct
[ ] Stock levels realistic
[ ] No negative quantities

EMPLOYEES:
[ ] All users migrated
[ ] Departments assigned
[ ] Salary structures created
[ ] Commission rules in place

FINANCIAL:
[ ] Outstanding receivables calculated
[ ] Aging report shows correct data
[ ] JV payments reconciled
[ ] No duplicate transactions
```

### Step 6.2: Sample Reconciliation Queries

```sql
-- Bills Reconciliation
SELECT 
  'Bills' as object_type,
  (SELECT COUNT(*) FROM staging_bills) as source_count,
  (SELECT COUNT(*) FROM orders WHERE organization_id = 2) as target_count,
  (SELECT COUNT(*) FROM staging_bills) - (SELECT COUNT(*) FROM orders WHERE organization_id = 2) as difference;

-- Customers Reconciliation
SELECT 
  'Customers' as object_type,
  (SELECT COUNT(*) FROM staging_customers) as source_count,
  (SELECT COUNT(*) FROM customers WHERE organization_id = 2) as target_count,
  (SELECT COUNT(*) FROM staging_customers) - (SELECT COUNT(*) FROM customers WHERE organization_id = 2) as difference;

-- Amount Reconciliation
SELECT 
  'Total Amount' as object_type,
  (SELECT SUM(CAST(total_amount AS DECIMAL(15,2))) FROM staging_bills) as source_total,
  (SELECT SUM(total_amount) FROM orders WHERE organization_id = 2) as target_total;
```

---

## Part 7: Common Issues & Solutions

### Issue 1: "Customer Not Found" Errors

**Symptom:** Bills can't be linked to customers

**Solution:**
```sql
-- 1. Find problematic entries
SELECT DISTINCT customer_name 
FROM staging_bills 
WHERE customer_name NOT IN (
  SELECT name FROM customers WHERE organization_id = 2
);

-- 2. Option A: Create missing customers
INSERT INTO customers (organization_id, name, status)
SELECT DISTINCT sb.customer_name, 2, 'ACTIVE'
FROM staging_bills sb
WHERE sb.customer_name NOT IN (
  SELECT name FROM customers WHERE organization_id = 2
)
AND sb.customer_name IS NOT NULL;

-- 3. Option B: Use fuzzy matching for typos
SELECT 
  DISTINCT sb.customer_name as source,
  c.name as target,
  similarity(sb.customer_name, c.name) as match_score
FROM staging_bills sb, customers c
WHERE c.organization_id = 2
  AND similarity(sb.customer_name, c.name) > 0.7
ORDER BY match_score DESC;
```

### Issue 2: Date Format Problems

**Symptom:** "invalid input syntax for type timestamp"

**Solution:**
```sql
-- 1. Identify problematic dates
SELECT DISTINCT bill_date 
FROM staging_bills 
WHERE bill_date !~ '^\d{4}-\d{2}-\d{2}$'
LIMIT 10;

-- 2. Convert various formats
SELECT 
  bill_date,
  CASE 
    WHEN bill_date ~ '^\d{4}-\d{2}-\d{2}$' THEN TO_TIMESTAMP(bill_date, 'YYYY-MM-DD')
    WHEN bill_date ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_TIMESTAMP(bill_date, 'DD/MM/YYYY')
    WHEN bill_date ~ '^\d{2}-\d{2}-\d{4}$' THEN TO_TIMESTAMP(bill_date, 'DD-MM-YYYY')
    ELSE NULL
  END as converted_date
FROM staging_bills;
```

### Issue 3: Duplicate Records

**Symptom:** Duplicate entries after import

**Solution:**
```sql
-- 1. Find duplicates
SELECT bill_number, COUNT(*) as count
FROM orders 
WHERE organization_id = 2 
GROUP BY bill_number 
HAVING COUNT(*) > 1;

-- 2. Remove duplicates (keep first occurrence)
DELETE FROM orders o1
WHERE organization_id = 2
  AND id NOT IN (
    SELECT MIN(id)
    FROM orders o2
    WHERE o1.bill_number = o2.bill_number
      AND o2.organization_id = 2
    GROUP BY bill_number
  );
```

### Issue 4: Amount Rounding Issues

**Symptom:** Total amounts don't match source

**Solution:**
```sql
-- 1. Check precision
SELECT 
  bill_number,
  CAST(staging_total AS NUMERIC(15,2)) as staging_rounded,
  imported_total,
  ABS(CAST(staging_total AS NUMERIC(15,2)) - imported_total) as difference
FROM (
  SELECT 
    sb.bill_number,
    sb.total_amount as staging_total,
    o.total_amount as imported_total
  FROM staging_bills sb
  JOIN orders o ON o.bill_number = sb.bill_number
) t
WHERE difference > 0.01;

-- 2. Fix: Re-import with correct rounding
UPDATE orders o
SET total_amount = (
  SELECT ROUND(CAST(total_amount AS NUMERIC(15,2)), 2)
  FROM staging_bills sb
  WHERE sb.bill_number = o.bill_number
)
WHERE organization_id = 2;
```

---

## Part 8: Rollback Procedure

If migration fails, use this to restore:

```bash
# 1. Stop application
sudo systemctl stop your_app

# 2. Restore from backup
pg_restore -d your_db /backups/backup_before_migration_YYYYMMDD_HHMMSS.sql

# 3. Verify restoration
psql your_db -c "SELECT COUNT(*) FROM orders;"

# 4. Restart application
sudo systemctl start your_app

# 5. Investigate what went wrong
# - Review migration log
# - Check data format issues
# - Adjust transformation logic
# - Re-attempt migration
```

---

## Part 9: Migration Checklist

```
PRE-MIGRATION:
[ ] Backup database: /backups/backup_before_migration_*.sql
[ ] Document all data sources
[ ] Assess data quality
[ ] Create mapping document
[ ] Prepare transformation scripts
[ ] Test with sample data (100 records first)
[ ] Get stakeholder approval

EXECUTION:
[ ] Create staging tables
[ ] Import source data
[ ] Run validation checks
[ ] Fix data issues
[ ] Run transformation scripts
[ ] Monitor for errors
[ ] Document import statistics

POST-MIGRATION:
[ ] Verify record counts
[ ] Reconcile amounts
[ ] Check data integrity
[ ] Test all screens in UI
[ ] Verify reports
[ ] Train users on new system
[ ] Archive source files
[ ] Document issues & solutions
```

---

## Part 10: Migration Command Reference

### Quick Commands

```bash
# 1. Export from previous system
# (Customize based on your source system)
mysqldump old_db > /tmp/old_data.sql
# OR
psql old_db -c "COPY (SELECT * FROM bills) TO STDOUT WITH CSV HEADER" > /tmp/bills.csv

# 2. Prepare new database
psql new_db -c "CREATE SCHEMA staging;"

# 3. Import
psql new_db < migration_script.sql
# OR
node migration/importData.js

# 4. Validate
psql new_db -c "\i validation_queries.sql"

# 5. Reconcile
psql new_db -c "\i reconciliation_queries.sql"

# 6. Clean staging (after successful validation)
psql new_db -c "DROP SCHEMA staging CASCADE;"
```

---

## Questions to Identify Your Data Sources

To customize this procedure, please answer:

1. **What software/system are you currently using?**
   - [ ] Excel/CSV files
   - [ ] Accounting software (QuickBooks, Xero, Tally, etc)
   - [ ] Custom database (MySQL/SQL Server/PostgreSQL)
   - [ ] Cloud-based ERP (SAP, Oracle, NetSuite, etc)
   - [ ] Other: _______________

2. **How is your data currently organized?**
   - [ ] Single database
   - [ ] Multiple spreadsheets
   - [ ] Mix of systems
   - [ ] Paper records (needs digitization)

3. **Can you export your data?**
   - [ ] Full database dump available
   - [ ] CSV/Excel export available
   - [ ] API access available
   - [ ] Manual export required

4. **What's your data volume?**
   - Bills: ___________
   - Products: ___________
   - Customers: ___________
   - Vendors: ___________
   - Transactions: ___________

5. **Timeline for migration?**
   - [ ] Before go-live (clean migration)
   - [ ] Parallel run (both systems)
   - [ ] Phased approach (by business unit)

---

**Next:** Customize this template based on your answers and we'll create your specific migration scripts.
