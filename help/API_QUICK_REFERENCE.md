# API Quick Reference - Phase 2

## Authentication
```bash
# Login to get JWT token
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Response: { "access_token": "eyJ...", "user": {...} }

# Use token in all requests
curl -H "Authorization: Bearer eyJ..."
```

---

## Website Orders (Manager Approval)

### List Pending Orders
```bash
GET /website-orders/pending?skip=0&take=10

Response:
{
  "data": [
    {
      "id": "cmr52mlhi0000babz7flrrgyc",
      "customer_email": "buyer@example.com",
      "customer_name": "Ali Traders",
      "items": "[{productId:1,quantity:2,unit_price:50000}]",
      "total_amount": 100000,
      "status": "PENDING_APPROVAL"
    }
  ],
  "total": 1,
  "hasMore": false
}
```

### Get Single Order
```bash
GET /website-orders/:orderId
```

### Approve Order (Creates Bill + Gate Pass)
```bash
POST /website-orders/:orderId/approve
Content-Type: application/json

{
  "customerId": 1,
  "warehouseId": 1,
  "remarks": "Approved by manager"
}

Response:
{
  "order": { "status": "APPROVED", "synced_to_erp_bill_id": 6 },
  "bill": {
    "bill_number": "BILL-2026-000006",
    "total_amount": 100000,
    ...
  }
}
```

### Reject Order
```bash
POST /website-orders/:orderId/reject
Content-Type: application/json

{
  "reason": "Out of stock"
}
```

---

## Gate Passes (Warehouse Staff Picking)

### List Pending Gate Passes
```bash
GET /gate-passes?warehouseId=1&skip=0&take=10

Response:
{
  "data": [
    {
      "id": 1,
      "gate_pass_number": "GP-2026-000001",
      "status": "PENDING",
      "bill": {
        "bill_number": "BILL-2026-000006",
        "total_amount": 100000,
        "customer": { "name": "Ali Traders" }
      },
      "items": [
        {
          "id": 1,
          "billLineId": 1,
          "productId": 1,
          "quantity": 5,
          "billLine": {
            "product": {
              "code": "PHONE-001",
              "name": "Phone XYZ"
            }
          }
        }
      ]
    }
  ],
  "total": 3,
  "hasMore": false
}
```

### Get Gate Pass Details
```bash
GET /gate-passes/:gatePassId
```

### Confirm Gate Pass (Pick & Ship)
```bash
POST /gate-passes/:gatePassId/confirm
Content-Type: application/json

{
  "pickedItems": [
    {
      "billLineId": 1,
      "pickedQuantity": 5
    }
  ],
  "remarks": "All items verified and packed"
}

# Inventory Impact:
# - physical_on_hand decreased by 5
# - reserved decreased by 5
# - Gate pass status: CONFIRMED
```

### Reject Gate Pass
```bash
POST /gate-passes/:gatePassId/reject
Content-Type: application/json

{
  "reason": "Product damaged in warehouse"
}

# Inventory Impact:
# - reserved decreased by original quantity
# - available increased by original quantity
# - Gate pass status: REJECTED
```

---

## Warehouse Transfers (Stock Movement)

### Create Transfer Request
```bash
POST /warehouse-transfers
Content-Type: application/json

{
  "from_warehouse_id": 1,
  "to_warehouse_id": 2,
  "items": [
    { "productId": 1, "quantity": 10 },
    { "productId": 2, "quantity": 20 }
  ],
  "remarks": "Stock distribution"
}

# Inventory Impact:
# Source warehouse: reserved += qty, available -= qty
# Status: PENDING
```

### List Pending Transfers
```bash
GET /warehouse-transfers/pending?skip=0&take=10
```

### List In-Transit Transfers
```bash
GET /warehouse-transfers/in-transit?skip=0&take=10
```

### Get Transfer Details
```bash
GET /warehouse-transfers/:transferId
```

### Start Transfer (Mark In Transit)
```bash
POST /warehouse-transfers/:transferId/start

Response status: IN_TRANSIT
expected_arrival: 2026-07-04 (24 hours later)
```

### Confirm Receipt (At Destination)
```bash
POST /warehouse-transfers/:transferId/confirm-receipt
Content-Type: application/json

{
  "items": [
    { "productId": 1, "quantity_received": 10 },
    { "productId": 2, "quantity_received": 18 }  # Shortage: 2 units
  ],
  "remarks": "2 units damaged, rest verified"
}

# Inventory Impact:
# Source warehouse: physical -= 10, physical -= 18
# Source warehouse: reserved -= 10, reserved -= 20
# Source warehouse: available += 2 (shortage returned)
# Destination warehouse: physical += 10, physical += 18
# Destination warehouse: available += 10, available += 18
# Status: RECEIVED
```

### Reject Transfer (Entire Transfer)
```bash
POST /warehouse-transfers/:transferId/reject
Content-Type: application/json

{
  "reason": "Shipment lost in transit"
}

# Inventory Impact:
# Source warehouse: reserved -= all, available += all
# Status: REJECTED
```

---

## Reports & Analytics

### Gate Pass Performance (Last 30 Days)
```bash
GET /reports/gate-pass-analytics?days=30

Response:
{
  "summary": {
    "totalGatePasses": 10,
    "confirmed": 8,
    "pending": 1,
    "rejected": 1,
    "fulfillmentRate": 80.0,
    "avgFulfillmentTimeMinutes": 45.5
  },
  "byStatus": {
    "CONFIRMED": 8,
    "PENDING": 1,
    "REJECTED": 1
  }
}
```

### Warehouse Performance Comparison
```bash
GET /reports/warehouse-performance?days=30

Response:
[
  {
    "warehouseId": 1,
    "warehouseName": "Main Warehouse",
    "location": "Karachi",
    "gatePasses": {
      "total": 8,
      "confirmed": 8,
      "fulfillmentRate": 100.0
    },
    "inventory": {
      "itemsShipped": 150,
      "itemsReceived": 0,
      "netMovement": -150
    }
  },
  {
    "warehouseId": 2,
    "warehouseName": "Secondary Warehouse",
    "location": "Lahore",
    "gatePasses": { "total": 0, "confirmed": 0, "fulfillmentRate": 0 },
    "inventory": {
      "itemsShipped": 0,
      "itemsReceived": 100,
      "netMovement": 100
    }
  }
]
```

### Bill Analytics
```bash
GET /reports/bill-analytics?days=30

Response:
{
  "summary": {
    "totalBills": 6,
    "totalAmount": 1233000,  # In paisa (Rs. 12,330)
    "avgBillAmount": 205500,  # In paisa
    "totalDiscountAmount": 0
  },
  "byChannel": {
    "COUNTER": { "count": 4, "amount": 1000000 },
    "WEBSITE": { "count": 2, "amount": 233000 }
  }
}
```

### Stock Movement by Product
```bash
GET /reports/stock-movement?days=30&productId=1

Response:
{
  "movements": [
    {
      "productId": 1,
      "productName": "Phone XYZ",
      "productCode": "PHONE-001",
      "totalQuantity": -25,
      "transactions": [
        {
          "date": "2026-07-03T15:00:00Z",
          "billNumber": "BILL-2026-000006",
          "quantity": -5,
          "type": "SALES"
        }
      ]
    }
  ]
}
```

### Inventory Snapshot (Current State)
```bash
GET /reports/inventory-snapshot

Response:
{
  "snapshot": {
    "totalProducts": 2,
    "totalPhysicalStock": 235,
    "totalReservedStock": 50,
    "totalAvailableStock": 185
  },
  "items": [
    {
      "id": 1,
      "productId": 1,
      "warehouseId": 1,
      "physical_on_hand": 45,
      "reserved": 5,
      "available": 40,
      "product": { "code": "PHONE-001", "name": "Phone XYZ" },
      "warehouse": { "name": "Main Warehouse" }
    },
    ...
  ]
}
```

---

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 404 | Not Found |
| 500 | Server Error |

---

## Tips & Tricks

### Get all stats at once for dashboard
```bash
# Run in parallel for performance
Promise.all([
  fetch('/reports/gate-pass-analytics?days=30'),
  fetch('/reports/warehouse-performance?days=30'),
  fetch('/reports/bill-analytics?days=30'),
  fetch('/reports/inventory-snapshot')
])
```

### Monitor fulfillment in real-time
```bash
# Poll every 30 seconds
setInterval(async () => {
  const resp = await fetch('/reports/gate-pass-analytics?days=1');
  const analytics = await resp.json();
  console.log(`Today: ${analytics.summary.confirmed} confirmed`);
}, 30000);
```

### Bulk actions workflow
```bash
# Approve multiple website orders
for (const orderId of orderIds) {
  await fetch(`/website-orders/${orderId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ customerId: 1, warehouseId: 1 })
  });
}
```

---

## Pagination

All list endpoints support:
- `skip` - Number of records to skip (default: 0)
- `take` - Number of records to return (default: 10)
- Returns `hasMore` flag to detect last page

```bash
# Get page 2 (records 10-19)
GET /gate-passes?warehouseId=1&skip=10&take=10

# Response includes
{ "hasMore": true/false, "total": X, "page": 2 }
```

---

## Troubleshooting

### "Unauthorized" error
- Check token in Authorization header
- Token format: `Bearer eyJ...`
- Token might be expired (7 day expiry by default)

### "Cannot confirm gate pass with status PENDING"
- Transfer must be IN_TRANSIT first
- Call `/warehouse-transfers/:id/start` first

### "Insufficient stock for product X"
- Product doesn't have enough available inventory
- Check inventory-snapshot first
- Consider transferring stock from another warehouse

### Date filters not working
- Use `?days=30` parameter (not date ranges)
- Days count backward from today
- `?days=7` = last 7 days
