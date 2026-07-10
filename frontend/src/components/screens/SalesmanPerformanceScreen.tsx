import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../services/api';

interface SalesmanPerformance {
  salesmanId: number;
  salesmanName: string;
  totalSales: number;
  billCount: number;
  avgBillAmount: number;
}

interface SalesmanPerformanceReport {
  totalSales: number;
  totalBills: number;
  bySalesman: SalesmanPerformance[];
}

interface CommissionBySalesperson {
  salesPersonId: number;
  name: string;
  totalSales: number;
  totalCommission: number;
  commissionCount: number;
}

interface CommissionSummary {
  totalSales: number;
  totalCommission: number;
  averageCommissionPerSalesperson: number;
  bySalesperson: CommissionBySalesperson[];
}

interface CombinedRow {
  id: number;
  name: string;
  sales: number;
  bills: number;
  avgBill: number;
  commission: number;
  commissionCount: number;
}

export function SalesmanPerformanceScreen() {
  const monthStart = new Date();
  monthStart.setDate(1);
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(monthStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today);

  const [performance, setPerformance] = useState<SalesmanPerformanceReport | null>(null);
  const [commission, setCommission] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commissionUnavailable, setCommissionUnavailable] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    setCommissionUnavailable(false);
    try {
      const [perfResult, commResult] = await Promise.allSettled([
        apiClient.getSalesmanPerformanceReport(startDate, endDate),
        apiClient.getCommissionPeriodSummary(startDate, endDate),
      ]);

      if (perfResult.status === 'fulfilled') setPerformance(perfResult.value);
      else setError('Failed to load sales performance data');

      if (commResult.status === 'fulfilled') setCommission(commResult.value);
      else setCommissionUnavailable(true);
    } finally {
      setLoading(false);
    }
  }

  const salesChartData = (performance?.bySalesman || [])
    .slice()
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 10)
    .map(s => ({ name: s.salesmanName, Sales: s.totalSales }));

  const commissionChartData = (commission?.bySalesperson || [])
    .slice()
    .sort((a, b) => b.totalCommission - a.totalCommission)
    .slice(0, 10)
    .map(c => ({ name: c.name, Commission: c.totalCommission }));

  const combinedRows: CombinedRow[] = (() => {
    const map = new Map<number, CombinedRow>();
    (performance?.bySalesman || []).forEach(s => {
      map.set(s.salesmanId, {
        id: s.salesmanId,
        name: s.salesmanName,
        sales: s.totalSales,
        bills: s.billCount,
        avgBill: s.avgBillAmount,
        commission: 0,
        commissionCount: 0,
      });
    });
    (commission?.bySalesperson || []).forEach(c => {
      const existing = map.get(c.salesPersonId);
      if (existing) {
        existing.commission = c.totalCommission;
        existing.commissionCount = c.commissionCount;
      } else {
        map.set(c.salesPersonId, {
          id: c.salesPersonId,
          name: c.name,
          sales: c.totalSales,
          bills: 0,
          avgBill: 0,
          commission: c.totalCommission,
          commissionCount: c.commissionCount,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  })();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Salesman Performance &amp; Commission</h2>
        <div style={styles.controls}>
          <label style={styles.controlLabel}>From<input type="date" style={styles.dateInput} value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label style={styles.controlLabel}>To<input type="date" style={styles.dateInput} value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
          <button style={styles.refreshBtn} onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {commissionUnavailable && (
        <div style={styles.warningBanner}>
          Commission data not available for this period - run a commission calculation for it first (Sales Commission screen) to see commission figures alongside sales.
        </div>
      )}

      <div style={styles.kpiGrid}>
        <KPICard label="Total Sales" value={performance?.totalSales} />
        <KPICard label="Total Bills" value={performance?.totalBills} isCount />
        <KPICard label="Active Salesmen" value={performance?.bySalesman.length} isCount />
        <KPICard label="Total Commission" value={commission?.totalCommission} />
        <KPICard label="Avg Commission / Salesman" value={commission?.averageCommissionPerSalesperson} />
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Sales by Salesman</h4>
          {salesChartData.length === 0 ? <p>No sales in this period.</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesChartData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Sales" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Commission by Salesman</h4>
          {commissionChartData.length === 0 ? <p>No commission data in this period.</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={commissionChartData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Commission" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Per-Salesman Breakdown</h4>
        {combinedRows.length === 0 ? <p>No data for this period.</p> : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Salesman</th>
                <th style={styles.th}>Sales</th>
                <th style={styles.th}>Bills</th>
                <th style={styles.th}>Avg Bill</th>
                <th style={styles.th}>Commission</th>
                <th style={styles.th}>Commission Count</th>
              </tr>
            </thead>
            <tbody>
              {combinedRows.map(row => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.name}</td>
                  <td style={styles.td}>{row.sales.toLocaleString()}</td>
                  <td style={styles.td}>{row.bills}</td>
                  <td style={styles.td}>{row.avgBill.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={styles.td}>{row.commission.toLocaleString()}</td>
                  <td style={styles.td}>{row.commissionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, isCount }: { label: string; value?: number; isCount?: boolean }) {
  const display = value === undefined || value === null ? '—' : isCount ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 0 });
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
  controlLabel: { display: 'flex', flexDirection: 'column', fontSize: '12px', color: '#555', gap: '2px' },
  dateInput: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  refreshBtn: { background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  warningBanner: { background: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' },
  kpiCard: { background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '14px' },
  kpiLabel: { fontSize: '12px', color: '#666', marginBottom: '4px' },
  kpiValue: { fontSize: '20px', fontWeight: 700 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  chartCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  chartTitle: { margin: '0 0 8px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '13px', color: '#555' },
  td: { borderBottom: '1px solid #eee', padding: '8px', fontSize: '14px' },
};
