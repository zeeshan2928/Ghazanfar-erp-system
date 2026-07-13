import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

interface GrossProfitSummary {
  period: { from: string; to: string };
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  // Margin measured against the revenue whose cost is actually known - not
  // against total revenue, which would understate it.
  grossMarginPercent: number;
  costedRevenue: number;
  revenueCostedFromPurchases: number;
  revenueCostedFromBom: number;
  uncostedRevenue: number;
  uncostedRevenuePercent: number;
}

// Deliberately Gross Profit only (Revenue - COGS) - no Expenses, no Net
// Profit, no read of the formal accounting ledger anywhere. This is a
// standalone view over the two uploaded-report tables only; the existing
// Income Statement screen remains the formal, ledger-based P&L.
export function PnLStatementScreen() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setMonth(monthStart.getMonth() - 1);
  const today = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(monthStart.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today);
  const [summary, setSummary] = useState<GrossProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.getSalesAnalysisGrossProfitSummary(fromDate, toDate);
      setSummary(res);
    } catch (err) {
      setError('Failed to load P&L data');
    } finally {
      setLoading(false);
    }
  }

  const marginPercent = summary ? summary.grossMarginPercent.toFixed(1) : '—';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>P&amp;L (Gross Profit) — Sales &amp; Purchase Analysis</h2>
        <div style={styles.controls}>
          <label style={styles.controlLabel}>From<input type="date" style={styles.dateInput} value={fromDate} onChange={e => setFromDate(e.target.value)} /></label>
          <label style={styles.controlLabel}>To<input type="date" style={styles.dateInput} value={toDate} onChange={e => setToDate(e.target.value)} /></label>
          <button style={styles.refreshBtn} onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      <div style={styles.noteBanner}>
        This is a standalone Gross Profit view built only from your uploaded Sales and Purchase Analysis reports - it does not include operating expenses (rent, salaries, utilities) and is separate from the formal Income Statement, which reads the accounting ledger.
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {summary && (
        <>
          {summary.uncostedRevenuePercent > 0 && (
            <div style={styles.warningBanner}>
              {summary.uncostedRevenuePercent}% of revenue in this period ({Math.round(summary.uncostedRevenue).toLocaleString()}) has no known cost, so it is excluded from Gross Profit below rather than counted as pure profit. For models you assemble, set their cost in Reports &rarr; Assembled Costs (BOM); otherwise upload a Purchase Analysis report covering this period.
            </div>
          )}

          <div style={styles.sourceBanner}>
            Cost of the {Math.round(summary.costedRevenue).toLocaleString()} costed revenue came from:{' '}
            <strong>{Math.round(summary.revenueCostedFromPurchases).toLocaleString()}</strong> matched to purchase records
            {summary.revenueCostedFromBom > 0 && (
              <> and <strong>{Math.round(summary.revenueCostedFromBom).toLocaleString()}</strong> costed from your BOM formulas (assembled models)</>
            )}.
          </div>

          <div style={styles.statementCard}>
            <div style={styles.statementRow}>
              <span>Revenue</span>
              <strong>{summary.totalRevenue.toLocaleString()}</strong>
            </div>
            <div style={styles.statementRow}>
              <span>Cost of Goods Sold (on costed revenue only)</span>
              <strong style={{ color: '#b91c1c' }}>({summary.cogs.toLocaleString()})</strong>
            </div>
            <div style={{ ...styles.statementRow, ...styles.statementTotal }}>
              <span>Gross Profit</span>
              <strong style={{ color: summary.grossProfit >= 0 ? '#16a34a' : '#b91c1c' }}>{summary.grossProfit.toLocaleString()}</strong>
            </div>
            <div style={styles.statementRow}>
              <span>Gross Margin</span>
              <strong>{marginPercent}%</strong>
            </div>
          </div>
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
  sourceBanner: { background: '#eef2ff', color: '#3730a3', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '13px' },
  warningBanner: { background: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  noteBanner: { background: '#eff6ff', color: '#1e3a8a', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' },
  statementCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', maxWidth: '480px' },
  statementRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee', fontSize: '15px' },
  statementTotal: { borderTop: '2px solid #333', borderBottom: 'none', marginTop: '6px', paddingTop: '12px', fontSize: '17px' },
};
