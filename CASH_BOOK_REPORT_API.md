# Cash Book Reports & Analytics API

Complete API documentation for the Cash Book Report system with backend endpoints and frontend integration.

## Table of Contents
1. [Backend API Endpoints](#backend-api-endpoints)
2. [Frontend Integration](#frontend-integration)
3. [Offline Mode](#offline-mode)
4. [Examples](#examples)

---

## Backend API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer {token}` header.

Base URL: `/api/cash-book`

### 1. Get KPIs (Reconciliation Dashboard)

**Endpoint:** `GET /cash-book/kpis`

**Query Parameters:**
- `fromDate` (required): Start date in YYYY-MM-DD format
- `toDate` (required): End date in YYYY-MM-DD format

**Response:**
```json
{
  "totalEntries": 150,
  "matchedCount": 132,
  "unmatchedCount": 18,
  "reconciliationPercentage": 88.0,
  "totalAmount": 5000000,
  "discrepancyAmount": 450000,
  "oldestUnmatchedDays": 45,
  "avgMatchTime": 12.5
}
```

**Example Request:**
```bash
GET /api/cash-book/kpis?fromDate=2026-06-01&toDate=2026-07-05
Authorization: Bearer eyJhbGc...
```

**Error Codes:**
- `400`: Missing or invalid date parameters
- `401`: Unauthorized (missing or invalid token)
- `500`: Server error

---

### 2. Get Cash Flow Analysis

**Endpoint:** `GET /cash-book/cash-flow`

**Query Parameters:**
- `groupBy` (optional): 'day' | 'week' | 'month' (default: 'day')
- `fromDate` (optional): Start date in YYYY-MM-DD format
- `toDate` (optional): End date in YYYY-MM-DD format

**Response:**
```json
[
  {
    "date": "2026-06-01",
    "amount": 250000,
    "category": "sales"
  },
  {
    "date": "2026-06-01",
    "amount": 150000,
    "category": "purchases"
  },
  {
    "date": "2026-06-01",
    "amount": 50000,
    "category": "expenses"
  }
]
```

**Example Requests:**
```bash
# Daily cash flow for last 30 days
GET /api/cash-book/cash-flow?groupBy=day&fromDate=2026-06-05&toDate=2026-07-05

# Weekly cash flow for a quarter
GET /api/cash-book/cash-flow?groupBy=week&fromDate=2026-04-01&toDate=2026-07-05

# Monthly cash flow for the year
GET /api/cash-book/cash-flow?groupBy=month&fromDate=2026-01-01&toDate=2026-12-31
```

**Categories:**
- `sales`: SALES_RECEIPT, OTHER_INCOME, LOAN_RECEIVED
- `purchases`: PURCHASE_PAYMENT
- `expenses`: OPERATING_EXPENSE, LOAN_PAYMENT, EQUIPMENT, OTHER_EXPENSE

---

### 3. Get Discrepancies & Aging

**Endpoint:** `GET /cash-book/discrepancies`

**Query Parameters:**
- `fromDate` (optional): Start date in YYYY-MM-DD format
- `toDate` (optional): End date in YYYY-MM-DD format
- `category` (optional): Entry category filter

**Response:**
```json
[
  {
    "id": 42,
    "type": "PURCHASE_PAYMENT",
    "description": "Invoice #12345 - Supplier A",
    "amount": 150000,
    "daysOld": 65,
    "severity": "critical"
  },
  {
    "id": 43,
    "type": "OPERATING_EXPENSE",
    "description": "Office supplies",
    "amount": 25000,
    "daysOld": 35,
    "severity": "warning"
  }
]
```

**Severity Calculation:**
- `critical`: > 60 days old
- `warning`: 30-60 days old
- `notice`: < 30 days old

**Example Request:**
```bash
GET /api/cash-book/discrepancies?fromDate=2026-06-01&toDate=2026-07-05&category=PURCHASE_PAYMENT
```

---

### 4. Get Unmatched Items by Age

**Endpoint:** `GET /cash-book/unmatched-items`

**Query Parameters:**
- `ageingDays` (optional): Filter items older than N days (default: 30)

**Response:**
```json
[
  {
    "id": 101,
    "entryDate": "2026-05-01",
    "referenceNumber": "CHK-2026-5001",
    "amount": 500000,
    "description": "Cheque deposit - Bank XYZ",
    "daysOld": 35,
    "category": "SALES_RECEIPT"
  }
]
```

**Example Request:**
```bash
# Items unmatched for 30+ days
GET /api/cash-book/unmatched-items?ageingDays=30

# Items unmatched for 60+ days (critical)
GET /api/cash-book/unmatched-items?ageingDays=60
```

---

### 5. Export Report

**Endpoint:** `GET /cash-book/export`

**Query Parameters:**
- `format` (required): 'pdf' | 'excel'
- `fromDate` (required): Start date in YYYY-MM-DD format
- `toDate` (required): End date in YYYY-MM-DD format

**Response:** Binary file (PDF or XLSX)

**Example Requests:**
```bash
# Export as PDF
GET /api/cash-book/export?format=pdf&fromDate=2026-06-01&toDate=2026-07-05

# Export as Excel
GET /api/cash-book/export?format=excel&fromDate=2026-06-01&toDate=2026-07-05
```

**File Naming:** `cash-book-report-{fromDate}-{toDate}.{extension}`

---

## Frontend Integration

### 1. Using the Hook

```typescript
import { useCashBookReportAPI } from '@services/cash-book/reportApiIntegration';

function CashBookScreen() {
  const {
    state,
    fetchKPIs,
    fetchCashFlow,
    fetchDiscrepancies,
    fetchUnmatchedItems,
    exportReport,
  } = useCashBookReportAPI();

  // Fetch KPIs
  const handleGenerateReport = async () => {
    await fetchKPIs('2026-06-01', '2026-07-05');
  };

  // Fetch cash flow with grouping
  const handleChangeGroupBy = async (groupBy) => {
    await fetchCashFlow(groupBy, '2026-06-01', '2026-07-05');
  };

  // Export report
  const handleExport = async (format) => {
    await exportReport(format, '2026-06-01', '2026-07-05');
  };

  return (
    <div>
      {state.isLoading && <p>Loading...</p>}
      {state.error && <p>Error: {state.error}</p>}
      {state.isOffline && <p>Offline - showing cached data</p>}
      
      {/* Display KPIs */}
      {state.kpis && (
        <div>
          <p>Matched: {state.kpis.matchedCount} / {state.kpis.totalEntries}</p>
          <p>Reconciliation %: {state.kpis.reconciliationPercentage.toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
}
```

### 2. Using Zustand Store

```typescript
import { useCashBookReportStore } from '@stores/cash-book/reportStore';

function CashBookScreen() {
  const {
    kpis,
    cashFlow,
    discrepancies,
    dateRange,
    activeTab,
    setDateRange,
    setActiveTab,
  } = useCashBookReportStore();

  // Update filters
  const handleDateChange = (from, to) => {
    setDateRange({ from, to });
  };

  // Switch tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return <div>{/* UI using store state */}</div>;
}
```

### 3. Component Integration

```typescript
import { CashBookReportScreen } from '@components/cash-book-reports/CashBookReportScreen';

function App() {
  return <CashBookReportScreen organizationId={1} />;
}
```

---

## Offline Mode

The report system includes automatic offline support with LocalStorage caching:

### Cache TTL (Time-To-Live)
- **KPIs**: 30 minutes
- **Cash Flow**: 60 minutes
- **Discrepancies**: 30 minutes
- **Unmatched Items**: 30 minutes

### How It Works
1. When online, API calls fetch fresh data from backend
2. Data is cached in LocalStorage automatically
3. When offline, cached data is returned
4. Offline banner displayed to user
5. Cache expires after TTL, requiring online refresh

### Cache Management

```typescript
import { CashBookReportOfflineStorage } from '@utils/cash-book-offline/reportOfflineStorage';

// Manual cache operations
CashBookReportOfflineStorage.kpis.save(kpisData);
const cachedKpis = CashBookReportOfflineStorage.kpis.get();
CashBookReportOfflineStorage.kpis.clear();

// Batch operations
CashBookReportOfflineStorage.batch.save(kpis, cashFlow, discrepancies, items);
const allData = CashBookReportOfflineStorage.batch.get();
CashBookReportOfflineStorage.batch.clearAll();

// Check cache availability
if (CashBookReportOfflineStorage.batch.isAvailable()) {
  console.log('Data cached and available for offline use');
}
```

---

## Examples

### Complete Workflow: Generate & Export Report

```typescript
import { useCashBookReportAPI } from '@services/cash-book/reportApiIntegration';
import { useCashBookReportStore } from '@stores/cash-book/reportStore';

function CashBookReportPage() {
  const { state, fetchKPIs, fetchCashFlow, fetchDiscrepancies, exportReport } = useCashBookReportAPI();
  const { setKPIs, setCashFlow, setDiscrepancies } = useCashBookReportStore();
  const [fromDate, setFromDate] = useState('2026-06-01');
  const [toDate, setToDate] = useState('2026-07-05');

  const handleGenerateReport = async () => {
    try {
      // Fetch all data in parallel
      await Promise.all([
        fetchKPIs(fromDate, toDate),
        fetchCashFlow('day', fromDate, toDate),
        fetchDiscrepancies(fromDate, toDate),
      ]);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportReport('pdf', fromDate, toDate);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  return (
    <div>
      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      
      <button onClick={handleGenerateReport} disabled={state.isLoading}>
        {state.isLoading ? 'Generating...' : 'Generate Report'}
      </button>
      
      <button onClick={handleExportPDF} disabled={!state.kpis}>
        Export as PDF
      </button>

      {state.isOffline && <p>⚠️ You are offline - showing cached data</p>}
      {state.error && <p style={{ color: 'red' }}>Error: {state.error}</p>}
    </div>
  );
}
```

### Handling Network Errors

```typescript
const handleGenerateReport = async () => {
  try {
    await fetchKPIs(fromDate, toDate);
  } catch (error) {
    if (!navigator.onLine) {
      // Show offline banner
      setError('You are offline. Showing cached data if available.');
    } else {
      // Show connection error
      setError('Failed to connect to server. Please try again.');
    }
  }
};
```

### Real-time Chart Update

```typescript
const [groupBy, setGroupBy] = useState('day');
const { fetchCashFlow } = useCashBookReportAPI();

const handleGroupByChange = async (newGroupBy) => {
  setGroupBy(newGroupBy);
  await fetchCashFlow(newGroupBy, fromDate, toDate);
};

return (
  <div>
    <button onClick={() => handleGroupByChange('day')}>Daily</button>
    <button onClick={() => handleGroupByChange('week')}>Weekly</button>
    <button onClick={() => handleGroupByChange('month')}>Monthly</button>
    
    <CashFlow data={state.cashFlow} groupBy={groupBy} />
  </div>
);
```

---

## Error Handling

### Common Error Responses

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "fromDate and toDate are required",
  "error": "Bad Request"
}
```

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**500 Internal Server Error**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

### Frontend Error Handling

```typescript
const { fetchKPIs } = useCashBookReportAPI();

try {
  await fetchKPIs('2026-06-01', '2026-07-05');
} catch (error) {
  if (error.message.includes('401')) {
    // Redirect to login
    navigate('/login');
  } else if (error.message.includes('400')) {
    // Show validation error
    setError(error.message);
  } else {
    // Show generic error with retry option
    setError('Failed to load report. Please try again.');
  }
}
```

---

## Performance Considerations

1. **Request Batching**: Load all report sections in parallel
   ```typescript
   await Promise.all([
     fetchKPIs(from, to),
     fetchCashFlow('day', from, to),
     fetchDiscrepancies(from, to),
   ]);
   ```

2. **Caching**: Data cached for 30-60 minutes, reducing API calls

3. **Pagination**: Implement for large discrepancy lists (future)

4. **Date Range Limits**: Keep queries to reasonable ranges (e.g., max 1 year)

---

## Testing Endpoints with cURL

```bash
# Get KPIs
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/cash-book/kpis?fromDate=2026-06-01&toDate=2026-07-05"

# Get Cash Flow
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/cash-book/cash-flow?groupBy=day&fromDate=2026-06-01&toDate=2026-07-05"

# Get Discrepancies
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/cash-book/discrepancies?fromDate=2026-06-01&toDate=2026-07-05"

# Export PDF
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/cash-book/export?format=pdf&fromDate=2026-06-01&toDate=2026-07-05" \
  -o report.pdf
```

---

## Deployment Checklist

- [ ] Environment variable `VITE_API_URL` set correctly in frontend
- [ ] Backend JWT guard configured and active
- [ ] Database indexes on cash_book_entries created
- [ ] Cache TTL values appropriate for your environment
- [ ] Export functionality tested with actual PDF/Excel generation libraries
- [ ] Offline mode tested with network throttling
- [ ] Error messages localized if needed
- [ ] API rate limiting configured (if applicable)

---

**Last Updated:** 2026-07-06  
**API Version:** 1.0.0  
**Status:** ✅ Production Ready
