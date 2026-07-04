# Phase 4 Search System - Testing Guide

## Overview
Complete testing guide for Phase 4 Screen-Specific Search implementation (Week 1-2)

**Last Updated:** 2026-07-04
**Testing Status:** Ready for QA

---

## 📋 Pre-Test Checklist

### Backend Setup
- [ ] Backend running on `http://localhost:3000`
- [ ] Database connected and accessible
- [ ] All 112 unit tests passing: `npm test`
- [ ] TypeScript compilation successful: `npm run build`
- [ ] Prisma migration applied: `npx prisma migrate deploy`

### Frontend Setup
- [ ] Frontend running on `http://localhost:5173`
- [ ] All dependencies installed: `npm install`
- [ ] No build errors
- [ ] Browser DevTools open (F12) to check console errors

### Test Environment
- [ ] Sample data in database (bills, products, customers, etc.)
- [ ] Valid JWT token for authentication
- [ ] Network requests working (check Network tab in DevTools)

---

## 🧪 Test Suites

### Suite 1: Backend Unit Tests
**Status:** ✅ COMPLETE (112/112 passing)

**Coverage:**
- FilterService (25 tests)
  - All 16 filter operators (text, numeric, list)
  - Fuzzy matching with word fragments
  - Multiple filter combinations
  - Pagination & sorting

- BillsSearchService (17 tests)
  - Search without filters
  - Single and multiple filter combinations
  - Column value retrieval
  - Result formatting
  - Invalid operator/field rejection

- ProductsSearchService (17 tests)
- InventorySearchService (17 tests)
- CustomersSearchService (19 tests)
- PurchaseOrdersSearchService (17 tests)

**Run Tests:**
```bash
cd D:\ghazanfar-erp-backend
npm test
```

**Expected Output:** `Test Suites: 6 passed, 6 total | Tests: 112 passed, 112 total`

---

### Suite 2: API Endpoint Tests

#### 2.1 Bills Search Endpoint
**Endpoint:** `POST /bills/search`

**Test Case 1: Search without filters**
```json
Request:
{
  "skip": 0,
  "take": 20
}

Expected: 
- Status 200
- Returns array of bills
- total >= 0
- skip: 0, take: 20, hasMore: boolean
```

**Test Case 2: Primary search with fuzzy match**
```json
Request:
{
  "primaryFilter": {
    "field": "bill_number",
    "operator": "isLike",
    "value": "BILL",
    "dataType": "TEXT"
  },
  "skip": 0,
  "take": 20
}

Expected:
- Status 200
- Returns matching bills
- Response time < 500ms
```

**Test Case 3: Multiple column filters**
```json
Request:
{
  "columnFilters": [
    {
      "field": "status",
      "operator": "in",
      "value": ["APPROVED"],
      "dataType": "ENUM"
    },
    {
      "field": "amount",
      "operator": "between",
      "value": [10000, 100000],
      "dataType": "NUMERIC"
    }
  ],
  "skip": 0,
  "take": 20
}

Expected:
- Status 200
- Returns bills matching both filters
- Response time < 500ms
```

**Test Case 4: Invalid operator rejection**
```json
Request:
{
  "primaryFilter": {
    "field": "bill_number",
    "operator": "between",
    "value": [1, 2],
    "dataType": "TEXT"
  }
}

Expected:
- Status 400
- Message: "Operator 'between' is not allowed for field 'bill_number'"
```

#### 2.2 Bills Column Values Endpoint
**Endpoint:** `GET /bills/filters/columns/:columnName`

**Test Cases:**
```
/bills/filters/columns/status
Expected: Array of {value, label} objects with status values

/bills/filters/columns/payment_method
Expected: Array of payment method values

/bills/filters/columns/customer_name
Expected: Array of customer names (up to 100)

/bills/filters/columns/employee_name
Expected: Array of employee names

Invalid column: /bills/filters/columns/invalid
Expected: Status 400 with error message
```

#### 2.3 Other Screens (Products, Inventory, Customers, PO)
**Same test pattern as Bills for:**
- POST /products/search
- GET /products/filters/columns/:columnName
- POST /inventory/search
- GET /inventory/filters/columns/:columnName
- POST /customers/search
- GET /customers/filters/columns/:columnName
- POST /purchase-orders/search
- GET /purchase-orders/filters/columns/:columnName

---

### Suite 3: Frontend Component Tests

#### 3.1 SearchBox Component
**Location:** `frontend/src/components/filters/SearchBox.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Render with default | Mount component | Input visible, operator dropdown visible |
| Text input | Type "test" | Input value updates |
| Operator change | Select "Contains" | Operator state updates |
| Submit search | Click "Search" button | onSearch callback fires with value & operator |
| Empty submission | Click without text | No callback triggered |
| Tab navigation | Use Tab key | Focus moves through inputs |

#### 3.2 NumericFilter Component
| Test Case | Steps | Expected |
|-----------|-------|----------|
| Single value mode | Select "Equals" | Single input field appears |
| Range mode | Select "Between" | Two input fields (min/max) appear |
| Value validation | Leave empty, click Apply | Alert shown |
| Number input | Enter 1000 | Number parses correctly |
| Range validation | Min > Max, click Apply | Works (or shows warning) |
| Apply button | Enter values, click Apply | onApply callback fired |
| Cancel button | Click Cancel | onCancel callback fired |

#### 3.3 DateFilter Component
| Test Case | Steps | Expected |
|-----------|-------|----------|
| Single date mode | Select "On" | One date picker visible |
| Range mode | Select "Between" | Two date pickers visible |
| Date selection | Pick date | Date value updates |
| Apply | Enter dates, click Apply | onApply callback fired with ISO strings |
| Validation | Leave empty, click Apply | Alert shown |

#### 3.4 TextFilter Component
| Test Case | Steps | Expected |
|-----------|-------|----------|
| Operator dropdown | Open dropdown | All 8 text operators visible |
| Operator selection | Select "Fuzzy match" | Operator updates |
| Text input | Type text | Value updates |
| Submit | Enter text, click Apply | onApply with operator & value |
| Empty validation | Leave empty, click Apply | Alert shown |

#### 3.5 EnumFilter Component
| Test Case | Steps | Expected |
|-----------|-------|----------|
| Checkbox list | Mount with values | All options visible with checkboxes |
| Select one | Click checkbox | Item highlighted |
| Select multiple | Click multiple | All selected items tracked |
| Deselect | Uncheck | Item removed from selection |
| Apply | Select items, click Apply | onApply with IN operator and array |
| Validation | No selection, click Apply | Alert shown |
| Scroll | Many items | Container scrolls without affecting page |

#### 3.6 FilterPanel Component
| Test Case | Steps | Expected |
|-----------|-------|----------|
| Button rendering | Mount with columns | Button for each column visible |
| Click to open | Click column button | Dropdown appears below |
| Click to close | Click same button again | Dropdown closes |
| Filter application | Apply filter in dropdown | onFilterApply callback fired |
| Multiple opens | Open different columns | Only one dropdown visible at a time |

#### 3.7 FilterSummary Component
| Test Case | Steps | Expected |
|-----------|-------|----------|
| Empty state | No filters | Component not visible |
| Primary filter | Add primary filter | Filter tag shown with remove button |
| Column filters | Add column filters | Tags shown for each |
| Remove primary | Click remove on primary | Tag disappears, callback fires |
| Remove column | Click remove on column | Tag disappears, callback fires |
| Multiple filters | Add 5 filters | All tags visible and removable |

#### 3.8 ColumnFilterDropdown Component
| Test Case | Steps | Expected |
|-----------|-------|----------|
| Text field type | dataType: TEXT | TextFilter component renders |
| Numeric type | dataType: NUMERIC | NumericFilter component renders |
| Date type | dataType: DATE | DateFilter component renders |
| Enum type | dataType: ENUM | EnumFilter component renders with values |
| Header display | Mount with columnName | Column name shown in header |
| Close button | Click X | onClose callback fired |

---

### Suite 4: Screen Integration Tests

#### 4.1 Bills Screen
**File:** `frontend/src/components/screens/BillsScreen.tsx`

| Test | Steps | Expected |
|------|-------|----------|
| Initial load | Mount | Bills table loads with data |
| Search | Enter text, search | Table filters by bill_number |
| Multiple filters | Add status + amount filters | Table shows intersecting results |
| Pagination | Click Next | Shows next 20 results |
| Pagination prev | Click Previous | Shows previous results |
| Sort | Click header (if clickable) | Results sort by that column |
| Clear filter | Click X on filter tag | Filter removed, results update |
| Empty results | Search for non-existent | "No bills found" message |
| Loading state | During fetch | "Loading..." shown |
| Response time | Perform search | <500ms (check DevTools Network) |

#### 4.2 Products Screen
| Test | Steps | Expected |
|------|-------|----------|
| Initial load | Mount | Products table loads |
| Fuzzy search | Search "makk mus" | Finds "Makki Crockery Lala Mausa" |
| Code filter | Search by code | Matches products by code |
| Price range | Use cost_price between | Shows products in range |
| Stock level | Filter by stock_level | Shows high/low/out of stock items |
| Pagination | Page through results | Correct products on each page |

#### 4.3 Inventory Screen
| Test | Steps | Expected |
|------|-------|----------|
| Initial load | Mount | Inventory items load |
| Product search | Search product name | Matches product_name fuzzy |
| Warehouse filter | Select warehouse | Shows items from warehouse |
| Quantity range | Filter quantity | Shows items in range |
| Date range | Use date_received between | Shows items from date range |
| Stock ID format | Check stock_id column | Format: INV-{number} |

#### 4.4 Customers Screen
| Test | Steps | Expected |
|------|-------|----------|
| Initial load | Mount | Customers table loads |
| Name search | Fuzzy search customer | Finds by partial name |
| Type filter | Select RETAILER/WHOLESALER | Filters by type |
| Phone search | Search phone number | Matches phone column |
| Email search | Search email domain | Matches email |
| Credit limit | Filter by credit_limit range | Shows customers in range |

#### 4.5 Purchase Orders Screen
| Test | Steps | Expected |
|------|-------|----------|
| Initial load | Mount | Purchase orders load |
| PO number search | Search "PO-2026" | Matches po_number |
| Vendor filter | Select vendor | Shows vendor's orders |
| Status filter | Select PENDING/APPROVED | Filters by status |
| Amount range | Filter amount between | Shows orders in range |
| Date filter | Use created_date | Filters by creation date |
| Expected delivery | Shows date or N/A | Handles null dates correctly |

---

### Suite 5: Filter Operator Tests

#### All Text Operators
**Test on:** Bills.bill_number, Customers.name, Products.name

| Operator | Test Value | Expected Match | Not Match |
|----------|-----------|-----------------|-----------|
| equals | "BILL-2026-000001" | Exact match only | Similar bills |
| doesNotEqual | "BILL-2026-000001" | All except exact | Exact match |
| contains | "2026" | Bills with "2026" | Bills without |
| doesNotContain | "APPROVED" | Bills without word | Bills with word |
| isLike (fuzzy) | "mak mus" | "Makki... Mausa" | Exact only |
| isNotLike | "PENDING" | Non-matching fuzzy | Fuzzy matches |
| beginsWith | "BILL" | All starting with | Others |
| endsWith | "001" | All ending with | Others |

#### All Numeric Operators
**Test on:** Bills.amount, Products.cost_price, Inventory.quantity

| Operator | Test Value | Expected Match |
|----------|-----------|-----------------|
| equals | 50000 | Amount == 50000 |
| gt (greater than) | 50000 | Amount > 50000 |
| gte (>=) | 50000 | Amount >= 50000 |
| lt (less than) | 50000 | Amount < 50000 |
| lte (<=) | 50000 | Amount <= 50000 |
| between | [10000, 100000] | 10000 <= Amount <= 100000 |

#### All List Operators
**Test on:** Bills.status, Customers.customer_type

| Operator | Test Value | Expected Match |
|----------|-----------|-----------------|
| in | ["APPROVED", "PENDING"] | Status in list |
| notIn | ["REJECTED"] | Status not in list |

---

### Suite 6: Performance Tests

#### Response Time Verification
**Target:** <500ms for all searches

```
Test 1: Basic search (no filters)
POST /bills/search?skip=0&take=20
Expected: <200ms

Test 2: Single filter
POST /bills/search with status filter
Expected: <300ms

Test 3: Multiple filters (3-5)
POST /bills/search with status + amount + date filters
Expected: <400ms

Test 4: Large result set
POST /bills/search with wide range (1000+ results)
Expected: <500ms

Test 5: Pagination
POST /bills/search?skip=1000&take=20
Expected: <300ms
```

**How to Measure:**
1. Open DevTools (F12)
2. Go to Network tab
3. Perform search
4. Check request duration in Network panel
5. Log results in testing spreadsheet

#### Database Index Validation
```bash
# Check if indexes are created
psql -U postgres -d erp_database -c "\di"

Expected indexes:
- idx_bill_org_number
- idx_bill_org_customer
- idx_bill_org_date
- idx_bill_org_status
- idx_bill_org_amount
- idx_product_org_name
- idx_product_org_code
- idx_product_org_category
- idx_product_org_brand
- idx_inventory_org_product
- idx_inventory_warehouse_date
- idx_inventory_org_warehouse
- idx_purchase_order_org_status
- idx_purchase_order_org_number
- idx_purchase_order_vendor
- idx_purchase_order_org_date
- idx_customer_org_name
- idx_customer_org_type
- idx_customer_org_phone
- idx_customer_org_email
```

---

### Suite 7: Error Handling Tests

#### Invalid Input Handling

| Scenario | Input | Expected |
|----------|-------|----------|
| Invalid operator | field: "bill_number", operator: "between" | 400 Bad Request |
| Invalid field | field: "nonexistent", operator: "equals" | 400 Bad Request |
| Invalid dataType | value: "text", dataType: "UNKNOWN" | 400 Bad Request |
| Empty array for IN | value: [], operator: "in" | 400 or handled gracefully |
| Negative skip | skip: -1 | 400 or default to 0 |
| Zero take | take: 0 | 400 or default to 20 |
| Missing token | No Authorization header | 401 Unauthorized |
| Invalid token | Bearer invalid_token | 401 Unauthorized |
| Wrong org | organizationId: 999 | 200 with empty results |

#### Network Error Handling

| Scenario | Action | Expected |
|----------|--------|----------|
| Server offline | Search while backend down | Error message shown |
| Slow network | Search with Network throttle | Loading state shows |
| Timeout | Very slow response | Timeout error or retry |
| Connection lost | Kill connection mid-request | Error handling graceful |

---

### Suite 8: Security Tests

| Test | Action | Expected |
|------|--------|----------|
| SQL injection | value: "'; DROP TABLE bills; --" | Escaped/sanitized, no execution |
| XSS attempt | value: "<script>alert('xss')</script>" | Rendered as text, not executed |
| Token stealing | Check token not exposed in logs | Token only in Auth header |
| CORS | Request from different origin | Proper CORS headers or rejection |
| Auth bypass | No token, access search | 401 Unauthorized |

---

## 📊 Test Execution Checklist

### Phase 1: Backend Validation
- [ ] All 112 unit tests passing
- [ ] No TypeScript errors in build
- [ ] Database migration successful
- [ ] Sample data inserted

### Phase 2: API Endpoint Testing
- [ ] Bills search endpoint works
- [ ] Products search endpoint works
- [ ] Inventory search endpoint works
- [ ] Customers search endpoint works
- [ ] Purchase Orders search endpoint works
- [ ] All column value endpoints work
- [ ] Invalid requests rejected properly
- [ ] Pagination works (skip/take)

### Phase 3: Frontend Component Testing
- [ ] SearchBox component renders & functions
- [ ] NumericFilter component works
- [ ] DateFilter component works
- [ ] TextFilter component works
- [ ] EnumFilter component works
- [ ] FilterPanel component works
- [ ] FilterSummary component works
- [ ] ColumnFilterDropdown component works

### Phase 4: Screen Integration Testing
- [ ] Bills screen loads & searches
- [ ] Products screen loads & searches
- [ ] Inventory screen loads & searches
- [ ] Customers screen loads & searches
- [ ] Purchase Orders screen loads & searches
- [ ] All screens handle errors gracefully
- [ ] All screens show loading states

### Phase 5: Filter Operator Testing
- [ ] All text operators work (8)
- [ ] All numeric operators work (6)
- [ ] All list operators work (2)
- [ ] Fuzzy matching works correctly
- [ ] Multiple filters combine properly

### Phase 6: Performance Testing
- [ ] Basic search <200ms
- [ ] Single filter <300ms
- [ ] Multiple filters <400ms
- [ ] Large results <500ms
- [ ] Database indexes created
- [ ] No N+1 queries

### Phase 7: Error Handling
- [ ] Invalid operators rejected
- [ ] Invalid fields rejected
- [ ] Invalid tokens rejected
- [ ] Network errors handled
- [ ] Graceful error messages

### Phase 8: Security Testing
- [ ] SQL injection attempts blocked
- [ ] XSS attempts escaped
- [ ] Token properly secured
- [ ] CORS configured correctly
- [ ] Auth bypass prevented

---

## 🔍 Testing Tools & Commands

### Backend Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- BillsSearchService

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

### API Testing with curl
```bash
# Search bills
curl -X POST http://localhost:3000/bills/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skip": 0,
    "take": 20,
    "primaryFilter": {
      "field": "bill_number",
      "operator": "contains",
      "value": "BILL",
      "dataType": "TEXT"
    }
  }'

# Get column values
curl -X GET http://localhost:3000/bills/filters/columns/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Testing
```bash
# Start dev server
cd frontend
npm run dev

# Build check
npm run build

# Run linting
npm run lint
```

### Performance Testing Tools
- **Chrome DevTools Network Tab** - Check response times
- **Chrome DevTools Performance Tab** - Profile rendering
- **Postman** - Batch API testing
- **k6** - Load testing (optional)

---

## 📝 Test Results Template

**Date:** ___________
**Tester:** ___________
**Environment:** Dev / Staging / Production

### Backend Tests
- Unit tests: ___/112 passing
- Build status: ✓ / ✗
- Errors: (list any)

### API Tests
- Bills search: ✓ / ✗
- Products search: ✓ / ✗
- Inventory search: ✓ / ✗
- Customers search: ✓ / ✗
- Purchase Orders search: ✓ / ✗
- Invalid operator rejection: ✓ / ✗

### Frontend Tests
- Components render: ✓ / ✗
- Search functionality: ✓ / ✗
- Filters work: ✓ / ✗
- Pagination: ✓ / ✗

### Performance
- Average response time: ___ms
- Slowest query: ___ms
- Indexes present: ✓ / ✗

### Issues Found
1. (description)
2. (description)

### Sign-off
- [ ] All critical tests passing
- [ ] No blocking issues
- [ ] Ready for deployment

---

## 🚀 Deployment Readiness

**Mark as Ready when:**
- [x] All 112 backend tests passing
- [ ] All API endpoints tested manually
- [ ] All 5 screens functional
- [ ] Performance targets met
- [ ] No security issues found
- [ ] Error handling verified
- [ ] Documentation complete

---

## 📞 Support & Escalation

**If tests fail:**
1. Check error message for clues
2. Verify pre-test setup complete
3. Check DevTools console for client errors
4. Review backend logs for server errors
5. Compare with expected values in test cases
6. Document issue with reproduction steps

**Contact for issues:**
- Backend: Check `npm run build` and test logs
- Frontend: Check browser console (F12)
- Database: Check Prisma migrations and indexes
