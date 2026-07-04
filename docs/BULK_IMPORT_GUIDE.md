# Bulk Import Utilities Guide

## Overview

The bulk import system allows you to import large datasets from CSV files for Bills, Purchase Orders, Customers, Vendors, and Inventory. It includes comprehensive validation and error reporting.

## Supported Import Types

### 1. Bills Import
Import customer bills/invoices in bulk.

**Endpoint**: `POST /import-export/import/bills`

**CSV Template**:
```csv
bill_number,bill_date,customer_email,channel,subtotal,total_amount,payment_method,status
BILL-2026-070001,2026-07-01,customer@email.com,COUNTER,100000,117000,BANK_TRANSFER,APPROVED
```

**Required Fields**:
- `bill_number`: Unique bill identifier (e.g., BILL-2026-070001)
- `customer_email`: Valid customer email
- `total_amount`: Bill total (numeric)

**Optional Fields**:
- `bill_date`: Date of bill (defaults to today)
- `channel`: COUNTER, WHOLESALE, RETAIL, WEBSITE
- `payment_method`: BANK_TRANSFER, CASH, CHECK, CREDIT_CARD
- `status`: DRAFT, PENDING_APPROVAL, APPROVED, PAID, CANCELLED

**Response**:
```json
{
  "success": true,
  "totalRows": 100,
  "importedRows": 98,
  "failedRows": 2,
  "skippedRows": 0,
  "errors": [
    {
      "row": 45,
      "column": "customer_email",
      "error": "Customer not found",
      "value": "nonexistent@email.com"
    }
  ],
  "warnings": [],
  "timestamp": "2026-07-04T10:30:00Z",
  "duration": 5234
}
```

### 2. Purchase Orders Import
Import purchase orders in bulk.

**Endpoint**: `POST /import-export/import/purchase-orders`

**CSV Template**:
```csv
po_number,vendor_name,expected_delivery_date,status
PO-2026-00001,Premium Textile Mills,2026-07-15,SENT
```

**Required Fields**:
- `po_number`: Unique PO identifier
- `vendor_name`: Valid vendor name
- `expected_delivery_date`: Expected delivery date

**Optional Fields**:
- `status`: DRAFT, SENT, PARTIAL_RECEIVED, RECEIVED, CANCELLED

### 3. Customers Import
Import customer records in bulk.

**Endpoint**: `POST /import-export/import/customers`

**CSV Template**:
```csv
name,email,phone,customerType,isActive
ABC Trading,abc@trading.com,+92-300-1234567,WHOLESALE,true
```

**Required Fields**:
- `name`: Customer business name
- `email`: Valid email address (unique per organization)

**Optional Fields**:
- `phone`: Contact phone number
- `customerType`: RETAIL, WHOLESALE, WALKIN
- `isActive`: true/false (defaults to true)

### 4. Vendors Import
Import vendor/supplier records in bulk.

**Endpoint**: `POST /import-export/import/vendors`

**CSV Template**:
```csv
name,email,phone,isActive
Premium Supplier,premium@supply.com,+92-321-9876543,true
```

**Required Fields**:
- `name`: Vendor business name
- `email`: Valid email address

**Optional Fields**:
- `phone`: Contact phone
- `isActive`: true/false

### 5. Inventory Import
Import or update inventory levels.

**Endpoint**: `POST /import-export/import/inventory`

**CSV Template**:
```csv
product_code,warehouse_name,quantity
MCR-001,Main Distribution Center,150
GCS-001,Regional Storage,200
```

**Required Fields**:
- `product_code`: Valid product code
- `warehouse_name`: Valid warehouse name
- `quantity`: Stock quantity (numeric)

## API Usage Examples

### cURL

```bash
# Upload bills from CSV file
curl -X POST http://localhost:3000/import-export/import/bills \
  -H "Content-Type: application/json" \
  -d '{
    "csvData": "bill_number,bill_date,customer_email,...\n..."
  }'

# Upload customers from file
curl -X POST http://localhost:3000/import-export/import/customers \
  -F "file=@customers.csv"
```

### JavaScript/Fetch

```javascript
// Read CSV file and import
async function importBills(file) {
  const csvData = await file.text();
  
  const response = await fetch('/import-export/import/bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvData })
  });
  
  const result = await response.json();
  return result;
}
```

### NestJS/Service

```typescript
import { BulkImportService } from './bulk-import.service';

@Injectable()
export class MyImportService {
  constructor(private importService: BulkImportService) {}

  async importBillsCSV(orgId: number, csvData: string) {
    return await this.importService.importBillsFromCSV(orgId, csvData);
  }
}
```

## CSV Format Guidelines

### General Rules
1. **Headers**: First row must contain column names
2. **Encoding**: Use UTF-8 encoding
3. **Delimiter**: Comma (,) as separator
4. **Line Endings**: LF or CRLF (both supported)
5. **Quoted Fields**: Quote fields containing commas: `"Field, with comma"`

### Data Types

| Type | Format | Example |
|------|--------|---------|
| String | Plain text | John Doe |
| Email | email@domain.com | user@company.com |
| Phone | +92-XXX-XXXXXXX | +92-300-1234567 |
| Date | YYYY-MM-DD | 2026-07-04 |
| Currency | Decimal | 10000.50 |
| Integer | Whole number | 100 |
| Boolean | true/false | true |

### Example: Bills CSV

```csv
bill_number,bill_date,customer_email,channel,subtotal,total_amount,payment_method,status,notes
BILL-2026-070001,2026-07-01,acme@wholesale.com,COUNTER,100000,117000,BANK_TRANSFER,APPROVED,Sample bill
BILL-2026-070002,2026-07-02,makki@retail.com,COUNTER,50000,58500,CASH,APPROVED,Retail sale
BILL-2026-070003,2026-07-03,global@wholesale.com,WHOLESALE,200000,234000,BANK_TRANSFER,PENDING_APPROVAL,Large order
```

## Validation Rules

### Common Validations
- ✅ Required fields present
- ✅ Data types correct (email format, numeric values, dates)
- ✅ Foreign key references exist (customer, vendor, product)
- ✅ Values within acceptable ranges
- ✅ No duplicate records (when applicable)
- ❌ Skipped if already exists (unless overwrite=true)

### Field-Specific Validations

**Email Fields**:
- Must match format: name@domain.com
- Must be unique per organization
- Case-insensitive comparison

**Phone Fields**:
- Optional field
- Format: +92-XXX-XXXXXXX or 03XX-XXXXXXX
- No spaces required

**Numeric Fields**:
- Must be valid numbers
- Currency fields: 2 decimal places
- Quantities: whole numbers

**Date Fields**:
- Format: YYYY-MM-DD (ISO 8601)
- Must be valid date
- Cannot be in future (for past events)

**Enum Fields**:
- Must be valid option
- Case-sensitive
- Cannot be empty

## Error Handling

### Error Types

**Missing Required Field**:
```json
{
  "row": 5,
  "error": "Missing required fields: bill_number, customer_email, total_amount"
}
```

**Invalid Reference**:
```json
{
  "row": 12,
  "column": "customer_email",
  "error": "Customer not found",
  "value": "nonexistent@email.com"
}
```

**Invalid Data Type**:
```json
{
  "row": 8,
  "column": "total_amount",
  "error": "Invalid numeric value",
  "value": "NOT_A_NUMBER"
}
```

**Duplicate Record**:
```json
{
  "row": 20,
  "column": "bill_number",
  "error": "Bill number already exists",
  "value": "BILL-2026-070001"
}
```

### Error Recovery

The import system continues processing even when errors occur:

```json
{
  "success": false,
  "totalRows": 100,
  "importedRows": 95,
  "failedRows": 5,
  "errors": [/* detailed errors */],
  "warnings": ["Row 45: Duplicate customer, skipped"]
}
```

**To recover from errors**:
1. Review the error report
2. Fix issues in source CSV
3. Remove successfully imported rows (if re-importing)
4. Re-upload the corrected file

## Advanced Features

### Validation Before Import

Pre-validate CSV without importing:

```bash
curl -X POST http://localhost:3000/import-export/validate \
  -H "Content-Type: application/json" \
  -d '{
    "csvData": "...",
    "expectedColumns": ["bill_number", "customer_email", "total_amount"]
  }'
```

Response:
```json
{
  "valid": true,
  "errors": []
}
```

### Batch Import

Import multiple CSV files in sequence:

```typescript
const files = [bills.csv, customers.csv, vendors.csv];

for (const file of files) {
  const csvData = await readFile(file);
  const result = await importService.importBillsFromCSV(orgId, csvData);
  console.log(`Imported ${result.importedRows} rows from ${file}`);
}
```

### Custom Validation

Extend validation for business rules:

```typescript
async customValidate(record: any): Promise<ValidationError[]> {
  const errors = [];
  
  // Validate credit limit
  if (record.creditLimit < 50000) {
    errors.push({
      field: 'creditLimit',
      message: 'Minimum credit limit is 50,000'
    });
  }
  
  return errors;
}
```

## Performance Considerations

### Large File Handling

For files with 10,000+ rows:

1. **Stream Processing**: Process rows in batches
   ```typescript
   const batchSize = 1000;
   for (let i = 0; i < records.length; i += batchSize) {
     await processBatch(records.slice(i, i + batchSize));
   }
   ```

2. **Database Optimization**: Use bulk insert
   ```typescript
   await prisma.bill.createMany({
     data: records,
     skipDuplicates: true
   });
   ```

3. **Memory Management**: Clear processed records
   ```typescript
   records = null; // Force garbage collection
   ```

### Expected Processing Times

| File Size | Duration | Notes |
|-----------|----------|-------|
| 100 rows | 1-2s | Fast |
| 1,000 rows | 10-20s | Normal |
| 10,000 rows | 2-5 min | Stream processing |
| 100,000 rows | 20-40 min | Requires optimization |

## Template Files

CSV template files are provided:

```
database/imports/templates/
├── bills-template.csv
├── purchase-orders-template.csv
├── customers-template.csv
├── vendors-template.csv
└── inventory-template.csv
```

Use these templates as starting points for your imports.

## Best Practices

1. **Validate First**: Always validate CSV before importing
2. **Small Batches**: Import in smaller chunks to track issues
3. **Backup Data**: Back up existing data before large imports
4. **Test Environment**: Test on development first
5. **Monitor Duplicates**: Watch for duplicate entries
6. **Audit Trail**: All imports are logged in audit tables
7. **Error Reports**: Keep error reports for reference

## Troubleshooting

### Issue: Customer not found

**Solution**: Ensure customer exists in organization
```sql
SELECT * FROM "Customer" WHERE "organizationId" = 1 AND email = 'customer@email.com';
```

### Issue: Encoding errors

**Solution**: Ensure CSV is UTF-8 encoded
```bash
# Convert to UTF-8 if needed
iconv -f ISO-8859-1 -t UTF-8 input.csv > output.csv
```

### Issue: Date parsing errors

**Solution**: Use ISO 8601 format (YYYY-MM-DD)
```
INCORRECT: 07/04/2026 or 4/7/2026
CORRECT: 2026-07-04
```

## Related Resources

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Initial setup guide
- [DATA_ARCHIVAL_GUIDE.md](./DATA_ARCHIVAL_GUIDE.md) - Data cleanup and retention
- API Documentation: `/api/docs` endpoint
