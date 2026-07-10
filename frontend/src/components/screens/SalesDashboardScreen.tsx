import React, { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../services/api';

interface SalesReport {
  totalSales: number;
  numberOfBills: number;
  numberOfCustomers: number;
  averageBillValue: number;
  topCustomers: { customerId: number; customerName: string; totalSales: number }[];
}

interface BillStatusBreakdown {
  totalBills: number;
  byStatus: { status: string; count: number; amount: number }[];
}

interface SalesOrderStatusBreakdown {
  totalOrders: number;
  byStatus: { status: string; count: number }[];
}

interface GatePassAnalytics {
  summary: { totalGatePasses: number; confirmed: number; pending: number; rejected: number; fulfillmentRate: number };
}

const BILL_STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: '#f59e0b',
  APPROVED: '#2563eb',
  FULFILLED: '#16a34a',
  REJECTED: '#dc2626',
  CANCELLED: '#94a3b8',
};

const SO_STATUS_ORDER = ['DRAFT', 'CONFIRMED', 'CONVERTED', 'CANCELLED'];
const SO_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  CONFIRMED: '#f59e0b',
  CONVERTED: '#16a34a',
  CANCELLED: '#dc2626',
};

export function SalesDashboardScreen() {
  const [days, setDays] = useState(30);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [billStatus, setBillStatus] = useState<BillStatusBreakdown | null>(null);
  const [soStatus, setSoStatus] = useState<SalesOrderStatusBreakdown | null>(null);
  const [gatePass, setGatePass] = useState<GatePassAnalytics | null>(null);
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
      const [salesR, billR, soR, gpR] = await Promise.allSettled([
        apiClient.getSalesReport(startDate.toISOString().split('T')[0], new Date().toISOString().split('T')[0]),
        apiClient.getBillStatusBreakdown(days),
        apiClient.getSalesOrderStatusBreakdown(),
        apiClient.getGatePassAnalytics(days),
      ]);

      if (salesR.status === 'fulfilled') setSalesReport(salesR.value);
      if (billR.status === 'fulfilled') setBillStatus(billR.value);
      if (soR.status === 'fulfilled') setSoStatus(soR.value);
      if (gpR.status === 'fulfilled') setGatePass(gpR.value);
    } catch (err) {
      setError('Failed to load sales dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const billStatusChartData = (billStatus?.byStatus || []).map(s => ({ name: s.status, value: s.amount }));
  const soFunnelData = SO_STATUS_ORDER.map(status => ({
    status,
    count: soStatus?.byStatus.find(s => s.status === status)?.count || 0,
  }));
  const topCustomersData = (salesReport?.topCustomers || []).map(c => ({ name: c.customerName, Sales: c.totalSales }));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Sales Dashboard</h2>
        <div style={styles.controls}>
          <select style={styles.select} value={days} onChange={e => setDays(parseInt(e.target.value, 10))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button style={styles.refreshBtn} onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.kpiGrid}>
        <KPICard label="Total Sales" value={salesReport?.totalSales} />
        <KPICard label="Total Bills" value={salesReport?.numberOfBills} isCount />
        <KPICard label="Total Sales Orders" value={soStatus?.totalOrders} isCount />
        <KPICard label="Avg Bill Value" value={salesReport?.averageBillValue} />
        <KPICard label="Gate Pass Fulfillment" value={gatePass?.summary.fulfillmentRate} isPercent />
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Bill Status Breakdown</h4>
          {billStatusChartData.length === 0 ? <p>No bills in this period.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={billStatusChartData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {billStatusChartData.map(entry => (
                    <Cell key={entry.name} fill={BILL_STATUS_COLORS[entry.name] || '#999'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Sales Order Funnel</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={soFunnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count">
                {soFunnelData.map(entry => (
                  <Cell key={entry.status} fill={SO_STATUS_COLORS[entry.status] || '#999'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Top Customers (last {days} days)</h4>
        {topCustomersData.length === 0 ? <p>No customer sales in this period.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topCustomersData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Sales" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, isCount, isPercent }: { label: string; value?: number; isCount?: boolean; isPercent?: boolean }) {
  const display = value === undefined || value === null
    ? '—'
    : isPercent
      ? `${value.toFixed(1)}%`
      : value.toLocaleString(undefined, { maximumFractionDigits: isCount ? 0 : 2 });
  return (
    <div style={styles.kpiCard}>
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
  kpiLabel: { fontSize: '12px', color: '#666', marginBottom: '4px' },
  kpiValue: { fontSize: '20px', fontWeight: 700 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  chartCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  chartTitle: { margin: '0 0 8px 0' },
};
