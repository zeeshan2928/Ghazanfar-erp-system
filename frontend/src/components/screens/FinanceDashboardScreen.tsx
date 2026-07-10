import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiClient } from '../../services/api';

interface BalanceSheet {
  asOfDate: string;
  isBalanced: boolean;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  assets: { total: number };
  liabilities: { total: number };
  equity: { total: number };
}

interface IncomeStatement {
  period: { from: string; to: string };
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

interface AgingBucket { bucket: string; count: number; totalAmount: number }
interface AgingSummary { buckets: AgingBucket[]; totalOutstanding: number }
interface CombinedAgingReport {
  arSummaries: AgingSummary[];
  apSummaries: AgingSummary[];
  totalArOutstanding: number;
  totalApOutstanding: number;
}

interface BudgetVariance {
  accountId: number;
  accountCode: string;
  accountName: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
}

interface CashBookKPIs {
  totalEntries: number;
  matchedCount: number;
  unmatchedCount: number;
  reconciliationPercentage: number;
  totalAmount: number;
  discrepancyAmount: number;
}

const BUCKET_ORDER = ['0-10', '10-20', '20-30', '30+'];

export function FinanceDashboardScreen() {
  const today = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const currentFiscalYear = new Date().getFullYear();

  const [asOfDate, setAsOfDate] = useState(today);
  const [periodFrom, setPeriodFrom] = useState(yearStart);
  const [periodTo, setPeriodTo] = useState(today);
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear);

  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [aging, setAging] = useState<CombinedAgingReport | null>(null);
  const [budgetVariances, setBudgetVariances] = useState<BudgetVariance[]>([]);
  const [cashKpis, setCashKpis] = useState<CashBookKPIs | null>(null);

  const [financialsRestricted, setFinancialsRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshingAging, setRefreshingAging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    setFinancialsRestricted(false);
    try {
      const [bsResult, isResult, agingResult, budgetResult, cashResult] = await Promise.allSettled([
        apiClient.getBalanceSheet(asOfDate),
        apiClient.getIncomeStatement(periodFrom, periodTo),
        apiClient.getCombinedAgingReport(asOfDate),
        apiClient.getBudgetVariances(fiscalYear),
        apiClient.getCashBookKPIs(periodFrom, periodTo),
      ]);

      if (bsResult.status === 'fulfilled') setBalanceSheet(bsResult.value);
      else if (bsResult.reason?.response?.status === 403) setFinancialsRestricted(true);

      if (isResult.status === 'fulfilled') setIncomeStatement(isResult.value);
      else if (isResult.reason?.response?.status === 403) setFinancialsRestricted(true);

      if (agingResult.status === 'fulfilled') setAging(agingResult.value);
      if (budgetResult.status === 'fulfilled') setBudgetVariances(budgetResult.value || []);
      if (cashResult.status === 'fulfilled') setCashKpis(cashResult.value);
    } catch (err) {
      setError('Failed to load finance dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function refreshAgingData() {
    setRefreshingAging(true);
    try {
      await Promise.all([apiClient.generateArAging(asOfDate), apiClient.generateApAging(asOfDate)]);
      const agingResult = await apiClient.getCombinedAgingReport(asOfDate);
      setAging(agingResult);
    } catch (err) {
      setError('Failed to refresh aging data');
    } finally {
      setRefreshingAging(false);
    }
  }

  function aggregateBuckets(summaries: AgingSummary[]) {
    const totals: Record<string, number> = { '0-10': 0, '10-20': 0, '20-30': 0, '30+': 0 };
    summaries.forEach(s => s.buckets.forEach(b => { totals[b.bucket] = (totals[b.bucket] || 0) + b.totalAmount; }));
    return BUCKET_ORDER.map(bucket => ({ bucket, amount: totals[bucket] || 0 }));
  }

  const arChartData = aging ? aggregateBuckets(aging.arSummaries) : [];
  const apChartData = aging ? aggregateBuckets(aging.apSummaries) : [];
  const budgetChartData = budgetVariances
    .slice()
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .slice(0, 10)
    .map(v => ({ name: v.accountName, Budget: v.budgetAmount, Actual: v.actualAmount }));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Finance Dashboard</h2>
        <div style={styles.controls}>
          <label style={styles.controlLabel}>As of<input type="date" style={styles.dateInput} value={asOfDate} onChange={e => setAsOfDate(e.target.value)} /></label>
          <label style={styles.controlLabel}>From<input type="date" style={styles.dateInput} value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} /></label>
          <label style={styles.controlLabel}>To<input type="date" style={styles.dateInput} value={periodTo} onChange={e => setPeriodTo(e.target.value)} /></label>
          <label style={styles.controlLabel}>Fiscal Year
            <input type="number" style={styles.dateInput} value={fiscalYear} onChange={e => setFiscalYear(parseInt(e.target.value, 10) || currentFiscalYear)} />
          </label>
          <button style={styles.refreshBtn} onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {financialsRestricted && (
        <div style={styles.warningBanner}>
          Balance sheet and income statement are restricted - your account doesn't have financial-data access.
        </div>
      )}

      <div style={styles.kpiGrid}>
        <KPICard label="Total Assets" value={balanceSheet?.totalAssets} />
        <KPICard label="Total Liabilities" value={balanceSheet?.liabilities?.total} />
        <KPICard label="Total Equity" value={balanceSheet?.equity?.total} />
        <KPICard label="Net Income" value={incomeStatement?.netIncome} highlight={incomeStatement ? incomeStatement.netIncome >= 0 : undefined} />
        <KPICard label="AR Outstanding" value={aging?.totalArOutstanding} />
        <KPICard label="AP Outstanding" value={aging?.totalApOutstanding} />
      </div>

      {balanceSheet && (
        <div style={styles.balancedBadge}>
          {balanceSheet.isBalanced ? '✓ Books are balanced' : '⚠ Books are NOT balanced - assets ≠ liabilities + equity'}
        </div>
      )}

      {cashKpis && (
        <div style={styles.kpiGrid}>
          <KPICard label="Cash Book Entries" value={cashKpis.totalEntries} isCount />
          <KPICard label="Reconciled %" value={cashKpis.reconciliationPercentage} isPercent />
          <KPICard label="Unmatched Entries" value={cashKpis.unmatchedCount} isCount />
          <KPICard label="Discrepancy Amount" value={cashKpis.discrepancyAmount} />
        </div>
      )}

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h4 style={styles.chartTitle}>AR Aging (by bucket)</h4>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={arChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>AP Aging (by bucket)</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={apChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <button style={styles.refreshBtn} onClick={refreshAgingData} disabled={refreshingAging}>
        {refreshingAging ? 'Refreshing aging data...' : 'Refresh Aging Data (recompute from bills/POs)'}
      </button>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Budget vs Actual (top 10 by variance, FY {fiscalYear})</h4>
        {budgetChartData.length === 0 ? (
          <p>No budget data for {fiscalYear}.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={budgetChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} interval={0} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Budget" fill="#94a3b8" />
              <Bar dataKey="Actual" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, isCount, isPercent, highlight }: { label: string; value?: number; isCount?: boolean; isPercent?: boolean; highlight?: boolean }) {
  const display = value === undefined || value === null
    ? '—'
    : isPercent
      ? `${value.toFixed(1)}%`
      : isCount
        ? value.toLocaleString()
        : value.toLocaleString();

  return (
    <div style={{
      ...styles.kpiCard,
      ...(highlight === true ? styles.kpiCardPositive : highlight === false ? styles.kpiCardNegative : {}),
    }}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{display}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' },
  h2: { margin: 0 },
  controls: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' },
  controlLabel: { display: 'flex', flexDirection: 'column', fontSize: '12px', color: '#555', gap: '2px' },
  dateInput: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  refreshBtn: { background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, margin: '12px 0' },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  warningBanner: { background: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' },
  kpiCard: { background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '14px' },
  kpiCardPositive: { background: '#e6f4ea', borderColor: '#1e7e34' },
  kpiCardNegative: { background: '#f8d7da', borderColor: '#721c24' },
  kpiLabel: { fontSize: '12px', color: '#666', marginBottom: '4px' },
  kpiValue: { fontSize: '20px', fontWeight: 700 },
  balancedBadge: { padding: '8px 12px', borderRadius: '6px', background: '#f0f0f0', marginBottom: '16px', fontWeight: 600, width: 'fit-content' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' },
  chartCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { margin: '0 0 8px 0' },
};
