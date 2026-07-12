import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../services/api';
import { ImportWizard, WizardFieldDef } from '../ImportWizard';

const PURCHASE_FIELDS: WizardFieldDef[] = [
  { field: 'transactionDate', label: 'Date', required: true },
  { field: 'billNumber', label: 'Batch / Stock / PO No', required: true },
  { field: 'itemRaw', label: 'Item / Product', required: true },
  { field: 'quantity', label: 'Quantity', required: true },
  { field: 'unitPrice', label: 'Purchase / Unit Price', required: true },
  { field: 'lineAmount', label: 'Line Total', required: false },
  { field: 'vendorName', label: 'Vendor / Account', required: false },
  { field: 'warehouseName', label: 'Warehouse', required: false },
  { field: 'category', label: 'Category', required: false },
  { field: 'brand', label: 'Brand', required: false },
  { field: 'transactionType', label: 'Type', required: false },
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

interface VendorRow {
  vendorName: string;
  totalSpend: number;
  totalQuantity: number;
  transactionCount: number;
}

interface ProductRow {
  productLabel: string;
  totalSpend: number;
  totalQuantity: number;
  transactionCount: number;
  avgPrice: number | null;
}

const TOP_N_OPTIONS = [5, 10, 20, 50, Infinity];

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

export function PurchaseAnalysisScreen() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setMonth(monthStart.getMonth() - 1);
  const today = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(monthStart.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today);

  const [history, setHistory] = useState<UploadHistoryRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [topN, setTopN] = useState(10);
  const [excludedVendors, setExcludedVendors] = useState<Set<string>>(new Set());
  const [excludedProducts, setExcludedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  async function loadAll() {
    setLoading(true);
    setLoadError('');
    try {
      const [historyRes, vendorsRes, productsRes] = await Promise.all([
        apiClient.getPurchaseAnalysisUploads(),
        apiClient.getPurchaseAnalysisVendorsPerformance(fromDate, toDate),
        apiClient.getPurchaseAnalysisProductsPerformance(fromDate, toDate),
      ]);
      setHistory(historyRes);
      setVendors(vendorsRes.vendors || []);
      setProducts(productsRes.products || []);
    } catch (err) {
      setLoadError('Failed to load purchase analysis data');
    } finally {
      setLoading(false);
    }
  }

  const visibleVendors = vendors.filter(v => !excludedVendors.has(v.vendorName));
  const visibleProducts = products.filter(p => !excludedProducts.has(p.productLabel));

  const vendorsChart = visibleVendors.slice(0, topN === Infinity ? undefined : topN).map(v => ({ name: v.vendorName, Spend: v.totalSpend }));
  const productsChart = visibleProducts.slice(0, topN === Infinity ? undefined : topN).map(p => ({ name: p.productLabel, Spend: p.totalSpend }));

  const tableVendors = visibleVendors.slice(0, topN === Infinity ? undefined : topN);
  const tableProducts = visibleProducts.slice(0, topN === Infinity ? undefined : topN);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Purchase Report Analysis</h2>
        <div style={styles.controls}>
          <label style={styles.controlLabel}>From<input type="date" style={styles.dateInput} value={fromDate} onChange={e => setFromDate(e.target.value)} /></label>
          <label style={styles.controlLabel}>To<input type="date" style={styles.dateInput} value={toDate} onChange={e => setToDate(e.target.value)} /></label>
          <label style={styles.controlLabel}>Show<TopNSelector value={topN} onChange={setTopN} /></label>
          <button style={styles.refreshBtn} onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      <ImportWizard
        title="Upload a purchase/vendor report (any CSV / XLS / XLSX layout)"
        fields={PURCHASE_FIELDS}
        analyzeFn={fd => apiClient.analyzePurchaseFile(fd)}
        importFn={fd => apiClient.importPurchaseFile(fd)}
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
          <h4 style={styles.chartTitle}>Top Vendors by Spend</h4>
          {vendorsChart.length === 0 ? <p>No vendor data for this period.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={vendorsChart} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Spend" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Top Products by Purchase Spend</h4>
          {productsChart.length === 0 ? <p>No product data for this period.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={productsChart} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Spend" fill="#0891b2" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Vendor Breakdown</h4>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Vendor</th>
              <th style={styles.th}>Total Spend</th>
              <th style={styles.th}>Quantity</th>
              <th style={styles.th}>Transactions</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {tableVendors.map((v, i) => (
              <tr key={i}>
                <td style={styles.td}>{v.vendorName}</td>
                <td style={styles.td}>{v.totalSpend.toLocaleString()}</td>
                <td style={styles.td}>{v.totalQuantity.toLocaleString()}</td>
                <td style={styles.td}>{v.transactionCount}</td>
                <td style={styles.td}>
                  <button style={styles.excludeBtn} onClick={() => setExcludedVendors(prev => new Set(prev).add(v.vendorName))} title="Exclude from rankings">✕</button>
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
              <th style={styles.th}>Total Spend</th>
              <th style={styles.th}>Quantity</th>
              <th style={styles.th}>Avg Price</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {tableProducts.map((p, i) => (
              <tr key={i}>
                <td style={styles.td}>{p.productLabel}</td>
                <td style={styles.td}>{p.totalSpend.toLocaleString()}</td>
                <td style={styles.td}>{p.totalQuantity.toLocaleString()}</td>
                <td style={styles.td}>{p.avgPrice === null ? '—' : p.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
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
  excludeBtn: { background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', color: '#991b1b', fontSize: '12px', padding: '2px 6px' },
};
