# Frontend UI Implementation Plan - Gate Pass & Inventory Management

**Objective:** Build warehouse staff UI for gate pass picking and inventory management  
**Timeline:** 50-65 hours  
**Stack:** React 18 + TypeScript + Vite  
**Design:** Mobile-first, responsive, offline-capable  

---

## 📊 Project Breakdown

### Phase 1: Gate Pass UI (30-40 hours)
- **1.1** Gate Pass List Screen (warehouse staff view) - 6 hours
- **1.2** Gate Pass Detail Screen (picking interface) - 8 hours
- **1.3** Shortage Reporting Form - 5 hours
- **1.4** Print/Label Generation - 4 hours
- **1.5** Mobile Optimization & Responsiveness - 8 hours
- **1.6** Barcode/QR Scanner Integration - 4 hours
- **1.7** Offline Mode Support - 3 hours

### Phase 2: Inventory Management UI (20-25 hours)
- **2.1** Inventory Dashboard/Home - 5 hours
- **2.2** Stock Level Display Screen - 6 hours
- **2.3** Stock Adjustment Screen - 5 hours
- **2.4** Movement History/Audit Trail - 4 hours
- **2.5** Mobile Optimization - 3 hours
- **2.6** Reports & Analytics - 2 hours

### Phase 3: Shared Components (10-15 hours)
- **3.1** Reusable UI Components - 5 hours
- **3.2** State Management (Zustand stores) - 3 hours
- **3.3** API Service Methods - 3 hours
- **3.4** Error Handling & Toast Notifications - 2 hours
- **3.5** Testing & Polish - 2 hours

---

## 🎨 UI/UX Design System

### Color Scheme
- **Primary**: #007AFF (iOS blue)
- **Success**: #34C759 (green)
- **Warning**: #FF9500 (orange)
- **Danger**: #FF3B30 (red)
- **Background**: #F2F2F7 (light gray)
- **Text**: #000000 / #333333 / #999999

### Typography
- **Headings**: 24px, 600 weight
- **Subheadings**: 18px, 600 weight
- **Body**: 16px, 400 weight
- **Small**: 14px, 400 weight
- **Captions**: 12px, 400 weight

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 📁 Component Architecture

```
frontend/src/
├── components/
│   ├── gate-pass/
│   │   ├── GatePassList.tsx          # Main list view
│   │   ├── GatePassDetail.tsx        # Detail/picking screen
│   │   ├── PickingInterface.tsx      # Picking workflow
│   │   ├── ShortageReportForm.tsx    # Report shortage
│   │   ├── PrintLabel.tsx            # Barcode/label print
│   │   ├── QRScanner.tsx             # QR code scanner
│   │   └── GatePassCard.tsx          # Reusable card component
│   ├── inventory/
│   │   ├── InventoryDashboard.tsx    # Home/overview
│   │   ├── StockLevelDisplay.tsx     # Stock by location
│   │   ├── StockAdjustmentForm.tsx   # Add/remove stock
│   │   ├── MovementHistory.tsx       # Audit trail
│   │   └── InventoryCard.tsx         # Reusable card component
│   ├── shared/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Toast.tsx
│   │   ├── Navbar.tsx
│   │   └── BottomNavigation.tsx
│   └── forms/
│       ├── FormInput.tsx
│       ├── FormSelect.tsx
│       └── FormValidation.ts
├── screens/
│   ├── warehouse/
│   │   ├── WarehouseStaffDashboard.tsx
│   │   ├── PickingScreen.tsx
│   │   └── StockCheckScreen.tsx
│   └── manager/
│       ├── InventoryManagerDashboard.tsx
│       └── ReportsScreen.tsx
├── stores/
│   ├── gatePassStore.ts
│   ├── inventoryStore.ts
│   └── authStore.ts
├── services/
│   ├── api.ts                       # Extended API client
│   ├── gatePassService.ts
│   └── inventoryService.ts
├── types/
│   ├── api.ts                       # Extended types
│   ├── gate-pass.ts
│   └── inventory.ts
├── utils/
│   ├── formatters.ts
│   ├── validators.ts
│   └── storage.ts
├── hooks/
│   ├── useGatePass.ts
│   ├── useInventory.ts
│   └── useLocalStorage.ts
└── styles/
    ├── globals.css
    ├── components.css
    └── mobile.css
```

---

## 🔧 Implementation Details

### 1. Gate Pass Components

#### GatePassList Screen
**Features:**
- Display all pending gate passes
- Filter by status (PENDING, IN_PROGRESS, CONFIRMED, SHORTAGE)
- Search by bill number, customer name, or gate pass number
- Sort by date, status, priority
- Tap to open detail view
- Pull-to-refresh (mobile)
- Real-time updates via polling/WebSocket

**UI Layout:**
```
┌─────────────────────────────┐
│ Warehouse Picking           │
├─────────────────────────────┤
│ 🔍 Search gate passes...    │
├─────────────────────────────┤
│ Status: All ▼               │
│ Sort: Date ▼                │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ GP-2026-000001          │ │
│ │ Bill: BILL-2026-000001  │ │
│ │ Customer: Acme Corp     │ │
│ │ Items: 5                │ │
│ │ Status: PENDING ●       │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ GP-2026-000002          │ │
│ │ ...                     │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Page 1 of 5 (45 items)      │
└─────────────────────────────┘
```

**Data Display:**
- Gate pass number (tap to copy)
- Bill number with link
- Customer name and phone
- Item count and total qty
- Status badge with color
- Last action time
- Warehouse name

**Actions:**
- Tap card → Open detail/picking
- Tap menu → Reassign, Print, View details
- Pull-to-refresh → Reload list
- Long-press → Copy number to clipboard

**Mobile Responsiveness:**
- Full width card layout
- Large touch targets (min 48px)
- No horizontal scroll
- Status as badges not buttons

---

#### GatePassDetail Screen (Picking Interface)
**Features:**
- Display all items to pick
- Mark items as picked (one by one)
- Barcode scanner for verification
- Real-time QR code reading
- Shortage reporting inline
- Confirmation workflow
- Print labels

**UI Layout:**
```
┌─────────────────────────────┐
│ ← GP-2026-000001            │
├─────────────────────────────┤
│ Bill: BILL-2026-000001      │
│ Customer: Acme Corp         │
│ Status: IN_PROGRESS         │
├─────────────────────────────┤
│ Items to Pick (5/5)         │
├─────────────────────────────┤
│ ✓ Product A                 │ ← Item picked
│   SKU: SKU-001              │
│   Need: 10   Picked: 10     │
│   ████████████ 100%         │
│                             │
│ ○ Product B                 │ ← Item not picked
│   SKU: SKU-002              │
│   Need: 20   Picked: 0      │
│   ░░░░░░░░░░░░  0%          │
│   [Pick] [Report Shortage]  │
│                             │
│ ○ Product C                 │
│   ...                       │
├─────────────────────────────┤
│ 🎥 Scan Product [SCAN]      │
├─────────────────────────────┤
│ [← Back]  [✓ Confirm]       │
└─────────────────────────────┘
```

**Data Display:**
- Gate pass number (immutable)
- Customer name (tappable for phone call)
- Order/Bill total amount
- Items progress (X of Y)
- For each item:
  - Checkbox (picked/not picked)
  - Product name
  - SKU/code
  - Required quantity
  - Picked quantity (editable)
  - Progress bar
  - Action buttons

**Interactive Elements:**
- Tap item row → Expand/show details
- Tap checkbox → Mark as picked
- Tap quantity → Edit quantity
- Tap [Report Shortage] → Show shortage form
- Scan barcode → Auto-fill product & qty
- [Confirm] → Submit all items

**Workflow:**
1. Staff sees gate pass with items
2. For each item:
   - Scan product OR manually enter quantity
   - Confirm quantity picked
   - If short, report shortage
3. When done, click Confirm
4. System updates inventory
5. Optional: Print label/receipt

---

#### ShortageReportForm
**Features:**
- Report missing/damaged items
- Specify actual vs required qty
- Add notes
- Photo upload (optional)
- Submit and continue to next item

**UI Layout:**
```
┌──────────────────────────────┐
│ Report Shortage              │
├──────────────────────────────┤
│ Product: Phone A             │
│ Required: 20 units           │
├──────────────────────────────┤
│ Actual Picked:   [20]        │
│ Reason: Damage ▼             │
│ Notes:                       │
│ ┌─────────────────────────┐  │
│ │ 5 units damaged in      │  │
│ │ shipment...             │  │
│ └─────────────────────────┘  │
├──────────────────────────────┤
│ [Take Photo]                 │
├──────────────────────────────┤
│ [← Back] [Submit & Next]     │
└──────────────────────────────┘
```

**Fields:**
- Product name (read-only)
- Required quantity (read-only)
- Actual quantity picked (input)
- Reason dropdown (Damaged, Missing, Wrong Item, etc.)
- Notes textarea
- Photo upload
- Submit button

**Validation:**
- Actual qty <= Required qty
- Reason must be selected
- At least one field (qty or notes)

---

### 2. Inventory Components

#### InventoryDashboard
**Features:**
- Quick stats (total stock, low stock, reserved items)
- Recent movements
- Quick actions
- Warehouse selector

**UI Layout:**
```
┌─────────────────────────────┐
│ Inventory Management        │
├─────────────────────────────┤
│ Warehouse: Main ▼           │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Total Stock             │ │
│ │ 45,230 units            │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Low Stock Items         │ │
│ │ 3 products              │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Reserved (Pending)      │ │
│ │ 2,340 units             │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Recent Movements            │
│ ┌─────────────────────────┐ │
│ │ ✓ Stock In              │ │
│ │   PO-2026-001: 100 units│ │
│ │   2 mins ago            │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ✓ Gate Pass Confirmed   │ │
│ │   GP-2026-001: 50 units │ │
│ │   15 mins ago           │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [View All Stock] [Adjust]   │
└─────────────────────────────┘
```

**Stats Cards:**
- Total physical stock
- Available (not reserved)
- Reserved items count
- Low stock items (< threshold)
- On-order items

**Recent Movements:**
- Bill confirmation (stock out)
- Transfer received (stock in)
- Stock adjustment (manual)
- Purchase order received (stock in)

**Actions:**
- [View All Stock] → Go to stock level screen
- [Adjust Stock] → Open stock adjustment form
- [View Movements] → See audit trail
- [Reports] → Analytics and reports

---

#### StockLevelDisplay
**Features:**
- Show stock by product
- Filter/search products
- Show reserved/available breakdown
- Threshold indicators (red if low)
- Warehouse selector

**UI Layout:**
```
┌─────────────────────────────┐
│ Stock Levels                │
├─────────────────────────────┤
│ Warehouse: Main ▼           │
│ 🔍 Search products...       │
├─────────────────────────────┤
│ Sort: A-Z ▼   Low Stock ↓   │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Phone A (SKU-001)       │ │
│ │ Available: 45 ████████  │ │ ← Green
│ │ Reserved:  10 ███       │ │
│ │ Physical:  55 ██████████│ │
│ │ Threshold: 20           │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Phone B (SKU-002)       │ │
│ │ Available: 5  ██        │ │ ← Red (low)
│ │ Reserved:  3  ██        │ │
│ │ Physical:  8  ███       │ │
│ │ Threshold: 10           │ │
│ │ [⚠ BELOW THRESHOLD]     │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Page 1 of 5 (34 items)      │
└─────────────────────────────┘
```

**Per-Product Display:**
- Product name + SKU
- Available quantity (main value)
- Reserved quantity
- Physical on hand
- Threshold level
- Color coding:
  - Green: OK (available > threshold)
  - Orange: Warning (available <= threshold)
  - Red: Critical (available < 50% threshold)
- Tap to see details/history

**Filter & Sort:**
- Search by name, SKU, category
- Sort: Name A-Z, Stock high-low, Low stock first
- Filter: Only low stock, Only reserved, By category
- Warehouse selector at top

---

#### StockAdjustmentForm
**Features:**
- Add/remove stock manually
- Reason selector (Purchase, Damage, Theft, Audit, Correction)
- Reference (PO number, reason, etc.)
- Multiple items at once
- Barcode scanning

**UI Layout:**
```
┌──────────────────────────────┐
│ Stock Adjustment             │
├──────────────────────────────┤
│ Warehouse: Main ▼            │
├──────────────────────────────┤
│ Type: Adjustment ▼           │
│ (Stock In / Stock Out)       │
├──────────────────────────────┤
│ Product: [Select] ▼          │
│ SKU: SKU-001                 │
│ Current Stock: 45            │
├──────────────────────────────┤
│ Action: Add ▼                │
│ Quantity: [20]               │
├──────────────────────────────┤
│ Reason: Damage ▼             │
│ Reference: PO-2026-001       │
├──────────────────────────────┤
│ Notes:                       │
│ ┌──────────────────────────┐ │
│ │ 20 units received in    │ │
│ │ purchase order...        │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ [Scan Barcode]               │
├──────────────────────────────┤
│ [← Cancel]  [✓ Confirm]      │
└──────────────────────────────┘
```

**Fields:**
- Type: Stock In / Out
- Product selector (search/scan)
- Current stock (read-only)
- Action: Add / Remove / Correct
- Quantity to adjust
- Reason dropdown
- Reference field (optional)
- Notes textarea
- Submitted by: auto-filled

**Validation:**
- Product must be selected
- Quantity > 0
- Stock Out: quantity <= current stock
- Reason required for stock out

**After Submit:**
- Confirmation screen
- Option to adjust another item
- Back to dashboard

---

#### MovementHistory
**Features:**
- Audit trail of all stock movements
- Filter by date, reason, user
- Search by product, reference
- Detailed info per movement

**UI Layout:**
```
┌─────────────────────────────┐
│ Movement History            │
├─────────────────────────────┤
│ Warehouse: Main ▼           │
│ 🔍 Search movements...      │
├─────────────────────────────┤
│ From: [Date] ▼              │
│ To: [Date] ▼                │
│ Type: All ▼                 │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ ✓ Stock In              │ │
│ │ 2026-07-05 10:30 AM     │ │
│ │ Product A (SKU-001)     │ │
│ │ +50 units               │ │
│ │ Reason: Purchase        │ │
│ │ PO: PO-2026-001         │ │
│ │ By: Ahmad (Manager)     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ✓ Stock Out             │ │
│ │ 2026-07-05 02:15 PM     │ │
│ │ Product A (SKU-001)     │ │
│ │ -30 units               │ │
│ │ Reason: Gate Pass       │ │
│ │ GP: GP-2026-001         │ │
│ │ By: Hassan (Warehouse)  │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Page 1 of 12 (112 items)    │
└─────────────────────────────┘
```

**Per-Movement Display:**
- Movement type (In/Out) with icon
- Date and time
- Product name and SKU
- Quantity (with +/- indicator)
- Reason/type
- Reference (PO, GP, etc.)
- User who made the change
- Remarks if any

---

## 🎯 Mobile-First Features

### Responsive Breakpoints
```typescript
// Mobile: < 640px
- Full width cards
- Large buttons (48px minimum)
- Touch-friendly spacing
- Single column layout
- Bottom navigation bar

// Tablet: 640px - 1024px
- 2-column grid
- Regular buttons
- Standard navigation

// Desktop: > 1024px
- 3+ column grid
- Compact layout
- Top navigation
```

### Mobile Optimizations
- **Offline Mode**: Cache data locally, sync when online
- **Minimal Data**: Lazy load images, paginate lists
- **Fast Loading**: Optimize images, minimize bundle
- **Touch**: Large targets, swipe gestures
- **Battery**: Reduce animations, batch requests
- **Network**: Handle disconnects gracefully

### Native-like Experience
- Bottom navigation bar (iOS style)
- Haptic feedback on actions
- Pull-to-refresh
- Swipe gestures
- Bottom sheets for modals
- Full-screen forms

---

## 🔌 API Service Methods

```typescript
// Gate Pass APIs
getGatePasses(warehouseId, skip, take, status?, search?)
getGatePass(id) // Detail
updateGatePassStatus(id, status) // PENDING -> IN_PROGRESS -> CONFIRMED
confirmGatePass(id, items) // Submit picked items
reportShortage(id, itemId, qtySorted, notes)
getGatePassPrintData(id) // For label printing

// Inventory APIs
getInventoryByWarehouse(warehouseId, skip, take, sort?)
getInventoryItem(productId, warehouseId) // Details
searchInventory(query, warehouseId)
adjustStock(warehouseId, productId, adjustment, reason, reference, notes)
getStockMovements(warehouseId, fromDate, toDate, type?, product?)
getInventoryThresholds(organizationId)
```

---

## 📊 State Management (Zustand)

```typescript
// Gate Pass Store
gatePassStore:
  - gatePasses: GatePass[]
  - selectedGatePass: GatePass | null
  - loading: boolean
  - filters: { status, warehouse, search }
  - actions: { fetch, select, updateStatus, reportShortage }

// Inventory Store
inventoryStore:
  - items: InventoryItem[]
  - selectedItem: InventoryItem | null
  - movements: StockMovement[]
  - warehouse: Warehouse
  - filters: { search, sort, category }
  - actions: { fetch, adjustStock, fetchMovements }

// UI Store
uiStore:
  - toasts: Toast[]
  - isLoading: boolean
  - actions: { showToast, setLoading }
```

---

## ✅ Quality Checklist

### Code Quality
- [ ] TypeScript strict mode (no `any`)
- [ ] Eslint passing
- [ ] Proper error boundaries
- [ ] Loading states on all async operations
- [ ] Proper cleanup (useEffect)
- [ ] No console errors/warnings

### Functionality
- [ ] All CRUD operations work
- [ ] Pagination works correctly
- [ ] Search/filter functional
- [ ] Sorting works
- [ ] Form validation complete
- [ ] Error messages helpful
- [ ] Toast notifications for actions

### Mobile
- [ ] Responsive on all breakpoints
- [ ] Touch targets minimum 48px
- [ ] No horizontal scroll
- [ ] Performance: LCP < 2.5s
- [ ] Offline mode works
- [ ] Images optimized

### Accessibility
- [ ] Color contrast ≥ 4.5:1
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Form labels present
- [ ] Error messages associated with fields
- [ ] Focus indicators visible

### Performance
- [ ] Bundle size < 500KB
- [ ] LCP < 2.5s on 4G
- [ ] CLS < 0.1
- [ ] Images lazy-loaded
- [ ] No unnecessary re-renders
- [ ] API requests batched

---

## 🎬 Implementation Order

1. **Setup infrastructure** (2 hrs)
   - Create folder structure
   - Create base components
   - Setup stores
   - Extend API client

2. **Build shared components** (5 hrs)
   - Button, Card, Modal, Input, etc.
   - Form validation
   - Toast notifications
   - Loading spinners

3. **Build Gate Pass screens** (25 hrs)
   - List screen (4 hrs)
   - Detail/picking screen (8 hrs)
   - Shortage form (3 hrs)
   - QR scanner (3 hrs)
   - Print functionality (3 hrs)
   - Mobile optimization (4 hrs)

4. **Build Inventory screens** (20 hrs)
   - Dashboard (4 hrs)
   - Stock levels (5 hrs)
   - Adjustment form (4 hrs)
   - Movement history (3 hrs)
   - Mobile optimization (4 hrs)

5. **Integration & polish** (10 hrs)
   - API integration
   - State management
   - Error handling
   - Testing
   - Performance optimization

---

## 📦 Deliverables

1. **Gate Pass Components**
   - GatePassList.tsx
   - GatePassDetail.tsx
   - PickingInterface.tsx
   - ShortageReportForm.tsx
   - PrintLabel.tsx
   - QRScanner.tsx

2. **Inventory Components**
   - InventoryDashboard.tsx
   - StockLevelDisplay.tsx
   - StockAdjustmentForm.tsx
   - MovementHistory.tsx

3. **Shared Components**
   - UI components library
   - Form components
   - Layouts and navigation

4. **Services & Stores**
   - Extended API client
   - Service methods
   - Zustand stores
   - Type definitions

5. **Screens**
   - Warehouse staff screen
   - Inventory manager screen
   - Full integration

---

**Status: READY TO BUILD**
