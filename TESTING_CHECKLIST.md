# Phase 4 Testing Checklist - Interactive

## 🚀 Quick Start Testing (30 minutes)

### Step 1: Prepare Environment
```bash
# Terminal 1: Backend
cd D:\ghazanfar-erp-backend
npm run build
npm test
npx prisma migrate deploy
npm run start:dev

# Terminal 2: Frontend
cd D:\ghazanfar-erp-backend\frontend
npm install
npm run dev

# Terminal 3: Keep monitoring
tail -f backend.log
```

**Checklist:**
- [ ] Backend running on http://localhost:3000
- [ ] Frontend running on http://localhost:5173
- [ ] Database connected
- [ ] No build errors
- [ ] All 112 tests passing

---

## ✅ Test Case Tracker

### Backend Unit Tests
**Location:** Run `npm test`

| Test Suite | Count | Expected | Status |
|-----------|-------|----------|--------|
| FilterService | 25 | ✅ All pass | [ ] |
| BillsSearchService | 17 | ✅ All pass | [ ] |
| ProductsSearchService | 17 | ✅ All pass | [ ] |
| InventorySearchService | 17 | ✅ All pass | [ ] |
| CustomersSearchService | 19 | ✅ All pass | [ ] |
| PurchaseOrdersSearchService | 17 | ✅ All pass | [ ] |
| **TOTAL** | **112** | **✅ All pass** | [ ] |

**Result:** ___/112 passing  
**Errors:** (list any)
___________________________

---

## 🌐 API Endpoint Testing

### Bills Search Endpoints

#### Test 1: Basic Search (No Filters)
```
POST http://localhost:3000/bills/search
Headers: Authorization: Bearer {token}
Body: {"skip": 0, "take": 20}
```

| Criteria | Expected | ✓/✗ | Notes |
|----------|----------|-----|-------|
| Status Code | 200 | [ ] | |
| Response time | <200ms | [ ] | |
| data array | Populated | [ ] | |
| total | > 0 | [ ] | |
| hasMore | true/false | [ ] | |

**Response time:** ______ms
**Issues:** ___________________________

---

#### Test 2: Fuzzy Search
```
POST http://localhost:3000/bills/search
Body:
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
```

| Criteria | Expected | ✓/✗ | Notes |
|----------|----------|-----|-------|
| Status Code | 200 | [ ] | |
| Matches bill_number | "BILL-2026..." | [ ] | |
| Response time | <300ms | [ ] | |
| Fuzzy works | Found results | [ ] | |

**Found:** _____ results  
**Response time:** ______ms

---

#### Test 3: Status Filter (IN operator)
```
POST http://localhost:3000/bills/search
Body:
{
  "columnFilters": [{
    "field": "status",
    "operator": "in",
    "value": ["APPROVED"],
    "dataType": "ENUM"
  }],
  "skip": 0,
  "take": 20
}
```

| Criteria | Expected | ✓/✗ |
|----------|----------|-----|
| Status Code | 200 | [ ] |
| All results | status = APPROVED | [ ] |
| Response time | <300ms | [ ] |

---

#### Test 4: Amount Range Filter (BETWEEN)
```
POST http://localhost:3000/bills/search
Body:
{
  "columnFilters": [{
    "field": "amount",
    "operator": "between",
    "value": [10000, 100000],
    "dataType": "NUMERIC"
  }],
  "skip": 0,
  "take": 20
}
```

| Criteria | Expected | ✓/✗ |
|----------|----------|-----|
| Status Code | 200 | [ ] |
| All amounts | 10000 ≤ amount ≤ 100000 | [ ] |
| Response time | <400ms | [ ] |

---

#### Test 5: Multiple Filters Combined
```
POST http://localhost:3000/bills/search
Body:
{
  "primaryFilter": {
    "field": "bill_number",
    "operator": "contains",
    "value": "BILL",
    "dataType": "TEXT"
  },
  "columnFilters": [
    {
      "field": "status",
      "operator": "equals",
      "value": "APPROVED",
      "dataType": "ENUM"
    },
    {
      "field": "amount",
      "operator": "gt",
      "value": 50000,
      "dataType": "NUMERIC"
    }
  ],
  "skip": 0,
  "take": 20
}
```

| Criteria | Expected | ✓/✗ |
|----------|----------|-----|
| Status Code | 200 | [ ] |
| Matches bill_number | Contains "BILL" | [ ] |
| Status filter | APPROVED only | [ ] |
| Amount filter | > 50000 | [ ] |
| Intersection | All 3 conditions | [ ] |

**Found:** _____ results matching all filters

---

#### Test 6: Pagination
```
POST http://localhost:3000/bills/search
Body: {"skip": 20, "take": 20}
```

| Criteria | Expected | ✓/✗ |
|----------|----------|-----|
| Status Code | 200 | [ ] |
| skip | 20 | [ ] |
| take | 20 | [ ] |
| hasMore | Correct value | [ ] |
| Different results | From skip:0 | [ ] |

**Page 1 first item:** ___________  
**Page 2 first item:** ___________ (should be different)

---

#### Test 7: Invalid Operator Rejection
```
POST http://localhost:3000/bills/search
Body:
{
  "primaryFilter": {
    "field": "bill_number",
    "operator": "between",  ← Invalid for TEXT
    "value": [1, 2],
    "dataType": "TEXT"
  }
}
```

| Criteria | Expected | ✓/✗ |
|----------|----------|-----|
| Status Code | 400 | [ ] |
| Error message | "Operator 'between' not allowed" | [ ] |
| No results | Rejected | [ ] |

---

#### Test 8: Invalid Field Rejection
```
POST http://localhost:3000/bills/search
Body:
{
  "columnFilters": [{
    "field": "invalid_field",
    "operator": "equals",
    "value": "test",
    "dataType": "TEXT"
  }]
}
```

| Criteria | Expected | ✓/✗ |
|----------|----------|-----|
| Status Code | 400 | [ ] |
| Error message | "Invalid field" | [ ] |

---

### Bills Column Values Endpoint

#### Test: Get Status Values
```
GET http://localhost:3000/bills/filters/columns/status
```

| Criteria | Expected | ✓/✗ |
|----------|----------|-----|
| Status Code | 200 | [ ] |
| Array type | [{value, label}, ...] | [ ] |
| Contains | ["APPROVED", "PENDING", ...] | [ ] |
| Response time | <100ms | [ ] |

**Values returned:**
- [ ] APPROVED
- [ ] PENDING
- [ ] REJECTED

---

#### Test: Get Customer Names
```
GET http://localhost:3000/bills/filters/columns/customer_name
```

| Criteria | Expected | ✓/✗ |
|----------|----------|-----|
| Status Code | 200 | [ ] |
| Array | Customer names | [ ] |
| Max items | ≤ 100 | [ ] |
| Format | {value, label} objects | [ ] |

**Sample values:** _________________

---

#### Test: Invalid Column Name
```
GET http://localhost:3000/bills/filters/columns/nonexistent
```

| Criteria | Expected | ✓/✗ |
|----------|----------|-----|
| Status Code | 400 | [ ] |
| Error message | "Field not available" | [ ] |

---

## 🖥️ Frontend Component Testing

### SearchBox Component

| Test | Steps | Status | Notes |
|------|-------|--------|-------|
| Renders | Mount component | [ ] | |
| Input focus | Click input | [ ] | |
| Type text | Type "test" | [ ] | |
| Operator change | Select dropdown | [ ] | |
| Submit | Click Search | [ ] | Callback fires? |
| Empty submit | Click without text | [ ] | No action? |

---

### Filter Components

| Component | Renders | Functions | Status |
|-----------|---------|-----------|--------|
| NumericFilter | [ ] | Range works | [ ] |
| DateFilter | [ ] | Date picker works | [ ] |
| TextFilter | [ ] | Text operators | [ ] |
| EnumFilter | [ ] | Checkboxes work | [ ] |
| ColumnFilterDropdown | [ ] | Opens/closes | [ ] |
| FilterPanel | [ ] | Buttons visible | [ ] |
| FilterSummary | [ ] | Tags show/hide | [ ] |

---

## 📱 Screen Testing

### Bills Screen

| Feature | Test | ✓/✗ | Time (ms) |
|---------|------|-----|-----------|
| Initial load | Table appears | [ ] | ____ |
| Search | Enter text, search | [ ] | ____ |
| Fuzzy match | Search "mak mus" | [ ] | ____ |
| Filter | Add filter | [ ] | ____ |
| Multiple filters | Add 3 filters | [ ] | ____ |
| Remove filter | Click X on tag | [ ] | ____ |
| Pagination | Click Next | [ ] | ____ |
| Pagination | Click Previous | [ ] | ____ |
| No results | Search for invalid | [ ] | Message? |
| Loading state | During fetch | [ ] | Shows? |

**Issues found:**
1. ____________________________
2. ____________________________

---

### Products Screen

| Feature | Test | ✓/✗ |
|---------|------|-----|
| Initial load | Products show | [ ] |
| Name search | Fuzzy match works | [ ] |
| Code filter | Filter by code | [ ] |
| Price range | cost_price between | [ ] |
| Stock level | Filter by level | [ ] |
| Pagination | All pages work | [ ] |

**Sample searches to verify:**
- [ ] "makk mus" → finds "Makki Crockery..."
- [ ] Code "MCR" → finds products
- [ ] Price 100-500 → range works
- [ ] Stock "low" → shows low stock items

---

### Inventory Screen

| Feature | Test | ✓/✗ |
|---------|------|-----|
| Load | Items appear | [ ] |
| Product search | Fuzzy match | [ ] |
| Warehouse filter | By warehouse | [ ] |
| Quantity range | Numeric range | [ ] |
| Date range | Date between | [ ] |
| Stock ID format | INV-{number} | [ ] |

---

### Customers Screen

| Feature | Test | ✓/✗ |
|---------|------|-----|
| Load | Customers appear | [ ] |
| Name fuzzy | Search partial name | [ ] |
| Type filter | RETAILER/WHOLESALER | [ ] |
| Phone search | By phone | [ ] |
| Email search | By email | [ ] |
| Credit limit | Numeric range | [ ] |

---

### Purchase Orders Screen

| Feature | Test | ✓/✗ |
|---------|------|-----|
| Load | Orders appear | [ ] |
| PO number | Search by number | [ ] |
| Vendor filter | By vendor | [ ] |
| Status filter | PENDING/APPROVED/etc | [ ] |
| Amount range | Numeric range | [ ] |
| Created date | Date range | [ ] |

---

## ⚡ Performance Verification

### Response Time Targets
```
Target: <500ms for all searches
```

| Test Case | Actual | Target | ✓/✗ | Notes |
|-----------|--------|--------|-----|-------|
| No filters | ____ms | <200ms | [ ] | |
| 1 filter | ____ms | <300ms | [ ] | |
| 2 filters | ____ms | <350ms | [ ] | |
| 3 filters | ____ms | <400ms | [ ] | |
| 5+ filters | ____ms | <500ms | [ ] | |
| Large result set (1000+) | ____ms | <500ms | [ ] | |
| Pagination skip=1000 | ____ms | <300ms | [ ] | |

### Database Index Check
```bash
psql -U postgres -d erp_database -c "\di" | grep idx_
```

**Indexes present:**
- [ ] idx_bill_org_number
- [ ] idx_bill_org_customer
- [ ] idx_bill_org_date
- [ ] idx_bill_org_status
- [ ] idx_bill_org_amount
- [ ] idx_product_org_name
- [ ] idx_product_org_code
- [ ] idx_product_org_category
- [ ] idx_product_org_brand
- [ ] idx_inventory_org_product
- [ ] idx_inventory_warehouse_date
- [ ] idx_inventory_org_warehouse
- [ ] idx_purchase_order_org_status
- [ ] idx_purchase_order_org_number
- [ ] idx_purchase_order_vendor
- [ ] idx_purchase_order_org_date
- [ ] idx_customer_org_name
- [ ] idx_customer_org_type
- [ ] idx_customer_org_phone
- [ ] idx_customer_org_email

**Missing indexes:** _______________

---

## 🔒 Security Tests

| Test | Attempt | Expected | ✓/✗ |
|------|---------|----------|-----|
| SQL injection | `'; DROP TABLE--` | Escaped/safe | [ ] |
| XSS attempt | `<script>alert</script>` | Rendered as text | [ ] |
| No auth | Missing token | 401 response | [ ] |
| Bad token | Invalid JWT | 401 response | [ ] |
| CORS | From other origin | Blocked/headers | [ ] |

---

## ❌ Error Handling Tests

| Scenario | Action | Expected | ✓/✗ |
|----------|--------|----------|-----|
| Backend offline | Search | Error message | [ ] |
| Network timeout | Slow network | Timeout error | [ ] |
| Invalid data | Bad JSON | 400 error | [ ] |
| Unknown screen | Invalid endpoint | 404 error | [ ] |
| DB error | Inject bad data | 500 with message | [ ] |

---

## 📊 Test Summary Report

**Date:** _____________  
**Tester:** _____________  
**Environment:** Dev / Staging / Prod

### Results Summary

| Category | Result | Status |
|----------|--------|--------|
| Backend unit tests | ___/112 | [ ] Pass |
| API endpoint tests | ___/48 | [ ] Pass |
| Frontend component tests | ___/35 | [ ] Pass |
| Screen integration tests | ___/25 | [ ] Pass |
| Filter operator tests | ___/16 | [ ] Pass |
| Performance tests | ___/7 | [ ] Pass |
| Security tests | ___/5 | [ ] Pass |
| Error handling tests | ___/5 | [ ] Pass |

**Total Tests Run:** _____ / 141  
**Pass Rate:** _____%

---

### Critical Issues Found

1. **Issue:** _______________________
   - **Severity:** High / Medium / Low
   - **Reproduction:** _______________________
   - **Status:** [ ] Blocking [ ] Can ship

2. **Issue:** _______________________
   - **Severity:** High / Medium / Low
   - **Reproduction:** _______________________
   - **Status:** [ ] Blocking [ ] Can ship

---

### Minor Issues / Observations

1. _______________________
2. _______________________
3. _______________________

---

## ✅ Final Approval

- [ ] All critical tests pass
- [ ] No blocking issues
- [ ] Performance meets targets
- [ ] Security verified
- [ ] Ready for production

**Sign-off:**  
**Name:** _____________  
**Date:** _____________  
**Signature:** _____________

---

## 🚀 Next Steps

- [ ] Deploy to staging
- [ ] Perform UAT
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Gather user feedback

---

## 📞 Test Execution Commands

```bash
# Run all tests
npm test

# Test specific suite
npm test -- BillsSearchService

# Test with coverage
npm test -- --coverage

# API test with curl
curl -X POST http://localhost:3000/bills/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"skip": 0, "take": 20}'

# Check performance
curl -w "@curl-format.txt" -o /dev/null -s \
  http://localhost:3000/bills/search

# Check indexes
psql -U postgres -d erp_database -c "\di" | grep idx_

# Monitor logs
tail -f backend.log
```

---

**Last Updated:** 2026-07-04  
**Version:** 1.0  
**Status:** Ready for Testing
