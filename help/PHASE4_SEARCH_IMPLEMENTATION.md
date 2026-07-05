# Phase 4: Screen-Specific Search & Filter Implementation Plan

**Timeline:** Weeks 1-2 of Phase 4  
**Status:** Ready to Code  
**Objective:** Implement context-aware search and filtering across all main dashboard screens  

---

## Part 1: Architecture Overview

### 1.1 Core Philosophy

**NOT a universal top-right search bar**, but rather:
- Each screen has **screen-specific search** optimized for its data type
- Each column has **filter capabilities** (click column header)
- Search operators are **context-aware** (text vs. numeric vs. date)
- Results are **narrow-able** via combining filters

### 1.2 Technical Stack

**Backend:**
- NestJS services for search/filter logic
- PostgreSQL full-text search for complex queries
- Prisma ORM for data queries
- DTOs for filter specifications

**Frontend:**
- React components for search inputs
- Column header filter dropdown components
- Filter state management (React Context or Redux)
- Fuzzy matching library (fuse.js for client-side, or PostgreSQL for server)

### 1.3 High-Level Flow

```
User Input (Search box) 
    ↓
Parse filter operators (Equals, Contains, etc.)
    ↓
Build query (SQL/Prisma filter)
    ↓
Execute query with pagination
    ↓
Return results
    ↓
User clicks column header
    ↓
Show column-specific filter modal
    ↓
Apply additional filter
    ↓
Re-query with combined filters
```

---

## Part 2: Screens to Implement (Priority Order)

### Screen List with Complexity Rating

| # | Screen | Data Type | Complexity | Priority |
|---|--------|-----------|-----------|----------|
| 1 | Bills/Invoices | Mixed (text, numeric, date, enum) | ⭐⭐⭐ High | 1 |
| 2 | Products | Mixed (text, numeric, enum) | ⭐⭐⭐ High | 2 |
| 3 | Manage Stock | Mixed (text, numeric, date) | ⭐⭐ Medium | 3 |
| 4 | Customers | Text-heavy | ⭐ Low | 4 |
| 5 | Purchase Orders | Mixed (text, numeric, date, enum) | ⭐⭐⭐ High | 5 |

---

## Part 3: Backend Architecture

### 3.1 Filter Service (New)

**Location:** `src/common/services/filter.service.ts`

**Purpose:** Handle all filtering/search logic

```typescript
interface FilterSpec {
  field: string;
  operator: 'equals' | 'contains' | 'beginsWith' | 'endsWith' | 'isLike' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'in';
  value: any;
  dataType: 'text' | 'numeric' | 'date' | 'enum';
}

interface SearchRequest {
  organizationId: number;
  primaryFilter?: FilterSpec;      // Main search box
  columnFilters?: FilterSpec[];    // Secondary column filters
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class FilterService {
  // Convert FilterSpec to Prisma where clause
  buildWhereClause(filters: FilterSpec[]): any { }
  
  // Build complex query with multiple filters
  buildQuery(request: SearchRequest): Promise<any> { }
  
  // Get unique values for a column (for dropdown filters)
  getColumnValues(model: string, column: string, organizationId: number): Promise<any[]> { }
}
```

### 3.2 New DTOs

**Location:** `src/common/dto/filter.dto.ts`

```typescript
export class FilterOperatorDto {
  field: string;
  operator: string;
  value: string | number | Date | string[];
  dataType: 'text' | 'numeric' | 'date' | 'enum';
}

export class SearchRequestDto {
  primaryFilter?: FilterOperatorDto;
  columnFilters?: FilterOperatorDto[];
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class FilterResponseDto<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
```

### 3.3 New Endpoints (Per Module)

Each module gets new search endpoints:

**Bills Module:**
```typescript
@Post('/bills/search')
search(@OrgContext() organizationId: number, @Body() query: SearchRequestDto) {
  // Search bills with filters
}

@Get('/bills/filters/columns/:columnName')
getColumnValues(@Param('columnName') column: string) {
  // Get unique values for column filter dropdown
}
```

**Products Module:**
```typescript
@Post('/products/search')
search(@Body() query: SearchRequestDto) { }

@Get('/products/filters/columns/:columnName')
getColumnValues(@Param('columnName') column: string) { }
```

**Similar for Stock, Customers, Purchase Orders**

### 3.4 Database Queries (Optimized)

Add indexes for common search fields:

```sql
-- Bills search optimization
CREATE INDEX idx_bills_org_number ON Bill(organizationId, bill_number);
CREATE INDEX idx_bills_org_customer ON Bill(organizationId, customerId);
CREATE INDEX idx_bills_org_date ON Bill(organizationId, bill_date);
CREATE INDEX idx_bills_org_status ON Bill(organizationId, status);

-- Products search optimization
CREATE INDEX idx_products_org_name ON Product(organizationId, name);
CREATE INDEX idx_products_org_code ON Product(organizationId, code);

-- Stock search optimization
CREATE INDEX idx_inventory_org_product ON Inventory(organizationId, productId);
CREATE INDEX idx_inventory_warehouse ON Inventory(warehouseId);

-- PurchaseOrder search optimization
CREATE INDEX idx_po_org_status ON PurchaseOrder(organizationId, status);
CREATE INDEX idx_po_org_number ON PurchaseOrder(organizationId, po_number);
```

---

## Part 4: Screen-by-Screen Specifications

### Screen 1: Bills/Invoices (Priority 1)

**Location:** `src/modules/bills/services/bills-search.service.ts`

**Primary Search Box:**
```
Search for: [Bill Number] [Operator ▼]
├─ Equals
├─ Contains
├─ Begins With
└─ (no fuzzy for numbers)
```

**Secondary Filters (Below primary):**
```
Additional Filters:
[Customer Name] [Date Range] [Amount Range] 
[Status Filter] [Payment Method] [Salesman Filter]
```

**Column-Level Filters:**
| Column | Filter Type | Options |
|--------|------------|---------|
| Bill Number | Text | Equals, Contains, Begins With |
| Customer | Text | Fuzzy search + checkboxes |
| Amount | Numeric | Equals, Range (>, <, >=, <=) |
| Date | Date | Exact, Range, Last 7/30 days |
| Status | Enum | Checkboxes (PAID, PENDING, CREDIT, etc.) |
| Payment Method | Enum | Checkboxes (CASH, CREDIT, CARD, CHECK) |
| Salesman | Text | Checkboxes |

**Search Operators for Bills:**
```typescript
const billFilterOperators = {
  'bill_number': ['equals', 'contains', 'beginsWith'],
  'customer_name': ['contains', 'isLike', 'equals'],     // Fuzzy
  'amount': ['equals', 'gt', 'lt', 'gte', 'lte', 'between'],
  'bill_date': ['equals', 'between'],
  'status': ['in'],  // Checkboxes
  'payment_method': ['in'],
  'salesman': ['in', 'equals']
};
```

**Backend Endpoint:**
```typescript
@Post('/bills/search')
billSearch(
  @OrgContext() organizationId: number,
  @Body() query: SearchRequestDto
): Promise<FilterResponseDto<BillDto>> {
  // 1. Validate filters
  // 2. Build Prisma where clause
  // 3. Query with pagination
  // 4. Return results with total count
}
```

**Database Query Example:**
```typescript
// Pseudo-code
const where = {
  organizationId,
  bill_number: { contains: '1001' },  // Primary filter
  customerId: { in: [1, 2, 3] },      // Column filter
  bill_date: { gte: start, lte: end }, // Date range
  status: { in: ['PAID', 'PENDING'] }  // Status filter
};

const bills = await this.prisma.bill.findMany({
  where,
  include: { customer: true, created_by_user: true },
  skip: query.skip,
  take: query.take,
  orderBy: { [query.sortBy]: query.sortOrder }
});
```

---

### Screen 2: Products (Priority 2)

**Primary Search Box:**
```
Search for: [Product Name/Code] [Operator ▼]
├─ Is Like (fuzzy: "pana 70" finds "Panasonic Juicer")
├─ Equals
├─ Contains
└─ Begins With
```

**Secondary Filters:**
```
[Brand Filter] [Category Filter] [Stock Level] 
[Price Range] [Warehouse Availability]
```

**Column-Level Filters:**
| Column | Filter Type | Options |
|--------|------------|---------|
| Product Name | Text | Fuzzy + checkboxes |
| Code | Text | Exact, Contains |
| Brand | Enum | Checkboxes |
| Category | Enum | Checkboxes |
| Cost Price | Numeric | Range |
| Stock | Enum | Checkboxes (Low, Medium, High, Out) |

**Search Operators:**
```typescript
const productFilterOperators = {
  'name': ['isLike', 'contains', 'equals'],         // Fuzzy
  'code': ['equals', 'contains'],
  'brand': ['in'],
  'category': ['in'],
  'cost_price': ['equals', 'between'],
  'stock_level': ['in']  // Checkboxes
};
```

---

### Screen 3: Manage Stock (Priority 3)

**Primary Search Box:**
```
Search for: [Stock ID] [Operator ▼]
├─ Contains
├─ Equals
└─ Begins With
```

**Secondary Filters:**
```
[Date] [Bill Reference] [Account Type] [Warehouse]
```

**Column-Level Filters:**
| Column | Filter Type | Options |
|--------|------------|---------|
| Stock ID | Text | Contains, Equals |
| Bill Number | Text | Contains, Equals |
| Account | Enum | Checkboxes |
| Date | Date | Exact, Range |
| Warehouse | Enum | Checkboxes |
| Product | Text | Fuzzy + checkboxes |

---

### Screen 4: Customers (Priority 4)

**Primary Search Box:**
```
Search for: [Customer Name] [Operator ▼]
├─ Is Like (fuzzy)
├─ Equals
└─ Contains
```

**Secondary Filters:**
```
[Customer Type] [Credit Limit Range] [Active Status]
```

**Column-Level Filters:**
| Column | Filter Type | Options |
|--------|------------|---------|
| Name | Text | Fuzzy + checkboxes |
| Type | Enum | Checkboxes (INDIVIDUAL, RETAIL, WHOLESALE, etc.) |
| Phone | Text | Contains, Equals |
| Email | Text | Contains, Equals |
| Credit Limit | Numeric | Range |

---

### Screen 5: Purchase Orders (Priority 5)

**Primary Search Box:**
```
Search for: [PO Number] [Operator ▼]
├─ Equals
├─ Contains
└─ Begins With
```

**Secondary Filters:**
```
[Vendor] [Status] [Date Range] [Amount Range]
```

**Column-Level Filters:**
| Column | Filter Type | Options |
|--------|------------|---------|
| PO Number | Text | Exact, Contains |
| Vendor | Text | Fuzzy + checkboxes |
| Status | Enum | Checkboxes (DRAFT, SENT, RECEIVED, etc.) |
| Date | Date | Exact, Range |
| Amount | Numeric | Range |

---

## Part 5: Frontend Components (React)

### 5.1 Reusable Filter Components

**Location:** `frontend/src/components/filters/`

```
├─ SearchBox.tsx           (Primary search input + operator)
├─ ColumnFilterDropdown.tsx (Filter icon on column headers)
├─ TextFilter.tsx          (Text operators UI)
├─ NumericFilter.tsx       (Numeric/Range filter)
├─ DateFilter.tsx          (Date picker + ranges)
├─ EnumFilter.tsx          (Checkboxes for enums)
├─ FilterPanel.tsx         (All secondary filters)
└─ FilterSummary.tsx       (Shows active filters)
```

### 5.2 Component Specifications

**SearchBox.tsx**
```typescript
interface SearchBoxProps {
  placeholder: string;      // "Search by Bill #", "Search by Product"
  value: string;
  operator: string;         // 'equals', 'contains', 'isLike'
  operators: string[];      // Available operators
  onSearch: (value, operator) => void;
  loading?: boolean;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ ... }) => {
  return (
    <div className="search-box">
      <input 
        type="text" 
        placeholder={placeholder}
        value={value}
        onChange={(e) => onSearch(e.target.value, operator)}
      />
      <select 
        value={operator}
        onChange={(e) => onSearch(value, e.target.value)}
      >
        {operators.map(op => <option key={op}>{op}</option>)}
      </select>
    </div>
  );
};
```

**ColumnFilterDropdown.tsx**
```typescript
interface ColumnFilterProps {
  columnName: string;
  dataType: 'text' | 'numeric' | 'date' | 'enum';
  values?: any[];          // Unique values for enum
  onFilter: (spec: FilterSpec) => void;
}

export const ColumnFilterDropdown: React.FC<ColumnFilterProps> = ({ ... }) => {
  // Shows appropriate filter UI based on dataType
  // Fetches unique values from backend if enum
  // Updates parent component on apply
};
```

**TextFilter.tsx** (Used by ColumnFilterDropdown for text columns)
```typescript
<div className="filter-modal">
  <label>Text Filters</label>
  <select>
    <option>Contains</option>
    <option>Equals</option>
    <option>Begins With</option>
    <option>Ends With</option>
    <option>Is Like (Fuzzy)</option>
  </select>
  
  <input type="text" placeholder="Enter text" />
  
  <label>Or Select from List:</label>
  <div className="checkbox-list">
    <label><input type="checkbox" /> (All)</label>
    <label><input type="checkbox" /> Option 1</label>
    <label><input type="checkbox" /> Option 2</label>
  </div>
  
  <button onClick={applyFilter}>Apply</button>
  <button onClick={clearFilter}>Clear</button>
</div>
```

---

## Part 6: Implementation Sequence (Week by Week)

### Week 1: Backend Foundation

**Day 1-2: Architecture Setup**
- [ ] Create FilterService (`src/common/services/filter.service.ts`)
- [ ] Create FilterDTOs (`src/common/dto/filter.dto.ts`)
- [ ] Design database indexes (migration)
- [ ] Create tests for FilterService

**Day 3: Bills Search Implementation**
- [ ] Create BillsSearchService
- [ ] Add search endpoints to BillsController
- [ ] Implement column value fetcher (for filter dropdowns)
- [ ] Test with Postman

**Day 4: Products Search**
- [ ] Create ProductsSearchService
- [ ] Add search endpoints
- [ ] Add fuzzy matching logic
- [ ] Test

**Day 5: Other Screens (Stock, Customers, PO)**
- [ ] Create SearchServices for each
- [ ] Add endpoints
- [ ] Comprehensive testing
- [ ] Build complete, all backend done

### Week 2: Frontend Implementation

**Day 1-2: Base Components**
- [ ] Create SearchBox component
- [ ] Create ColumnFilterDropdown component
- [ ] Create TextFilter/NumericFilter/DateFilter components
- [ ] Create FilterPanel component

**Day 3-4: Screen Integration**
- [ ] Update Bills screen with search
- [ ] Update Products screen with search
- [ ] Update Stock screen with search
- [ ] Update Customers screen with search
- [ ] Update Purchase Orders screen with search

**Day 5: Testing & Polish**
- [ ] User acceptance testing
- [ ] Performance testing (pagination)
- [ ] Fix edge cases
- [ ] Documentation
- [ ] Demo to stakeholder

---

## Part 7: Testing Strategy

### Backend Tests

**FilterService Tests:**
```typescript
describe('FilterService', () => {
  it('should build where clause for text filter', () => { });
  it('should build where clause for numeric range', () => { });
  it('should build where clause for date range', () => { });
  it('should combine multiple filters', () => { });
  it('should handle fuzzy search', () => { });
});
```

**Bills Search Tests:**
```typescript
describe('Bills Search', () => {
  it('should find bill by exact number', () => { });
  it('should find bills by customer fuzzy search', () => { });
  it('should filter by status', () => { });
  it('should filter by date range', () => { });
  it('should combine multiple filters', () => { });
});
```

### Frontend Tests

**SearchBox Component Tests:**
```typescript
it('should call onSearch when input changes', () => { });
it('should call onSearch when operator changes', () => { });
it('should display loading state', () => { });
```

**ColumnFilterDropdown Tests:**
```typescript
it('should show text filter for text columns', () => { });
it('should show numeric filter for numeric columns', () => { });
it('should fetch unique values from API', () => { });
it('should apply filter on button click', () => { });
```

### Manual Testing Checklist

- [ ] Text search works (contains, equals, begins with)
- [ ] Fuzzy search works ("mak mus" finds "Makki Crockery")
- [ ] Numeric filters work (range, equals, gt, lt)
- [ ] Date filters work (exact, range, presets)
- [ ] Enum filters work (checkboxes)
- [ ] Combining filters works (primary + column)
- [ ] Pagination works with filters
- [ ] Column filter dropdowns load correctly
- [ ] Performance is acceptable (<500ms for 10k+ rows)
- [ ] Filters reset on screen navigation

---

## Part 8: Deliverables

### End of Week 2 Deliverables:

✅ **Backend:**
- FilterService fully implemented
- Search endpoints for all 5 screens
- Database indexes optimized
- 95%+ unit test coverage
- API documentation

✅ **Frontend:**
- Reusable filter components
- All 5 screens integrated with search
- Column header filter dropdowns
- Responsive design
- Accessible UI (keyboard navigation)

✅ **Documentation:**
- API endpoint documentation
- Component documentation
- User guide for search features
- Performance benchmarks

✅ **Testing:**
- Unit tests (backend)
- Component tests (frontend)
- Integration tests
- Manual test report
- Performance metrics

---

## Part 9: Database Migrations

**Migration File:** `prisma/migrations/YYYYMMDD_add_search_indexes/migration.sql`

```sql
-- Bills search indexes
CREATE INDEX idx_bills_org_number ON "Bill"("organizationId", "bill_number");
CREATE INDEX idx_bills_org_customer ON "Bill"("organizationId", "customerId");
CREATE INDEX idx_bills_org_date ON "Bill"("organizationId", "bill_date");
CREATE INDEX idx_bills_org_status ON "Bill"("organizationId", "status");

-- Products search indexes
CREATE INDEX idx_products_org_name ON "Product"("organizationId", "name");
CREATE INDEX idx_products_org_code ON "Product"("organizationId", "code");
CREATE INDEX idx_products_category ON "Product"("organizationId", "categoryId");

-- Inventory search indexes
CREATE INDEX idx_inventory_org_product ON "Inventory"("organizationId", "productId");
CREATE INDEX idx_inventory_warehouse_date ON "Inventory"("warehouseId");

-- Purchase Order search indexes
CREATE INDEX idx_po_org_status ON "PurchaseOrder"("organizationId", "status");
CREATE INDEX idx_po_org_number ON "PurchaseOrder"("organizationId", "po_number");
CREATE INDEX idx_po_vendor ON "PurchaseOrder"("vendorId");

-- Customer search indexes
CREATE INDEX idx_customers_org_name ON "Customer"("organizationId", "name");
CREATE INDEX idx_customers_type ON "Customer"("organizationId", "customerType");
```

---

## Part 10: Success Criteria

✅ All 5 screens have working search  
✅ Column filters functional on all screens  
✅ Fuzzy search working ("mak mus" → "Makki Crockery")  
✅ Combining multiple filters works  
✅ Pagination works with filters  
✅ Performance < 500ms for typical queries  
✅ No TypeScript errors  
✅ Tests passing (>90% coverage)  
✅ User can filter intuitively (like E-Khata)  
✅ Ready for Phase 4 new features  

---

## Ready to Start Coding?

Next steps:
1. Review this plan
2. Approve the structure
3. I'll start with **FilterService** (Day 1 backend)
4. Build iteratively through the week

**Should I start coding now?** 🚀

