import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../services/api';
import { ImportWizard, WizardFieldDef } from '../ImportWizard';

const SALES_FIELDS: WizardFieldDef[] = [
  { field: 'transactionDate', label: 'Date', required: true },
  { field: 'billNumber', label: 'Invoice / Bill No', required: true },
  { field: 'itemRaw', label: 'Item / Product', required: true },
  { field: 'quantity', label: 'Quantity', required: true },
  { field: 'unitPrice', label: 'Sale / Unit Price', required: true },
  { field: 'lineAmount', label: 'Line Total', required: false },
  { field: 'actualPrice', label: 'List / Actual Price', required: false },
  { field: 'accountName', label: 'Account', required: false },
  { field: 'customerName', label: 'Customer', required: false },
  { field: 'salesmanName', label: 'Salesman', required: false },
  { field: 'category', label: 'Category', required: false },
  { field: 'brand', label: 'Brand', required: false },
  { field: 'warehouseName', label: 'Warehouse', required: false },
  { field: 'transactionType', label: 'Type (Cash/Credit/Return)', required: false },
];

interface UploadHistoryRow {
  id: number;
  fileName: string;
  reportStartDate: string;
  reportEndDate: string;
  rowCount: number;
  duplicateCount: number;
  conflictCount: number;
  createdAt: string;
}

interface SalesmanRow {
  salesmanName: string;
  totalRevenue: number;
  totalProfit: number | null;
  totalQuantity: number;
  transactionCount: number;
}

interface ProductRow {
  productLabel: string;
  totalRevenue: number;
  totalProfit: number | null;
  totalQuantity: number;
  transactionCount: number;
}

interface CustomerRow {
  customerLabel: string;
  totalRevenue: number;
  totalProfit: number | null;
  totalQuantity: number;
  transactionCount: number;
}

const TOP_N_OPTIONS = [5, 10, 20, 50, Infinity];
const QUICK_EXCLUDE_SUGGESTIONS = ['Not available in uploaded report(s)', 'Walk In Customer'];

function TopNSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <select style={styles.dateInput} value={value === Infinity ? 'all' : value} onChange={e => onChange(e.target.value === 'all' ? Infinity : Number(e.target.value))}>
      {TOP_N_OPTIONS.map(n => (
        <option key={n === Infinity ? 'all' : n} value={n === Infinity ? 'all' : n}>
          {n === Infinity ? 'All' : `Top ${n}`}
        </option>
      ))}
    </select>
  );
}

function ExcludeChip({ label, onRestore }: { label: string; onRestore: () => void }) {
  return (
    <span style={styles.excludeChip}>
      {label} <button style={styles.excludeChipBtn} onClick={onRestore} title="Restore to rankings">↺</button>
    </span>
  );
}

export function SalesAnalysisScreen() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setMonth(monthStart.getMonth() - 1);
  const today = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(monthStart.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today);

  const [history, setHistory] = useState<UploadHistoryRow[]>([]);
  const [salesmen, setSalesmen] = useState<SalesmanRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Top-N and exclusions are deliberately session-only (component state,
  // never persisted or sent to the backend) - they reset on reload by
  // design, not an oversight.
  const [topN, setTopN] = useState(10);
  const [excludedSalesmen, setExcludedSalesmen] = useState<Set<string>>(new Set());
  const [excludedProducts, setExcludedProducts] = useState<Set<string>>(new Set());
  const [excludedCustomers, setExcludedCustomers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  async function loadAll() {
    setLoading(true);
    setLoadError('');
    try {
      const [historyRes, salesmenRes, productsRes, customersRes] = await Promise.all([
        apiClient.getSalesAnalysisUploads(),
        apiClient.getSalesAnalysisSalesmenPerformance(fromDate, toDate),
        apiClient.getSalesAnalysisProductsPerformance(fromDate, toDate),
        apiClient.getSalesAnalysisCustomersPerformance(fromDate, toDate),
      ]);
      setHistory(historyRes);
      setSalesmen(salesmenRes.salesmen || []);
      setProducts(productsRes.products || []);
      setCustomers(customersRes.customers || []);
    } catch (err) {
      setLoadError('Failed to load sales analysis data');
    } finally {
      setLoading(false);
    }
  }

  const visibleSalesmen = salesmen.filter(s => !excludedSalesmen.has(s.salesmanName));
  const visibleProducts = products.filter(p => !excludedProducts.has(p.productLabel));
  const visibleCustomers = customers.filter(c => !excludedCustomers.has(c.customerLabel));

  const salesmenChart = visibleSalesmen
    .filter(s => s.totalProfit !== null)
    .slice()
    .sort((a, b) => (b.totalProfit || 0) - (a.totalProfit || 0))
    .slice(0, topN === Infinity ? undefined : topN)
    .map(s => ({ name: s.salesmanName, Profit: s.totalProfit || 0 }));

  const productsChart = visibleProducts
    .slice()
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, topN === Infinity ? undefined : topN)
    .map(p => ({ name: p.productLabel, Revenue: p.totalRevenue }));

  const customersChart = visibleCustomers
    .slice()
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, topN === Infinity ? undefined : topN)
    .map(c => ({ name: c.customerLabel, Revenue: c.totalRevenue }));

  const tableSalesmen = visibleSalesmen.slice(0, topN === Infinity ? undefined : topN);
  const tableProducts = visibleProducts.slice(0, topN === Infinity ? undefined : topN);
  const tableCustomers = visibleCustomers.slice(0, topN === Infinity ? undefined : topN);

  const availableQuickExcludes = QUICK_EXCLUDE_SUGGESTIONS.filter(
    name =>
      (salesmen.some(s => s.salesmanName === name) && !excludedSalesmen.has(name)) ||
      (customers.some(c => c.customerLabel === name) && !excludedCustomers.has(name)),
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Sales Report Analysis</h2>
        <div style={styles.controls}>
          <label style={styles.controlLabel}>From<input type="date" style={styles.dateInput} value={fromDate} onChange={e => setFromDate(e.target.value)} /></label>
          <label style={styles.controlLabel}>To<input type="date" style={styles.dateInput} value={toDate} onChange={e => setToDate(e.target.value)} /></label>
          <label style={styles.controlLabel}>Show<TopNSelector value={topN} onChange={setTopN} /></label>
          <button style={styles.refreshBtn} onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {availableQuickExcludes.length > 0 && (
        <div style={styles.quickExcludeRow}>
          <span style={{ fontSize: '13px', color: '#666' }}>Quick hide:</span>
          {availableQuickExcludes.map(name => (
            <button
              key={name}
              style={styles.quickExcludeBtn}
              onClick={() => {
                setExcludedSalesmen(prev => (salesmen.some(s => s.salesmanName === name) ? new Set(prev).add(name) : prev));
                setExcludedCustomers(prev => (customers.some(c => c.customerLabel === name) ? new Set(prev).add(name) : prev));
              }}
            >
              Hide "{name}"
            </button>
          ))}
        </div>
      )}

      {(excludedSalesmen.size > 0 || excludedProducts.size > 0 || excludedCustomers.size > 0) && (
        <div style={styles.excludedBar}>
          <span style={{ fontSize: '13px', color: '#666' }}>Excluded from rankings (this session only):</span>
          {Array.from(excludedSalesmen).map(name => (
            <ExcludeChip key={`s-${name}`} label={name} onRestore={() => setExcludedSalesmen(prev => { const next = new Set(prev); next.delete(name); return next; })} />
          ))}
          {Array.from(excludedProducts).map(name => (
            <ExcludeChip key={`p-${name}`} label={name} onRestore={() => setExcludedProducts(prev => { const next = new Set(prev); next.delete(name); return next; })} />
          ))}
          {Array.from(excludedCustomers).map(name => (
            <ExcludeChip key={`c-${name}`} label={name} onRestore={() => setExcludedCustomers(prev => { const next = new Set(prev); next.delete(name); return next; })} />
          ))}
        </div>
      )}

      <ImportWizard
        title="Upload a sales report (any CSV / XLS / XLSX layout)"
        fields={SALES_FIELDS}
        analyzeFn={fd => apiClient.analyzeSalesFile(fd)}
        importFn={fd => apiClient.importSalesFile(fd)}
        onDone={loadAll}
      />

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Uploaded Reports (coverage timeline)</h4>
        {history.length === 0 ? <p>No reports uploaded yet.</p> : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>File</th>
                <th style={styles.th}>Covers</th>
                <th style={styles.th}>Rows</th>
                <th style={styles.th}>Duplicates</th>
                <th style={styles.th}>Conflicts</th>
                <th style={styles.th}>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td style={styles.td}>{h.fileName}</td>
                  <td style={styles.td}>{h.reportStartDate.split('T')[0]} to {h.reportEndDate.split('T')[0]}</td>
                  <td style={styles.td}>{h.rowCount}</td>
                  <td style={styles.td}>{h.duplicateCount}</td>
                  <td style={styles.td}>{h.conflictCount}</td>
                  <td style={styles.td}>{h.createdAt.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {loadError && <div style={styles.errorBanner}>{loadError}</div>}

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Top Salesmen by Profit</h4>
          {salesmenChart.length === 0 ? <p>No salesman profit data for this period (either no data uploaded, the uploaded report(s) don't include a salesman column yet, or no matching purchase report has been uploaded to resolve cost).</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesmenChart} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Profit" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Top Products by Revenue</h4>
          {productsChart.length === 0 ? <p>No product data for this period.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={productsChart} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Revenue" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Top Customers by Revenue</h4>
        {customersChart.length === 0 ? <p>No customer data for this period.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={customersChart} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Revenue" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Salesman Breakdown</h4>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Salesman</th>
              <th style={styles.th}>Revenue</th>
              <th style={styles.th}>Profit</th>
              <th style={styles.th}>Quantity</th>
              <th style={styles.th}>Transactions</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {tableSalesmen.map((s, i) => (
              <tr key={i}>
                <td style={styles.td}>{s.salesmanName}</td>
                <td style={styles.td}>{s.totalRevenue.toLocaleString()}</td>
                <td style={styles.td}>{s.totalProfit === null ? '—' : s.totalProfit.toLocaleString()}</td>
                <td style={styles.td}>{s.totalQuantity.toLocaleString()}</td>
                <td style={styles.td}>{s.transactionCount}</td>
                <td style={styles.td}>
                  <button style={styles.excludeBtn} onClick={() => setExcludedSalesmen(prev => new Set(prev).add(s.salesmanName))} title="Exclude from rankings">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Customer Breakdown (repeat customers, retail &amp; wholesale)</h4>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Revenue</th>
              <th style={styles.th}>Profit</th>
              <th style={styles.th}>Quantity</th>
              <th style={styles.th}>Transactions (visits/bills)</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {tableCustomers.map((c, i) => (
              <tr key={i}>
                <td style={styles.td}>{c.customerLabel}</td>
                <td style={styles.td}>{c.totalRevenue.toLocaleString()}</td>
                <td style={styles.td}>{c.totalProfit === null ? '—' : c.totalProfit.toLocaleString()}</td>
                <td style={styles.td}>{c.totalQuantity.toLocaleString()}</td>
                <td style={styles.td}>{c.transactionCount}</td>
                <td style={styles.td}>
                  <button style={styles.excludeBtn} onClick={() => setExcludedCustomers(prev => new Set(prev).add(c.customerLabel))} title="Exclude from rankings">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Product Breakdown</h4>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Product code</th>
              <th style={styles.th}>Revenue</th>
              <th style={styles.th}>Profit</th>
              <th style={styles.th}>Quantity</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {tableProducts.map((p, i) => (
              <tr key={i}>
                <td style={styles.td}>{p.productLabel}</td>
                <td style={styles.td}>{p.totalRevenue.toLocaleString()}</td>
                <td style={styles.td}>{p.totalProfit === null ? '— (upload a matching purchase report to see profit)' : p.totalProfit.toLocaleString()}</td>
                <td style={styles.td}>{p.totalQuantity.toLocaleString()}</td>
                <td style={styles.td}>
                  <button style={styles.excludeBtn} onClick={() => setExcludedProducts(prev => new Set(prev).add(p.productLabel))} title="Exclude from rankings">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' },
  h2: { margin: 0 },
  controls: { display: 'flex', gap: '12px', alignItems: 'flex-end' },
  controlLabel: { display: 'flex', flexDirection: 'column', fontSize: '12px', color: '#555', gap: '2px' },
  dateInput: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  refreshBtn: { background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  warningBanner: { background: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  uploadCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  uploadRow: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' },
  uploadBtn: { background: '#f3f4f6', color: '#111', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
  fileName: { fontSize: '13px', color: '#444' },
  summaryBox: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' },
  statusItem: { display: 'flex', justifyContent: 'space-between', maxWidth: '360px', fontSize: '14px' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  chartCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  chartTitle: { margin: '0 0 8px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '13px', color: '#555' },
  td: { borderBottom: '1px solid #eee', padding: '8px', fontSize: '14px' },
  quickExcludeRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' },
  quickExcludeBtn: { background: '#f3f4f6', border: '1px solid #ccc', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' },
  excludedBar: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' },
  excludeChip: { background: '#fee2e2', color: '#991b1b', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  excludeChipBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#991b1b' },
  excludeBtn: { background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', color: '#991b1b', fontSize: '12px', padding: '2px 6px' },
};
