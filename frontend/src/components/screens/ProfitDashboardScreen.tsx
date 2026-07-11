import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../services/api';

interface RankedRow {
  label: string;
  totalRevenue: number;
  totalProfit: number | null;
  totalQuantity: number;
  transactionCount: number;
}

// Profit Dashboard is deliberately a thin re-framing of the same
// sales-analysis performance endpoints (already profit-aware via the
// shared cost-resolution query) - not a separate data pipeline. It only
// ever shows entries where a real purchase-matched profit exists.
export function ProfitDashboardScreen() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setMonth(monthStart.getMonth() - 1);
  const today = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(monthStart.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today);
  const [salesmen, setSalesmen] = useState<RankedRow[]>([]);
  const [products, setProducts] = useState<RankedRow[]>([]);
  const [customers, setCustomers] = useState<RankedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchCoverage, setMatchCoverage] = useState<{ hasAny: boolean }>({ hasAny: false });

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [salesmenRes, productsRes, customersRes] = await Promise.all([
        apiClient.getSalesAnalysisSalesmenPerformance(fromDate, toDate),
        apiClient.getSalesAnalysisProductsPerformance(fromDate, toDate),
        apiClient.getSalesAnalysisCustomersPerformance(fromDate, toDate),
      ]);

      const salesmenRows: RankedRow[] = (salesmenRes.salesmen || []).map((s: any) => ({
        label: s.salesmanName, totalRevenue: s.totalRevenue, totalProfit: s.totalProfit, totalQuantity: s.totalQuantity, transactionCount: s.transactionCount,
      }));
      const productRows: RankedRow[] = (productsRes.products || []).map((p: any) => ({
        label: p.productLabel, totalRevenue: p.totalRevenue, totalProfit: p.totalProfit, totalQuantity: p.totalQuantity, transactionCount: p.transactionCount,
      }));
      const customerRows: RankedRow[] = (customersRes.customers || []).map((c: any) => ({
        label: c.customerLabel, totalRevenue: c.totalRevenue, totalProfit: c.totalProfit, totalQuantity: c.totalQuantity, transactionCount: c.transactionCount,
      }));

      setSalesmen(salesmenRows.filter(r => r.totalProfit !== null).sort((a, b) => (b.totalProfit || 0) - (a.totalProfit || 0)));
      setProducts(productRows.filter(r => r.totalProfit !== null).sort((a, b) => (b.totalProfit || 0) - (a.totalProfit || 0)));
      setCustomers(customerRows.filter(r => r.totalProfit !== null).sort((a, b) => (b.totalProfit || 0) - (a.totalProfit || 0)));
      setMatchCoverage({
        hasAny: salesmenRows.some(r => r.totalProfit !== null) || productRows.some(r => r.totalProfit !== null) || customerRows.some(r => r.totalProfit !== null),
      });
    } catch (err) {
      setError('Failed to load profit dashboard data');
    } finally {
      setLoading(false);
    }
  }

  function chartData(rows: RankedRow[]) {
    return rows.slice(0, 10).map(r => ({ name: r.label, Profit: r.totalProfit || 0 }));
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Profit Dashboard</h2>
        <div style={styles.controls}>
          <label style={styles.controlLabel}>From<input type="date" style={styles.dateInput} value={fromDate} onChange={e => setFromDate(e.target.value)} /></label>
          <label style={styles.controlLabel}>To<input type="date" style={styles.dateInput} value={toDate} onChange={e => setToDate(e.target.value)} /></label>
          <button style={styles.refreshBtn} onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {!loading && !matchCoverage.hasAny && (
        <div style={styles.warningBanner}>
          No profit figures yet for this period - profit only appears once a Purchase Analysis report has been uploaded that shares matching product codes with the Sales Analysis data. Revenue-only views are still available on the Sales Report Analysis screen.
        </div>
      )}

      <div style={styles.chartsRow}>
        <ProfitSection title="Most Profitable Salesmen" rows={salesmen} chartData={chartData(salesmen)} color="#16a34a" />
        <ProfitSection title="Most Profitable Products" rows={products} chartData={chartData(products)} color="#2563eb" />
      </div>
      <ProfitSection title="Most Profitable Customers" rows={customers} chartData={chartData(customers)} color="#f59e0b" wide />
    </div>
  );
}

function ProfitSection({ title, rows, chartData, color, wide }: { title: string; rows: RankedRow[]; chartData: { name: string; Profit: number }[]; color: string; wide?: boolean }) {
  return (
    <div style={{ ...styles.chartCard, ...(wide ? { gridColumn: '1 / -1' } : {}) }}>
      <h4 style={styles.chartTitle}>{title}</h4>
      {chartData.length === 0 ? <p>No profit data for this period.</p> : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Profit" fill={color} />
            </BarChart>
          </ResponsiveContainer>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Revenue</th>
                <th style={styles.th}>Profit</th>
                <th style={styles.th}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r, i) => (
                <tr key={i}>
                  <td style={styles.td}>{r.label}</td>
                  <td style={styles.td}>{r.totalRevenue.toLocaleString()}</td>
                  <td style={styles.td}>{(r.totalProfit || 0).toLocaleString()}</td>
                  <td style={styles.td}>{r.totalRevenue > 0 ? `${(((r.totalProfit || 0) / r.totalRevenue) * 100).toFixed(1)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
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
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  chartCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  chartTitle: { margin: '0 0 8px 0' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '13px', color: '#555' },
  td: { borderBottom: '1px solid #eee', padding: '8px', fontSize: '14px' },
};
