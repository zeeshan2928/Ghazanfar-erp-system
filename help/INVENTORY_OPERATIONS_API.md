# Inventory Operations API Reference

## Overview
Complete inventory management API with stock tracking, movements, transfers, and reservations.

## Core Endpoints

### 1. Create Inventory
**POST** `/api/v1/inventory/operations/create`

Initialize a new inventory record for a product in a warehouse.

**Request:**
```json
{
  "productId": 1,
  "warehouseId": 2,
  "openingBalance": 100
}
```

**Response:**
```json
{
  "id": 5,
  "organizationId": 1,
  "productId": 1,
  "warehouseId": 2,
  "physical_on_hand": 100,
  "reserved": 0,
  "available": 100,
  "opening_balance": 100,
  "createdAt": "2026-07-06T10:30:00Z",
  "Product": { "code": "SKU001", "name": "Product Name" },
  "warehouse": { "name": "Main Warehouse" }
}
```

---

### 2. Stock In (Receive Stock)
**POST** `/api/v1/inventory/operations/stock-in`

Add stock to inventory (from PO receipt, returns, etc).

**Request:**
```json
{
  "productId": 1,
  "warehouseId": 2,
  "quantity": 50,
  "reference": "PO-001",
  "remarks": "Received from vendor"
}
```

**Response:**
```json
{
  "success": true,
  "inventory": {
    "id": 5,
    "physical_on_hand": 150,
    "reserved": 0,
    "available": 150
  },
  "movement": {
    "id": 101,
    "inventoryId": 5,
    "movementType": "STOCK_IN",
    "quantity": 50,
    "reference": "PO-001",
    "createdBy": 3,
    "createdAt": "2026-07-06T10:30:00Z"
  }
}
```

---

### 3. Stock Out (Issue Stock)
**POST** `/api/v1/inventory/operations/stock-out`

Remove stock from inventory (for sales, transfers, etc).

**Request:**
```json
{
  "productId": 1,
  "warehouseId": 2,
  "quantity": 20,
  "reference": "BILL-001",
  "remarks": "Sold to customer"
}
```

**Response:**
```json
{
  "success": true,
  "inventory": {
    "id": 5,
    "physical_on_hand": 130,
    "reserved": 10,
    "available": 120
  },
  "movement": {
    "id": 102,
    "inventoryId": 5,
    "movementType": "STOCK_OUT",
    "quantity": 20,
    "reference": "BILL-001",
    "createdAt": "2026-07-06T10:35:00Z"
  }
}
```

---

### 4. Adjust Stock
**POST** `/api/v1/inventory/operations/adjust`

Adjust stock for damage, shrinkage, or reconciliation.

**Request:**
```json
{
  "productId": 1,
  "warehouseId": 2,
  "quantityDifference": -5,
  "adjustmentType": "DAMAGE",
  "remarks": "Damaged goods found during inspection"
}
```

**Response:**
```json
{
  "success": true,
  "inventory": {
    "id": 5,
    "physical_on_hand": 125,
    "reserved": 10,
    "available": 115
  },
  "movement": {
    "id": 103,
    "movementType": "DAMAGE",
    "quantity": 5,
    "reference": "DAMAGE"
  },
  "adjustmentType": "DAMAGE",
  "quantityChanged": -5
}
```

**Adjustment Types:**
- `DAMAGE` - Items damaged or defective
- `SHRINKAGE` - Loss due to evaporation, breakage, etc.
- `ADJUSTMENT` - General inventory reconciliation

---

### 5. Initiate Stock Transfer
**POST** `/api/v1/inventory/operations/transfers/initiate`

Initiate a stock transfer between warehouses.

**Request:**
```json
{
  "productId": 1,
  "fromWarehouseId": 2,
  "toWarehouseId": 3,
  "quantity": 30,
  "remarks": "Transfer to secondary warehouse"
}
```

**Response:**
```json
{
  "success": true,
  "transfer": {
    "id": 10,
    "transferNumber": "TRF-2026-07-06-1720300200000",
    "fromInventoryId": 5,
    "toInventoryId": 8,
    "quantity": 30,
    "status": "PENDING",
    "requestedBy": 3,
    "requestDate": "2026-07-06T10:30:00Z"
  },
  "fromInventory": {
    "id": 5,
    "current": 125
  },
  "toInventory": {
    "id": 8,
    "current": 45
  }
}
```

**Transfer Status:** `PENDING` → `IN_TRANSIT` → `RECEIVED`

---

### 6. Confirm Stock Transfer
**PATCH** `/api/v1/inventory/operations/transfers/:transferId/confirm`

Complete a transfer (destination warehouse receives stock).

**Response:**
```json
{
  "success": true,
  "transfer": {
    "id": 10,
    "status": "RECEIVED",
    "receivedBy": 4,
    "receivedDate": "2026-07-06T11:00:00Z"
  }
}
```

**Note:** This operation:
- Decrements stock from source inventory
- Increments stock to destination inventory
- Creates both TRANSFER_OUT and TRANSFER_IN movements
- Records who received the transfer

---

## History & Reporting Endpoints

### 7. Get Movement History
**GET** `/api/v1/inventory/operations/movements/:inventoryId?limit=100&offset=0`

Retrieve complete movement ledger for an inventory item.

**Response:**
```json
{
  "inventoryId": 5,
  "total": 150,
  "movements": [
    {
      "id": 150,
      "inventoryId": 5,
      "movementType": "STOCK_OUT",
      "quantity": 20,
      "reference": "BILL-005",
      "remarks": "Sales order",
      "createdBy": 3,
      "createdAt": "2026-07-06T14:30:00Z",
      "createdByUser": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@company.com"
      }
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

**Movement Types:**
- `STOCK_IN` - Stock received
- `STOCK_OUT` - Stock issued
- `ADJUSTMENT` - Manual adjustment
- `DAMAGE` - Damaged goods
- `SHRINKAGE` - Loss/evaporation
- `TRANSFER_OUT` - Transferred out
- `TRANSFER_IN` - Transferred in
- `RETURN` - Customer return

---

### 8. Get Transfer History
**GET** `/api/v1/inventory/operations/transfers/history?warehouseId=2&limit=50&offset=0`

List all transfers for a warehouse (both incoming and outgoing).

**Response:**
```json
[
  {
    "id": 10,
    "transferNumber": "TRF-2026-07-06-1720300200000",
    "quantity": 30,
    "status": "RECEIVED",
    "requestDate": "2026-07-06T10:30:00Z",
    "receivedDate": "2026-07-06T11:00:00Z",
    "fromInventory": {
      "Product": { "code": "SKU001", "name": "Product A" },
      "warehouse": { "name": "Main Warehouse" }
    },
    "toInventory": {
      "Product": { "code": "SKU001", "name": "Product A" },
      "warehouse": { "name": "Secondary Warehouse" }
    },
    "requestedByUser": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "receivedByUser": {
      "firstName": "Jane",
      "lastName": "Smith"
    }
  }
]
```

---

### 9. Get Inventory Summary
**GET** `/api/v1/inventory/operations/summary`

Overview of inventory across all warehouses.

**Response:**
```json
{
  "totalItems": 45,
  "totalValue": 450000,
  "byWarehouse": {
    "Main Warehouse": {
      "totalItems": 20,
      "totalQty": 5000,
      "totalReserved": 500,
      "totalAvailable": 4500
    },
    "Secondary Warehouse": {
      "totalItems": 25,
      "totalQty": 3200,
      "totalReserved": 200,
      "totalAvailable": 3000
    }
  },
  "lowStock": [
    {
      "productCode": "SKU005",
      "productName": "Critical Item",
      "warehouse": "Main Warehouse",
      "available": 5,
      "reserved": 2,
      "total": 7
    }
  ]
}
```

---

## Reservation Endpoints

### 10. Check Inventory Availability
**POST** `/api/v1/inventory/check-availability`

Check availability for multiple products considering reservations.

**Request:**
```json
{
  "items": [
    {
      "productId": 1,
      "warehouseId": 2,
      "requiredQuantity": 50
    },
    {
      "productId": 2,
      "warehouseId": 2,
      "requiredQuantity": 25
    }
  ]
}
```

**Response:**
```json
{
  "total": 2,
  "canFulfillAll": true,
  "results": [
    {
      "productId": 1,
      "warehouseId": 2,
      "total": 100,
      "reserved": 20,
      "available": 80,
      "required": 50,
      "canFulfill": true,
      "shortage": 0
    }
  ]
}
```

---

## Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "message": "Quantity must be greater than 0",
  "statusCode": 400
}
```

**404 Not Found**
```json
{
  "message": "Inventory not found for this product in this warehouse",
  "statusCode": 404
}
```

**409 Conflict**
```json
{
  "message": "Inventory already exists for this product in this warehouse",
  "statusCode": 409
}
```

---

## Best Practices

1. **Always check availability** before issuing stock
2. **Use references** (PO#, Bill#) for audit trail
3. **Add remarks** for non-standard movements
4. **Monitor low stock** using the summary endpoint
5. **Review movement history** for discrepancies
6. **Confirm transfers** promptly to complete the cycle
7. **Use stock-in/out** for all movements (maintain accuracy)

---

## Database Tables

### InventoryMovement
Tracks all stock movements with type, quantity, reference, and timestamp.

### InventoryTransfer
Tracks inter-warehouse transfers with status (PENDING/IN_TRANSIT/RECEIVED).

### Inventory
Core inventory record with:
- `physical_on_hand` - Total physical quantity
- `reserved` - Quantity reserved for orders
- `available` - Available for new orders (physical - reserved)
- `opening_balance` - Initial balance for reconciliation

---

## Authentication

All endpoints require JWT authentication. Include token in Authorization header:
```
Authorization: Bearer <token>
```

Organization context is extracted from the authenticated user.
