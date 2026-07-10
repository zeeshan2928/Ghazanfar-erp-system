import React, { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../services/api';

interface VendorReport {
  totalPurchases: number;
  numberOfPOs: number;
  numberOfVendors: number;
  averagePOValue: number;
  vendorPerformance: { vendorId: number; vendorName: string; totalOrders: number; completedOrders: number; totalAmount: number }[];
}

interface POStatusBreakdown {
  totalPOs: number;
  byStatus: { status: string; count: number; amount: number }[];
}

interface AgingBucket { bucket: string; count: number; totalAmount: number }
interface CombinedAgingReport {
  apSummaries: { buckets: AgingBucket[]; totalOutstanding: number }[];
  totalApOutstanding: number;
}

const PO_STATUS_ORDER = ['DRAFT', 'SENT', 'PARTIAL_RECEIVED', 'RECEIVED', 'REJECTED', 'CANCELLED'];
const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  SENT: '#f59e0b',
  PARTIAL_RECEIVED: '#a855f7',
  RECEIVED: '#16a34a',
  REJECTED: '#dc2626',
  CANCELLED: '#64748b',
};
const AGING_BUCKET_ORDER = ['0-10', '10-20', '20-30', '30+'];

export function PurchasingDashboardScreen() {
  const [days, setDays] = useState(90);
  const [vendorReport, setVendorReport] = useState<VendorReport | null>(null);
  const [poStatus, setPoStatus] = useState<POStatusBreakdown | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [aging, setAging] = useState<CombinedAgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const [vendorR, poR, lowStockR, agingR] = await Promise.allSettled([
        apiClient.getVendorReport(startDate.toISOString().split('T')[0], new Date().toISOString().split('T')[0]),
        apiClient.getPurchaseOrderStatusBreakdown(days),
        apiClient.getLowStockAlerts(),
        apiClient.getCombinedAgingReport(),
      ]);

      if (vendorR.status === 'fulfilled') setVendorReport(vendorR.value);
      if (poR.status === 'fulfilled') setPoStatus(poR.value);
      if (lowStockR.status === 'fulfilled') setLowStockCount(lowStockR.value.totalAlerts ?? lowStockR.value.alerts?.length ?? 0);
      if (agingR.status === 'fulfilled') setAging(agingR.value);
    } catch (err) {
      setError('Failed to load purchasing dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const poStatusChartData = PO_STATUS_ORDER
    .map(status => {
      const found = poStatus?.byStatus.find(s => s.status === status);
      return { status, count: found?.count || 0, amount: found?.amount || 0 };
    })
    .filter(s => s.count > 0);

  const topVendorsData = (vendorReport?.vendorPerformance || []).slice(0, 10).map(v => ({ name: v.vendorName, Spend: v.totalAmount }));

  const apAgingChartData = (() => {
    const totals: Record<string, number> = { '0-10': 0, '10-20': 0, '20-30': 0, '30+': 0 };
    (aging?.apSummaries || []).forEach(s => s.buckets.forEach(b => { totals[b.bucket] = (totals[b.bucket] || 0) + b.totalAmount; }));
    return AGING_BUCKET_ORDER.map(bucket => ({ bucket, amount: totals[bucket] || 0 }));
  })();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Purchasing Dashboard</h2>
        <div style={styles.controls}>
          <select style={styles.select} value={days} onChange={e => setDays(parseInt(e.target.value, 10))}>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 12 months</option>
          </select>
          <button style={styles.refreshBtn} onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.kpiGrid}>
        <KPICard label="Total PO Value" value={vendorReport?.totalPurchases} />
        <KPICard label="Active Vendors" value={vendorReport?.numberOfVendors} isCount />
        <KPICard label="Low Stock Needing PO" value={lowStockCount ?? undefined} isCount highlight={!!lowStockCount} />
        <KPICard label="AP Outstanding" value={aging?.totalApOutstanding} />
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Purchase Order Status</h4>
          {poStatusChartData.length === 0 ? <p>No POs in this period.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={poStatusChartData} dataKey="amount" nameKey="status" outerRadius={90} label>
                  {poStatusChartData.map(entry => (
                    <Cell key={entry.status} fill={PO_STATUS_COLORS[entry.status] || '#999'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>AP Aging</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={apAgingChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Top Vendors by Spend</h4>
        {topVendorsData.length === 0 ? <p>No vendor spend in this period.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topVendorsData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Spend" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, isCount, highlight }: { label: string; value?: number; isCount?: boolean; highlight?: boolean }) {
  const display = value === undefined || value === null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: isCount ? 0 : 2 });
  return (
    <div style={{ ...styles.kpiCard, ...(highlight ? styles.kpiCardWarning : {}) }}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{display}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' },
  h2: { margin: 0 },
  controls: { display: 'flex', gap: '12px', alignItems: 'flex-end' },
  select: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  refreshBtn: { background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' },
  kpiCard: { background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '14px' },
  kpiCardWarning: { borderLeft: '4px solid #f59e0b' },
  kpiLabel: { fontSize: '12px', color: '#666', marginBottom: '4px' },
  kpiValue: { fontSize: '20px', fontWeight: 700 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  chartCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  chartTitle: { margin: '0 0 8px 0' },
};
