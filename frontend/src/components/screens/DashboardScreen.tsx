import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { apiClient } from '../../services/api';

interface DailyTrendPoint {
  date: string;
  sales: number;
  billCount: number;
  avgBillValue: number;
}

interface YearlyComparisonRow {
  month: string;
  [year: string]: number | string;
}

interface CashCollectionMethod { method: string; amount: number }
interface CashCollection {
  totalCollected: number;
  billCount: number;
  byMethod: CashCollectionMethod[];
}

interface ExpenseByCategory { category: string; amount: number }
interface ExpenseByAccount { accountName: string; accountCode: string; amount: number }
interface ExpenseBreakdown {
  totalExpense: number;
  byCategory: ExpenseByCategory[];
  byAccount: ExpenseByAccount[];
}

interface ExpenseTrendPoint { month: string; amount: number }

const YEAR_COLORS = ['#94a3b8', '#2563eb', '#16a34a'];
const CASH_METHOD_COLORS: Record<string, string> = {
  CASH: '#16a34a',
  CHEQUE: '#f59e0b',
  BANK_TRANSFER: '#2563eb',
  MOBILE_MONEY: '#a855f7',
  UNSPECIFIED: '#94a3b8',
};
const EXPENSE_CATEGORY_COLORS = ['#dc2626', '#f59e0b', '#2563eb', '#a855f7', '#16a34a', '#94a3b8'];

export function DashboardScreen() {
  const [dailyTrend, setDailyTrend] = useState<DailyTrendPoint[]>([]);
  const [yearlyComparison, setYearlyComparison] = useState<{ years: number[]; rows: YearlyComparisonRow[] }>({ years: [], rows: [] });
  const [cashCollection, setCashCollection] = useState<CashCollection | null>(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown | null>(null);
  const [expenseTrend, setExpenseTrend] = useState<ExpenseTrendPoint[]>([]);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [trendR, yearlyR, cashR, expenseR, expenseTrendR, lowStockR] = await Promise.allSettled([
        apiClient.getDailySalesTrend(30),
        apiClient.getYearlyMonthlyComparison(3),
        apiClient.getTodayCashCollection(),
        apiClient.getExpenseBreakdown(),
        apiClient.getExpenseTrend(6),
        apiClient.getLowStockAlerts(),
      ]);

      if (trendR.status === 'fulfilled') setDailyTrend(trendR.value.dailyTrend || []);
      if (yearlyR.status === 'fulfilled') setYearlyComparison(yearlyR.value);
      if (cashR.status === 'fulfilled') setCashCollection(cashR.value);
      if (expenseR.status === 'fulfilled') setExpenseBreakdown(expenseR.value);
      if (expenseTrendR.status === 'fulfilled') setExpenseTrend(expenseTrendR.value.months || []);
      if (lowStockR.status === 'fulfilled') setLowStockCount(lowStockR.value.totalAlerts ?? lowStockR.value.alerts?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }

  const todayPoint = dailyTrend[dailyTrend.length - 1];
  const yesterdayPoint = dailyTrend[dailyTrend.length - 2];
  const todaySales = todayPoint?.sales || 0;
  const yesterdaySales = yesterdayPoint?.sales || 0;
  const trendPercent = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : (todaySales > 0 ? 100 : 0);
  const trendUp = trendPercent >= 0;

  const monthSales = dailyTrend.reduce((sum, d) => sum + d.sales, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Business Overview</h1>
          <p style={styles.subtitle}>Live snapshot of today's business</p>
        </div>
        <button style={styles.refreshBtn} onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : '🔄 Refresh'}</button>
      </div>

      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Today's Sales</div>
          <div style={styles.kpiValue}>{todaySales.toLocaleString()}</div>
          <div style={{ ...styles.kpiTrend, color: trendUp ? '#16a34a' : '#dc2626' }}>
            {trendUp ? '▲' : '▼'} {Math.abs(trendPercent).toFixed(1)}% vs yesterday
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Last 30 Days Sales</div>
          <div style={styles.kpiValue}>{monthSales.toLocaleString()}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Cash Collected Today</div>
          <div style={styles.kpiValue}>{(cashCollection?.totalCollected || 0).toLocaleString()}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Expense This Month</div>
          <div style={styles.kpiValue}>{(expenseTrend[expenseTrend.length - 1]?.amount || 0).toLocaleString()}</div>
        </div>
        <div style={{ ...styles.kpiCard, ...(lowStockCount ? styles.kpiCardWarning : {}) }}>
          <div style={styles.kpiLabel}>Low Stock Alerts</div>
          <div style={styles.kpiValue}>{lowStockCount ?? '—'}</div>
        </div>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Day-to-Day Sales (last 30 days)</h4>
        {dailyTrend.length === 0 ? <p>No sales recorded yet.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>12-Month Comparison ({yearlyComparison.years.join(' vs ')})</h4>
        {yearlyComparison.rows.length === 0 ? <p>No historical data yet.</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyComparison.rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yearlyComparison.years.map((year, i) => (
                <Bar key={year} dataKey={String(year)} fill={YEAR_COLORS[i % YEAR_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Live Cash Collection (today)</h4>
          {!cashCollection || cashCollection.byMethod.length === 0 ? <p>No collections yet today.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={cashCollection.byMethod} dataKey="amount" nameKey="method" outerRadius={80} label>
                  {cashCollection.byMethod.map(entry => (
                    <Cell key={entry.method} fill={CASH_METHOD_COLORS[entry.method] || '#999'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Expense Breakdown (this fiscal year)</h4>
          {!expenseBreakdown || expenseBreakdown.byCategory.length === 0 ? <p>No expense postings yet.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expenseBreakdown.byCategory} dataKey="amount" nameKey="category" outerRadius={80} label>
                  {expenseBreakdown.byCategory.map((entry, i) => (
                    <Cell key={entry.category} fill={EXPENSE_CATEGORY_COLORS[i % EXPENSE_CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Expense Trend (last 6 months)</h4>
        {expenseTrend.length === 0 ? <p>No expense data.</p> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={expenseTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {expenseBreakdown && expenseBreakdown.byAccount.length > 0 && (
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Top Expense Accounts (this fiscal year)</h4>
          <table style={styles.table}>
            <thead>
              <tr><th style={styles.th}>Account</th><th style={styles.th}>Code</th><th style={styles.th}>Amount</th></tr>
            </thead>
            <tbody>
              {expenseBreakdown.byAccount.slice(0, 10).map(a => (
                <tr key={a.accountCode}>
                  <td style={styles.td}>{a.accountName}</td>
                  <td style={styles.td}>{a.accountCode}</td>
                  <td style={styles.td}>{a.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', backgroundColor: '#f5f7fa', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  h1: { margin: 0, fontSize: '22px' },
  subtitle: { color: '#666', margin: '4px 0 0 0', fontSize: '14px' },
  refreshBtn: { padding: '8px 16px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' },
  kpiCard: { backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' },
  kpiCardWarning: { borderLeft: '4px solid #f59e0b' },
  kpiLabel: { fontSize: '12px', color: '#666', marginBottom: '6px' },
  kpiValue: { fontSize: '22px', fontWeight: 700, color: '#222' },
  kpiTrend: { fontSize: '12px', fontWeight: 700, marginTop: '4px' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  chartCard: { background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  chartTitle: { margin: '0 0 8px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '13px', color: '#555' },
  td: { borderBottom: '1px solid #eee', padding: '8px', fontSize: '14px' },
};
