# Inventory Operations API - Testing Guide

## Prerequisites

1. Backend running on `http://localhost:3000`
2. Valid JWT token from authentication
3. Valid organization and user context

## Test Sequence

### 1. Create Inventory Record

**Create an inventory for Product ID 1 in Warehouse ID 1 with opening balance of 100**

```bash
curl -X POST http://localhost:3000/api/v1/inventory/operations/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "warehouseId": 1,
    "openingBalance": 100
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "organizationId": 1,
  "productId": 1,
  "warehouseId": 1,
  "physical_on_hand": 100,
  "reserved": 0,
  "available": 100,
  "opening_balance": 100,
  "Product": { "code": "SKU001", "name": "Product A" },
  "warehouse": { "name": "Main Warehouse" }
}
```

**Save:** `inventoryId = 1`

---

### 2. Stock In - Receive Purchase Order

**Receive 50 units from PO-12345**

```bash
curl -X POST http://localhost:3000/api/v1/inventory/operations/stock-in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "warehouseId": 1,
    "quantity": 50,
    "reference": "PO-12345",
    "remarks": "Received from vendor ABC on 2026-07-06"
  }'
```

**Verify Response:**
- `inventory.physical_on_hand = 150`
- `inventory.available = 150`
- `movement.movementType = "STOCK_IN"`
- `movement.quantity = 50`
- `movement.reference = "PO-12345"`

---

### 3. Check Availability

**Check if we can fulfill order of 80 units**

```bash
curl -X POST http://localhost:3000/api/v1/inventory/check-availability \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": 1,
        "warehouseId": 1,
        "requiredQuantity": 80
      }
    ]
  }'
```

**Verify Response:**
- `canFulfillAll = true`
- `results[0].available = 150`
- `results[0].canFulfill = true`

---

### 4. Stock Out - Issue for Sale

**Issue 80 units for Bill-001**

```bash
curl -X POST http://localhost:3000/api/v1/inventory/operations/stock-out \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "warehouseId": 1,
    "quantity": 80,
    "reference": "BILL-001",
    "remarks": "Sold to customer ABC on invoice BILL-001"
  }'
```

**Verify Response:**
- `inventory.physical_on_hand = 70`
- `inventory.available = 70`
- `movement.movementType = "STOCK_OUT"`

---

### 5. Adjust for Damage

**Record 5 units damaged**

```bash
curl -X POST http://localhost:3000/api/v1/inventory/operations/adjust \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "warehouseId": 1,
    "quantityDifference": -5,
    "adjustmentType": "DAMAGE",
    "remarks": "Found damaged during QC inspection"
  }'
```

**Verify Response:**
- `inventory.physical_on_hand = 65`
- `inventory.available = 65`
- `movement.movementType = "DAMAGE"`
- `quantityChanged = -5`

---

### 6. Create Second Warehouse Inventory

**Create inventory in Warehouse 2 for same product (with 0 opening balance)**

```bash
curl -X POST http://localhost:3000/api/v1/inventory/operations/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "warehouseId": 2,
    "openingBalance": 0
  }'
```

**Save:** `inventoryId2 = 2`

---

### 7. Initiate Transfer

**Transfer 20 units from Warehouse 1 to Warehouse 2**

```bash
curl -X POST http://localhost:3000/api/v1/inventory/operations/transfers/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "fromWarehouseId": 1,
    "toWarehouseId": 2,
    "quantity": 20,
    "remarks": "Rebalance inventory between warehouses"
  }'
```

**Verify Response:**
- `transfer.status = "PENDING"`
- `transfer.transferNumber` = generated (TRF-2026-07-06-...)
- `fromInventory.current = 65`
- `toInventory.current = 0`

**Save:** `transferId = transfer.id`

---

### 8. Confirm Transfer

**Warehouse 2 receives and confirms transfer**

```bash
curl -X PATCH http://localhost:3000/api/v1/inventory/operations/transfers/TRANSFER_ID/confirm \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Replace `TRANSFER_ID` with the transferId from step 7.

**Verify Response:**
- `transfer.status = "RECEIVED"`
- `transfer.receivedBy = YOUR_USER_ID`
- `transfer.receivedDate` = current timestamp

**Verify Database State:**
- Warehouse 1: physical_on_hand = 45, available = 45
- Warehouse 2: physical_on_hand = 20, available = 20
- Two movements created: TRANSFER_OUT and TRANSFER_IN

---

### 9. Get Movement History

**View complete movement ledger for Warehouse 1 inventory**

```bash
curl -X GET 'http://localhost:3000/api/v1/inventory/operations/movements/1?limit=50&offset=0' \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify Response Contains:**
- STOCK_IN (50 units from PO-12345)
- STOCK_OUT (80 units for BILL-001)
- DAMAGE (5 units)
- TRANSFER_OUT (20 units)

Expected total movements: 4

---

### 10. Get Transfer History

**View all transfers for organization**

```bash
curl -X GET 'http://localhost:3000/api/v1/inventory/operations/transfers/history' \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify Response Contains:**
- The transfer from Warehouse 1 to Warehouse 2
- Status: RECEIVED
- Both warehouses named correctly

---

### 11. Get Inventory Summary

**View organization-wide inventory overview**

```bash
curl -X GET 'http://localhost:3000/api/v1/inventory/operations/summary' \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify Response:**
- `totalItems = 2` (two inventory records)
- `byWarehouse["Main Warehouse"]`:
  - `totalQty = 45`
  - `totalAvailable = 45`
- `byWarehouse["Secondary Warehouse"]`:
  - `totalQty = 20`
  - `totalAvailable = 20`
- `lowStock = []` (none below 10)

---

## Error Test Cases

### Test 1: Insufficient Stock
```bash
curl -X POST http://localhost:3000/api/v1/inventory/operations/stock-out \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "warehouseId": 1,
    "quantity": 1000,
    "reference": "BILL-999"
  }'
```

**Expected:** 400 Bad Request - "Insufficient stock"

---

### Test 2: Invalid Transfer (same warehouse)
```bash
curl -X POST http://localhost:3000/api/v1/inventory/operations/transfers/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "fromWarehouseId": 1,
    "toWarehouseId": 1,
    "quantity": 10
  }'
```

**Expected:** 400 Bad Request - "Source and destination warehouses must be different"

---

### Test 3: Create Duplicate Inventory
```bash
curl -X POST http://localhost:3000/api/v1/inventory/operations/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "warehouseId": 1,
    "openingBalance": 100
  }'
```

**Expected:** 409 Conflict - "Inventory already exists"

---

### Test 4: Invalid Adjustment (zero)
```bash
curl -X POST http://localhost:3000/api/v1/inventory/operations/adjust \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "warehouseId": 1,
    "quantityDifference": 0,
    "adjustmentType": "ADJUSTMENT"
  }'
```

**Expected:** 400 Bad Request - "Adjustment quantity cannot be zero"

---

## Postman Collection

Save as `inventory-operations.json` for Postman import:

```json
{
  "info": {
    "name": "Inventory Operations API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Inventory",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/v1/inventory/operations/create",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "raw": "{\"productId\":1,\"warehouseId\":1,\"openingBalance\":100}"
        }
      }
    },
    {
      "name": "Stock In",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/v1/inventory/operations/stock-in",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "raw": "{\"productId\":1,\"warehouseId\":1,\"quantity\":50,\"reference\":\"PO-001\"}"
        }
      }
    },
    {
      "name": "Stock Out",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/v1/inventory/operations/stock-out",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "raw": "{\"productId\":1,\"warehouseId\":1,\"quantity\":30,\"reference\":\"BILL-001\"}"
        }
      }
    }
  ]
}
```

---

## Test Results Template

Create a file `inventory-test-results.md` and track results:

```markdown
# Inventory Operations Test Results

Date: 2026-07-06
Tester: Your Name
Backend Version: v1.0.0

## Passed Tests
- [x] Create Inventory
- [x] Stock In
- [x] Check Availability
- [x] Stock Out
- [x] Adjust for Damage
- [x] Create Second Warehouse Inventory
- [x] Initiate Transfer
- [x] Confirm Transfer
- [x] Get Movement History
- [x] Get Transfer History
- [x] Get Inventory Summary

## Error Tests
- [x] Insufficient Stock Error
- [x] Invalid Transfer Error
- [x] Duplicate Inventory Error
- [x] Invalid Adjustment Error

## Issues Found
None

## Notes
All endpoints working correctly. Data consistency maintained throughout test sequence.
```

---

## Performance Notes

- Movement history queries are indexed and optimized
- Transfer history supports pagination
- Summary view scans but uses indexes for filtering
- All operations use transactions for consistency

For large datasets (100K+ movements), consider adding date filters to movement queries.
