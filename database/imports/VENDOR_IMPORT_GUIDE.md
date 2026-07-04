# Vendor Data Import Guide
**For:** Ghazanfar ERP System  
**Import Script:** `importVendors.js`  
**Date:** 2026-07-04

---

## Quick Start (2 minutes)

```bash
# 1. Prepare your vendor data as CSV
# (See section "How to Prepare Your Vendor Data" below)

# 2. Place in correct folder
cp ~/Downloads/Vendors.csv database/imports/

# 3. Run import
node database/imports/importVendors.js

# 4. Check results
✅ View console output for reconciliation report
```

---

## Part 1: Excel → CSV Conversion

### Step 1: Open Your Vendor Excel File

In Excel:
```
File → Save As → Format: CSV UTF-8 (.csv)
Save location: D:\ghazanfar-erp-backend\database\imports\Vendors.csv
```

**Important:** Use **CSV UTF-8** format, not "CSV" or "CSV Macintosh"

---

## Part 2: Required & Optional Columns

### REQUIRED Columns:
```
✅ Vendor Name (unique - no duplicates)
```

That's it! Only one required field for basic setup.

### RECOMMENDED Columns:
```
Contact Person
Phone
Email
Address / City
Category / Vendor Type
Payment Terms
Days Allowed (payment terms)
Status (Active/Inactive)
```

### OPTIONAL - Performance Metrics:
```
Quality Rating (1-5)
On Time Delivery % (0-100)
```

---

## Part 3: Data Format Examples

### Minimal Setup (Only Required Fields)

```csv
Vendor Name
TechSupply Ltd
Global Traders
Prime Distributors
Quality Imports
Urban Supplies
```

### Complete Setup (With All Details)

```csv
Vendor Name,Contact Person,Phone,Email,Address,Category,Payment Terms,Days Allowed,Quality Rating,On Time Delivery %,Status
TechSupply Ltd,Ahmad Khan,0300-1234567,contact@techsupply.pk,Karachi,Wholesaler,Net 30,30,4.8,95.5,Active
Global Traders,Fatima Ali,0321-9876543,info@globaltraders.pk,Lahore,Distributor,Net 15,15,4.5,92.0,Active
Prime Distributors,Muhammad Hassan,0333-5555555,sales@primedist.pk,Islamabad,Manufacturer,Net 45,45,4.9,98.0,Active
Quality Imports,Aisha Malik,0345-7777777,contact@qualityimports.pk,Multan,Supplier,COD,0,4.2,88.5,Active
Urban Supplies,Bilal Ahmed,0300-2222222,support@urbansupplies.pk,Rawalpindi,Wholesaler,Net 30,30,4.7,96.0,Active
Standard Manufacturing,Nida Khan,0321-3333333,info@standardmfg.pk,Hyderabad,Manufacturer,Net 14,14,4.3,91.0,Active
Excel Traders,Ali Raza,0333-4444444,hello@exceltraders.pk,Quetta,Wholesaler,Net 30,30,4.6,94.5,Active
Premier Wholesale,Hina Mirza,0300-8888888,wholesale@premierinc.pk,Peshawar,Distributor,Net 30,30,4.4,89.0,Active
Direct Imports Inc,Usman Ali,0345-9999999,trade@directimports.pk,Sialkot,Supplier,COD,0,4.8,97.0,Active
Galaxy Distribution,Sara Khan,0321-1111111,distribution@galaxy.pk,Gujranwala,Wholesaler,Net 30,30,4.5,93.5,Active
```

---

## Part 4: Field Mapping & Format Rules

### Vendor Name
```
Column: "Vendor Name" (Required)
Format: Text (max 100 characters)
Rules:
  ✅ Must be unique (no duplicates)
  ✅ No leading/trailing spaces
  ✅ Examples: "TechSupply Ltd", "Global Traders"
```

### Contact Person
```
Column: "Contact Person" OR "Contact Name"
Format: Text (max 100 characters)
Rules:
  ✅ First and Last name recommended
  ✅ Examples: "Ahmad Khan", "Fatima Ali"
```

### Phone
```
Column: "Phone" OR "Mobile" OR "Phone Number"
Format: Text (max 20 characters)
Rules:
  ✅ Include country code preferred: +92 or 0300
  ✅ Examples: "0300-1234567", "+92-300-1234567"
```

### Email
```
Column: "Email"
Format: Valid email address
Rules:
  ✅ Must contain @
  ✅ Examples: "contact@techsupply.pk"
```

### Address / City
```
Column: "Address" OR "City" OR "Location"
Format: Text
Rules:
  ✅ Street address + city recommended
  ✅ Examples: "Karachi, Pakistan", "123 Main St, Lahore"
```

### Category / Vendor Type
```
Column: "Category" OR "Vendor Type"
Format: Text - One of these values:
  ✅ Wholesaler
  ✅ Distributor
  ✅ Manufacturer
  ✅ Supplier
  ✅ Service Provider
  
Rules:
  ✅ Case-insensitive (will normalize)
  ✅ Partial matches work: "wholesale", "dist", "mfg"
  ✅ Default if missing: Wholesaler
```

### Payment Terms
```
Column: "Payment Terms"
Format: Text
Examples:
  ✅ "Net 30"
  ✅ "Net 15"
  ✅ "Net 45"
  ✅ "COD" (Cash on Delivery)
  ✅ "2/10 Net 30" (2% discount if paid in 10 days)
```

### Days Allowed
```
Column: "Days Allowed"
Format: Number (0-365)
Rules:
  ✅ Number of days for payment terms
  ✅ Examples: 30, 15, 45, 0 (for COD)
  ✅ Default if missing: 30
```

### Quality Rating
```
Column: "Quality Rating"
Format: Decimal 0.0 to 5.0
Rules:
  ✅ 5 = Excellent, 4 = Good, 3 = Average, 2 = Poor, 1 = Very Poor
  ✅ Examples: "4.8", "4.5", "5"
  ✅ Optional field
```

### On Time Delivery %
```
Column: "On Time Delivery %" OR "On Time Delivery"
Format: Number 0-100
Rules:
  ✅ Percentage of on-time deliveries
  ✅ Optional - Include % symbol or not
  ✅ Examples: "95.5", "95.5%", "95"
```

### Status
```
Column: "Status"
Format: "Active" or "Inactive"
Rules:
  ✅ Case-insensitive
  ✅ Default if missing: Active
  ✅ Only "Inactive" sets inactive (any other value = Active)
```

---

## Part 5: Example Files

### Example 1: Minimal (Just Names)

📄 Save as: `Vendors_minimal.csv`

```csv
Vendor Name
ABC Supply
XYZ Traders
123 Imports
Quality Goods
Premium Distribution
```

### Example 2: Standard (Most Common)

📄 Save as: `Vendors.csv`

```csv
Vendor Name,Contact Person,Phone,Email,Address,Category,Payment Terms,Days Allowed
TechSupply Ltd,Ahmad Khan,0300-1234567,contact@techsupply.pk,Karachi,Wholesaler,Net 30,30
Global Traders,Fatima Ali,0321-9876543,info@globaltraders.pk,Lahore,Distributor,Net 15,15
Prime Distributors,Muhammad Hassan,0333-5555555,sales@primedist.pk,Islamabad,Manufacturer,Net 45,45
Quality Imports,Aisha Malik,0345-7777777,contact@qualityimports.pk,Multan,Supplier,COD,0
Urban Supplies,Bilal Ahmed,0300-2222222,support@urbansupplies.pk,Rawalpindi,Wholesaler,Net 30,30
```

### Example 3: Complete (With Performance Metrics)

📄 Save as: `Vendors_full.csv`

```csv
Vendor Name,Contact Person,Phone,Email,Address,Category,Payment Terms,Days Allowed,Quality Rating,On Time Delivery %,Status
TechSupply Ltd,Ahmad Khan,0300-1234567,contact@techsupply.pk,Karachi,Wholesaler,Net 30,30,4.8,95.5,Active
Global Traders,Fatima Ali,0321-9876543,info@globaltraders.pk,Lahore,Distributor,Net 15,15,4.5,92.0,Active
Prime Distributors,Muhammad Hassan,0333-5555555,sales@primedist.pk,Islamabad,Manufacturer,Net 45,45,4.9,98.0,Active
Quality Imports,Aisha Malik,0345-7777777,contact@qualityimports.pk,Multan,Supplier,COD,0,4.2,88.5,Active
Urban Supplies,Bilal Ahmed,0300-2222222,support@urbansupplies.pk,Rawalpindi,Wholesaler,Net 30,30,4.7,96.0,Active
Standard Manufacturing,Nida Khan,0321-3333333,info@standardmfg.pk,Hyderabad,Manufacturer,Net 14,14,4.3,91.0,Active
Excel Traders,Ali Raza,0333-4444444,hello@exceltraders.pk,Quetta,Wholesaler,Net 30,30,4.6,94.5,Active
Premier Wholesale,Hina Mirza,0300-8888888,wholesale@premierinc.pk,Peshawar,Distributor,Net 30,30,4.4,89.0,Active
Direct Imports Inc,Usman Ali,0345-9999999,trade@directimports.pk,Sialkot,Supplier,COD,0,4.8,97.0,Active
Galaxy Distribution,Sara Khan,0321-1111111,distribution@galaxy.pk,Gujranwala,Wholesaler,Net 30,30,4.5,93.5,Active
```

---

## Part 6: How to Prepare Your Data

### Step 1: Export from Old System

**If from SQL Database:**
```sql
SELECT 
    vendor_name as 'Vendor Name',
    contact_person as 'Contact Person',
    phone,
    email,
    address,
    vendor_type as 'Category',
    payment_terms as 'Payment Terms',
    days_allowed as 'Days Allowed'
FROM vendors
WHERE status = 'active'
INTO OUTFILE '/tmp/vendors.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

**If from Excel:**
1. Open existing vendor file
2. Select all data (Ctrl+A)
3. Copy
4. Paste into new CSV file
5. Save as UTF-8 CSV

### Step 2: Clean the Data

```
✅ REMOVE:
  □ Empty rows
  □ Duplicate vendors
  □ Test/sample vendors
  □ Inactive vendors (unless you want to import them)
  □ Any extra columns

✅ STANDARDIZE:
  □ Vendor names: Trim spaces
  □ Phone: Consistent format (0300-1234567 or 0321-9876543)
  □ Categories: Use standard names (Wholesaler, Distributor, etc)
  □ Status: Active or Inactive
```

### Step 3: Validate in Excel

```
Data → Conditional Formatting → Duplicate Values
# This highlights duplicate vendor names

Sort → By Vendor Name
# Check for variations (e.g., "ABC Supply" vs "ABC Supplies")
```

### Step 4: Export as CSV

```
File → Save As
Format: CSV UTF-8 (.csv)
Filename: Vendors.csv
Location: D:\ghazanfar-erp-backend\database\imports\
```

---

## Part 7: Run the Import

### Command:
```bash
node database/imports/importVendors.js
```

### What Happens:

1. **Reads** Vendors.csv
2. **Validates** each row for required fields
3. **Creates** vendor categories automatically
4. **Inserts** vendors into database
5. **Creates** payment terms for each vendor
6. **Creates** performance records if ratings provided
7. **Generates** reconciliation report

### Sample Output:

```
============================================================
🔄 VENDOR IMPORT - Starting...
============================================================

✅ Read 10 vendors from CSV

📦 Setting up vendor categories...
✅ Categories ready: Wholesaler, Distributor, Manufacturer, Supplier, Service Provider

🔍 Validating vendor data...

📊 Validation Summary:
   ✅ Valid records: 10
   ❌ Invalid records: 0

🔎 Checking for duplicates...
✅ Found 0 duplicate vendors (will skip)

💾 Inserting vendors into database...

⏳ Inserted 5 vendors...
⏳ Inserted 10 vendors...

============================================================
✅ VENDOR IMPORT COMPLETE
============================================================

📊 Results:
   Total records in CSV: 10
   Valid format: 10
   Duplicates skipped: 0
   Successfully inserted: 10
   Insertion errors: 0
   Invalid format: 0

📈 Database Status:
   Total vendors: 10
   Payment terms created: 10
   Performance records: 10

✅ Ready for Purchase Orders!
```

---

## Part 8: What Gets Created

After import, your database will have:

### Vendors Table (10 new records)
```
✅ Vendor names and contact info
✅ Phone, email, address
✅ Active status
```

### Vendor Categories (5 default categories)
```
✅ Wholesaler
✅ Distributor
✅ Manufacturer
✅ Supplier
✅ Service Provider
```

### Vendor Payment Terms (per vendor)
```
Example:
  TechSupply Ltd → Net 30 (payment due in 30 days)
  Quality Imports → COD (cash on delivery)
```

### Vendor Performance (if ratings provided)
```
✅ Quality rating (1-5)
✅ On-time delivery percentage
✅ Overall score (calculated average)
✅ Last assessment date
```

---

## Part 9: Verify Import

After import, verify in database:

### SQL Query to Check:
```sql
-- See all imported vendors
SELECT id, name, phone, email, status 
FROM vendors 
WHERE organization_id = 2 
ORDER BY name;

-- Count vendors by category
SELECT COUNT(*) as total_vendors FROM vendors WHERE organization_id = 2;

-- See payment terms
SELECT v.name, vpt.term_type, vpt.days_allowed
FROM vendors v
JOIN vendor_payment_terms vpt ON v.id = vpt.vendor_id
WHERE v.organization_id = 2;

-- See performance ratings
SELECT v.name, vp.quality_rating, vp.on_time_delivery_percentage, vp.overall_score
FROM vendors v
LEFT JOIN vendor_performance vp ON v.id = vp.vendor_id
WHERE v.organization_id = 2;
```

---

## Part 10: Troubleshooting

### Problem: "File not found"
```
✅ Solution: 
  1. Make sure file is at: database/imports/Vendors.csv
  2. File name is exactly "Vendors.csv" (case-sensitive)
  3. Check spelling
```

### Problem: "No records found"
```
✅ Solution:
  1. Check that CSV has data (not just headers)
  2. Verify encoding is UTF-8
  3. Try opening in Excel to verify data
```

### Problem: "Invalid format" errors
```
✅ Solution:
  1. Check required columns: Vendor Name
  2. Remove empty rows in CSV
  3. Check for special characters causing issues
```

### Problem: Duplicate vendors not skipped
```
✅ Solution:
  1. Check spelling - must match EXACTLY
  2. Remove trailing spaces
  3. Check case sensitivity
```

### Problem: Payment terms not created
```
✅ Solution:
  1. Check "Payment Terms" column name
  2. Check "Days Allowed" is a number
  3. Verify format (e.g., "Net 30", "COD")
```

---

## Part 11: Next Steps After Vendor Import

After vendors are successfully imported:

### 1. **Verify Vendor Data**
```bash
npm run db:seed:vendors-check
# (or use SQL query from Part 9)
```

### 2. **Import Products**
```bash
node database/imports/importProducts.js
```

### 3. **Create Vendor-Product Links**
```bash
node database/imports/linkVendorsToProducts.js
```

### 4. **Import Purchase Orders**
```bash
node database/imports/importPurchaseOrders.js
```

---

## Part 12: Your Vendor Data?

**Please tell me:**

1. **How many vendors?** (You mentioned ~10?)
2. **Do you have a vendor list ready?**
3. **What information do you track?**
   - Name only?
   - Contact person + phone?
   - Categories/types?
   - Payment terms?
   - Quality ratings?
4. **Can you export your current vendor data?**
   - As CSV?
   - As Excel?
   - Share format?

---

**Once you provide your vendor CSV, I'll:**
✅ Test the import with your actual data  
✅ Create a reconciliation report  
✅ Set up payment terms  
✅ Create vendor performance records  
✅ Link to products (when ready)

**Ready to import your vendors?**
