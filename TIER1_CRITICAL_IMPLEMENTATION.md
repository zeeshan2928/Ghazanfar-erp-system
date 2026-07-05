# Tier 1 Critical Implementation Plan
## Complete Business Logic for Core Operations

**Timeline**: Week 1-2 (90-115 hours)
**Current Status**: Phases 9-12 foundational ✅ | Core business systems ⏳

---

## Three Critical Systems

### 1. Gate Pass System (40-50h) 🚚
**Current State**: Partial implementation exists
- GatePass & GatePassItem models exist
- Basic CRUD in place
- **MISSING**: 
  - Auto-trigger on bill creation
  - Complete picking workflow
  - Frontend screens
  - Real-time status sync

**What It Does**:
- Generate gate pass when bill is created/confirmed
- Track items being picked from warehouse
- Confirm picked items match bill items
- Update inventory when gate pass confirmed

**Service Layer** (20h):
```typescript
GatePassService:
  - createFromBill(billId) - AUTO-TRIGGER
  - getPendingByWarehouse(warehouseId)
  - updatePickQuantity(itemId, quantity)
  - completePicking(gatePassId)
  - confirmGatePass(gatePassId, confirmDto)
  - rejectGatePass(gatePassId, reason)
  - getStatusWithInventory(gatePassId)
  - bulkCreateFromBills(billIds)
```

**API Endpoints** (10h):
```
GET    /api/v1/gate-passes?warehouse=X&status=PENDING
GET    /api/v1/gate-passes/:id
POST   /api/v1/gate-passes/from-bill/:billId
PATCH  /api/v1/gate-passes/:id/pick-item/:itemId
POST   /api/v1/gate-passes/:id/complete-picking
POST   /api/v1/gate-passes/:id/confirm
POST   /api/v1/gate-passes/:id/reject
GET    /api/v1/gate-passes/warehouse/:warehouseId/stats
```

**Frontend Screens** (15h):
- Gate Pass Dashboard (warehouse staff view)
- Picking List Screen (real-time item tracking)
- Item Quantity Input (with barcode scan)
- Confirmation Modal (review before confirming)
- Status Timeline (PENDING → PICKING → PICKED → CONFIRMED)

**Business Rules**:
- Gate pass created immediately when bill status = CONFIRMED
- Warehouse staff picks items and updates quantities
- Cannot confirm if picked ≠ required
- Once confirmed, triggers inventory update
- Can reject with reason (returns to PENDING)

---

### 2. Inventory Reservation System (20-25h) 🛒
**Current State**: No reservation system exists
- Inventory model has quantity
- **MISSING**: 
  - Reservation tracking
  - Reserved vs Available logic
  - Automatic release on gate pass cancel
  - Shortage detection

**What It Does**:
- Reserve inventory when bill is created
- Calculate Available = Total - Reserved
- Release reservations if bill is cancelled
- Warn if insufficient stock at bill creation
- Track reservation history

**Prisma Schema Updates** (5h):
```prisma
model InventoryReservation {
  id                Int
  organizationId    Int
  inventoryId       Int
  billId            Int
  gatePassId        Int?
  
  quantity          Int          // reserved qty
  releaseType       String       // AUTO, MANUAL, EXPIRED
  releaseDate       DateTime?
  status            String       // RESERVED, RELEASED, EXPIRED
  
  createdAt         DateTime
  updatedAt         DateTime
  
  inventory         Inventory
  bill              Bill
  gatePass          GatePass?
}

// Add to Inventory model:
reserved            Int @default(0)
lastReservedAt      DateTime?
reservations        InventoryReservation[]
```

**Service Layer** (10h):
```typescript
InventoryReservationService:
  - reserveForBill(billId, items[])
  - checkAvailability(productId, warehouseId, qty) → {available, reserved}
  - releaseReservation(reservationId)
  - releaseReservationsByBill(billId)
  - getReservationHistory(inventoryId)
  - detectShortages(warehouseId)
  - autoExpireOldReservations(days=7)
  - getInventoryStatus(productId, warehouseId)
```

**API Endpoints** (5h):
```
POST   /api/v1/inventory/check-availability
GET    /api/v1/inventory/:id/reservations
GET    /api/v1/inventory/warehouse/:warehouseId/status
POST   /api/v1/inventory/bulk-reserve
DELETE /api/v1/inventory/reservations/:id
GET    /api/v1/inventory/shortages?warehouseId=X
```

**Business Rules**:
- Automatically reserve when bill created
- Available = Total - Reserved - Picking
- Cannot bill if insufficient available
- Reservations expire after 7 days (configurable)
- Release on: bill cancel, gate pass confirm, or expiry
- Cannot reserve same inventory twice (concurrent protection)

---

### 3. Warehouse Fulfillment UI (30-40h) 📦
**Current State**: No complete fulfillment UI
- Basic screens exist
- **MISSING**: 
  - Complete picking workflow UI
  - Shortage reporting
  - Inventory update confirmation
  - Real-time sync

**What It Does**:
- Staff view pending gate passes
- Pick items one by one
- Scan barcodes to confirm items
- See shortages in real-time
- Confirm all items picked
- Update inventory in system

**Frontend Screens** (35h):

#### Dashboard (5h)
```
┌─────────────────────────────────────┐
│  Warehouse Fulfillment Dashboard    │
├─────────────────────────────────────┤
│  Pending: 12 | Picking: 5 | Done: 8 │
│                                     │
│  Gate Passes by Status:             │
│  ├─ PENDING (12) → View All         │
│  ├─ IN_PROGRESS (5) → View All      │
│  └─ READY_FOR_PICKUP (8) → View All │
│                                     │
│  Low Stock Items (< 10):            │
│  ├─ Product A: 5 units              │
│  ├─ Product B: 3 units              │
│  └─ Product C: 2 units              │
└─────────────────────────────────────┘
```

#### Picking Screen (15h)
```
┌────────────────────────────────────┐
│  Gate Pass #GP001-2026-001          │
│  Bill: INV-001 | Customer: ABC Co   │
│  Status: [PENDING] [PICKING] DONE   │
├────────────────────────────────────┤
│ Item | Product | Required | Picked  │
│ 1    | Prod-A  | 10       | 8 [  ] │
│ 2    | Prod-B  | 5        | 0 [  ] │
│ 3    | Prod-C  | 3        | 3 ✓    │
├────────────────────────────────────┤
│ [Scan Barcode] | [Manual Entry]     │
│                                    │
│ Last Scanned: Prod-A (qty: 8)      │
│ Remaining: 2 units                 │
├────────────────────────────────────┤
│ [Previous Item] [Complete Picking]  │
└────────────────────────────────────┘
```

#### Item Input Component (5h)
```
- Barcode scanner (expo-camera integration)
- Manual quantity input
- Increment/decrement buttons
- Quick product search
- Visual confirmation (green ✓ / red ✗)
- Voice feedback (text-to-speech)
```

#### Shortage Reporting Screen (10h)
```
┌─────────────────────────────────────┐
│  Stock Shortages                    │
├─────────────────────────────────────┤
│ Gate Pass #GP001 - Bill INV-001     │
│ Status: CRITICAL SHORTAGE           │
│                                     │
│ Item | Product | Required | Avail   │
│ 1    | Prod-A  | 10       | 5 [-] │
│ 2    | Prod-B  | 5        | 0 [-] │
│ 3    | Prod-C  | 3        | 3 [✓] │
│                                     │
│ Actions:                            │
│ [Partial Pickup] [Request Transfer] │
│ [Notify Manager] [Cancel Items]     │
│ [Add to Waitlist]                   │
│                                     │
│ Notes: [Add remarks]                │
│ Urgency: [HIGH] Status: [OPEN]      │
└─────────────────────────────────────┘
```

#### Confirmation Screen (5h)
```
Before Confirming Gate Pass:
  ✓ All items picked correctly?
  ✓ Quantities match bill?
  ✗ Shortages resolved?
  ✓ No damage to items?
  
[YES, CONFIRM] [NO, GO BACK] [PARTIAL PICKUP]

On Confirm:
  → Update inventory (deduct)
  → Release reservations (fulfilled)
  → Update bill status (PICKED)
  → Log fulfillment time
  → Trigger delivery schedule
```

**Features**:
- Real-time quantity sync
- Barcode scanning (batch + single)
- Voice notifications
- Shortage detection with actions
- Partial pickup support
- Print picking list
- Handoff signature
- Performance metrics (time, accuracy)

---

## Implementation Roadmap

### Week 1: Gate Pass Foundation (55h)

**Days 1-2 (16h)**: Complete Gate Pass Service
- [ ] Auto-trigger on bill creation
- [ ] Picking workflow (update quantities)
- [ ] Confirmation logic with validation
- [ ] Status transitions (PENDING → PICKING → CONFIRMED)
- [ ] Error handling & edge cases
- [ ] Transaction safety (prevent double-picking)

**Days 3-4 (20h)**: Gate Pass API
- [ ] All REST endpoints implemented
- [ ] Input validation & error responses
- [ ] Pagination on list endpoints
- [ ] Real-time status via WebSocket
- [ ] Print gate pass (PDF generation)
- [ ] Batch operations

**Days 5 (19h)**: Frontend Screens
- [ ] Dashboard component
- [ ] Picking screen (real-time)
- [ ] Item input with scanner
- [ ] Status timeline
- [ ] Integration with backend API

---

### Week 2: Inventory & Fulfillment (95h)

**Days 6-7 (25h)**: Inventory Reservation System
- [ ] Schema migrations
- [ ] Reservation service (core logic)
- [ ] Availability checking
- [ ] Shortage detection
- [ ] Auto-expiry job (7-day old)
- [ ] Integration with gate pass

**Days 8-9 (40h)**: Warehouse Fulfillment UI
- [ ] Dashboard screen
- [ ] Picking workflow screen
- [ ] Barcode scanner integration
- [ ] Shortage reporting
- [ ] Confirmation flow
- [ ] Performance optimization

**Days 10 (30h)**: Integration & Testing
- [ ] End-to-end workflow testing
- [ ] Performance optimization
- [ ] Real-time sync validation
- [ ] Error scenario handling
- [ ] Load testing (100+ concurrent)
- [ ] Documentation & training

---

## Integration Points

### Bill Creation → Gate Pass
```
Bill.status = CONFIRMED
  ↓
→ GatePassService.createFromBill(billId)
→ InventoryReservationService.reserveForBill(billId, items)
→ Broadcast: "GatePass created" via WebSocket
→ Warehouse staff see in dashboard
```

### Picking → Reservation Release
```
GatePass.completePicking()
  ↓
→ Verify all items picked
→ Update GatePass.status = PICKED
→ Update Inventory.reserved -= amount
→ Update Inventory.quantity -= amount (actual deduction)
→ Create audit log
→ Broadcast: "GatePass picked" via WebSocket
```

### Gate Pass Confirm → Bill Update
```
GatePass.confirm()
  ↓
→ Validate all items picked match bill
→ Update Bill.status = READY_FOR_DELIVERY
→ Release InventoryReservation (status = RELEASED)
→ Update inventory final state
→ Log fulfillment time & staff
→ Notify next stage (delivery/sales)
```

### Bill Cancel → Release Reservation
```
Bill.cancel()
  ↓
→ InventoryReservationService.releaseReservationsByBill(billId)
→ GatePassService.cancelByBill(billId)
→ Restore inventory (no actual deduction yet)
→ Update GatePass.status = CANCELLED
```

---

## Database Schema Summary

```
Bill
├─ id, billNumber, status (DRAFT → CONFIRMED → PICKED → DELIVERED)
├─ billLines (items)
└─ gatePass (1:1 relationship)

GatePass (created on Bill.CONFIRMED)
├─ id, gatePassNumber, status (PENDING → PICKING → PICKED → CONFIRMED)
├─ billId (ref to Bill)
├─ warehouseId, pickedBy, pickedDate
├─ items (GatePassItem[])
└─ reservations (InventoryReservation[])

GatePassItem
├─ id, gatePassId, billLineId
├─ productId, quantity (required)
├─ pickedQuantity (staff updates)
└─ status (PENDING → PICKED)

Inventory
├─ id, productId, warehouseId
├─ quantity (total physical)
├─ reserved (reserved qty)
├─ available = quantity - reserved
└─ reservations (InventoryReservation[])

InventoryReservation (created on Bill.CONFIRMED)
├─ id, billId, inventoryId, gatePassId
├─ quantity (reserved amount)
├─ status (RESERVED → RELEASED or EXPIRED)
├─ releaseType (AUTO, MANUAL, EXPIRED)
└─ createdAt, releaseDate
```

---

## Critical Business Rules

### Gate Pass Creation
✅ Automatically created when Bill.status = CONFIRMED
✅ One gate pass per bill (prevent duplicates)
✅ Items match bill items exactly
✅ Cannot create if inventory unavailable (check available, not total)

### Picking Workflow
✅ Staff updates quantities as they pick
✅ Can pick partial quantities (for shortages)
✅ Cannot exceed required quantity
✅ Real-time sync with backend

### Inventory Reservation
✅ Reserve at bill creation (before picking)
✅ Available = Total - Reserved - Picking
✅ Auto-release on gate pass confirmation
✅ Auto-release on bill cancellation
✅ Auto-expire after 7 days

### Confirmation Rules
✅ All items picked (or marked as shortage)
✅ Quantities match (exactly or less for shortage)
✅ Cannot confirm if shortages unresolved
✅ Final inventory update on confirmation

### Edge Cases
✅ Partial pickups (shortage scenarios)
✅ Item substitutions (manager approval)
✅ Picking priority (by deadline)
✅ Multi-warehouse picking (different warehouses)
✅ Backorders (when stock insufficient)

---

## Success Metrics

### Gate Pass System
- [x] Auto-creation on bill confirmation
- [ ] 100% inventory accuracy after picking
- [ ] < 2min avg picking time per item
- [ ] Zero lost items (audit trail)
- [ ] Real-time status sync

### Inventory Reservation
- [ ] Available qty always accurate
- [ ] No overbooking (concurrent safety)
- [ ] 99%+ reservation fulfillment
- [ ] < 24h fulfillment time

### Warehouse Fulfillment
- [ ] All staff can pick independently
- [ ] Shortage detection within 2 seconds
- [ ] Zero picking errors (barcode scan)
- [ ] 100% completion rate (no abandoned)

---

## Testing Plan

### Unit Tests (20h)
- Gate pass creation & lifecycle
- Inventory reservation logic
- Shortage detection
- Concurrent reservation handling
- Auto-expiry job

### Integration Tests (15h)
- Bill → GatePass → Picking → Inventory flow
- Reservation release scenarios
- Multi-item gate passes
- Partial pickup handling
- Cancellation cascades

### E2E Tests (10h)
- Complete workflow (bill to delivery)
- Warehouse staff UI flow
- Barcode scanning
- Real-time sync
- Performance under load

### Load Tests (5h)
- 100+ concurrent gate passes
- 1000+ items being picked
- 50+ warehouses
- Real-time WebSocket broadcast

---

## Deployment Checklist

Before going live:
- [ ] Database migrations applied
- [ ] All APIs tested with valid data
- [ ] Warehouse staff trained on UI
- [ ] Barcode scanner integrated
- [ ] Real-time sync tested
- [ ] Shortage scenarios covered
- [ ] Audit trail logging working
- [ ] Print functionality tested
- [ ] Performance acceptable (< 2s per action)
- [ ] Error handling for all scenarios
- [ ] Rollback plan documented

---

## Resource Allocation

| System | Phase | Hours | Week | Priority |
|--------|-------|-------|------|----------|
| Gate Pass Service | 1 | 20 | 1 | CRITICAL |
| Gate Pass API | 1 | 10 | 1 | CRITICAL |
| Gate Pass Frontend | 1 | 15 | 1 | CRITICAL |
| Inventory Reservation | 2 | 25 | 2 | CRITICAL |
| Warehouse Fulfillment UI | 2 | 40 | 2 | CRITICAL |
| Integration & Testing | 2 | 30 | 2 | CRITICAL |
| **TOTAL** | | **140** | **2 weeks** | **CRITICAL** |

---

## Next Steps

1. **Today**: Review & confirm plan
2. **Day 1-2**: Implement gate pass service layer
3. **Day 3-4**: Build gate pass APIs
4. **Day 5**: Create frontend screens
5. **Day 6-7**: Inventory reservation system
6. **Day 8-9**: Warehouse fulfillment UI
7. **Day 10**: Integration testing & fixes

Ready to start implementation? Which system should we begin with?
