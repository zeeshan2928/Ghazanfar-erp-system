import React, { useState } from 'react';
import { apiClient } from '../../services/api';

interface ContraLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  entryId: number;
  date: string;
  reference: string | null;
  description: string;
  cashAccountCode: string;
  cashAccountName: string;
  amount: number;
  contraLines: ContraLine[];
}

interface JournalReport {
  from: string;
  to: string;
  entries: JournalEntry[];
  total: number;
}

type Tab = 'receipts' | 'disbursements';

export function CashJournalsScreen() {
  const [tab, setTab] = useState<Tab>('receipts');
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(0);
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<JournalReport | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async (activeTab: Tab) => {
    try {
      setLoading(true);
      const result =
        activeTab === 'receipts'
          ? await apiClient.getCashReceiptsJournal(fromDate, toDate)
          : await apiClient.getCashDisbursementsJournal(fromDate, toDate);
      setReport(result);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to load journal';
      alert(msg);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (newTab: Tab) => {
    setTab(newTab);
    setReport(null);
  };

  const formatCurrency = (amount: number) => (amount / 100).toFixed(2);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Cash Journals</h2>
      </div>

      <div style={styles.tabBar}>
        <button
          onClick={() => switchTab('receipts')}
          style={{ ...styles.tabBtn, ...(tab === 'receipts' ? styles.tabBtnActive : {}) }}
        >
          Cash Receipts Journal
        </button>
        <button
          onClick={() => switchTab('disbursements')}
          style={{ ...styles.tabBtn, ...(tab === 'disbursements' ? styles.tabBtnActive : {}) }}
        >
          Cash Disbursements Journal
        </button>
      </div>

      <div style={styles.controls}>
        <div>
          <label>From:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={styles.input} />
        </div>
        <div>
          <label>To:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={styles.input} />
        </div>
        <button onClick={() => loadReport(tab)} disabled={loading} style={styles.button}>
          {loading ? 'Loading...' : 'Load'}
        </button>
      </div>

      {report && (
        <div style={styles.report}>
          <div style={styles.reportHeader}>
            <h3>{tab === 'receipts' ? 'Cash Receipts Journal' : 'Cash Disbursements Journal'}</h3>
            <p style={{ margin: '5px 0', color: '#666' }}>
              {new Date(report.from).toLocaleDateString()} to {new Date(report.to).toLocaleDateString()}
            </p>
          </div>

          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Reference</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Cash Account</th>
                <th style={styles.th}>Contra Account(s)</th>
                <th style={{ ...styles.th, textAlign: 'right' as const }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.entries.length === 0 ? (
                <tr style={styles.tr}>
                  <td style={styles.td} colSpan={6}>No entries in this period</td>
                </tr>
              ) : (
                report.entries.map((entry) => (
                  <tr key={entry.entryId} style={styles.tr}>
                    <td style={styles.td}>{new Date(entry.date).toLocaleDateString()}</td>
                    <td style={styles.td}>{entry.reference || '-'}</td>
                    <td style={styles.td}>{entry.description}</td>
                    <td style={styles.td}>{entry.cashAccountCode} - {entry.cashAccountName}</td>
                    <td style={styles.td}>
                      {entry.contraLines.map((c, i) => (
                        <div key={i}>
                          {c.accountCode} - {c.accountName} ({c.debit > 0 ? `Dr ${formatCurrency(c.debit)}` : `Cr ${formatCurrency(c.credit)}`})
                        </div>
                      ))}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' as const }}>
                      PKR {formatCurrency(entry.amount)}
                    </td>
                  </tr>
                ))
              )}
              <tr style={{ ...styles.tr, borderTop: '2px solid #333', backgroundColor: '#f8f9fa' }}>
                <td colSpan={5} style={{ ...styles.td, fontWeight: 'bold' as const }}>
                  Total {tab === 'receipts' ? 'Receipts' : 'Disbursements'}
                </td>
                <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 'bold' as const }}>
                  PKR {formatCurrency(report.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!report && !loading && (
        <p style={styles.empty}>Select a date range, then click Load.</p>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' },
  header: { display: 'flex' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: '20px' },
  tabBar: { display: 'flex' as const, gap: '10px', marginBottom: '20px' },
  tabBtn: { padding: '10px 20px', backgroundColor: '#e9ecef', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' as const },
  tabBtnActive: { backgroundColor: '#007bff', color: 'white' },
  controls: { display: 'flex' as const, gap: '15px', alignItems: 'flex-end' as const, marginBottom: '20px', flexWrap: 'wrap' as const },
  input: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', marginTop: '4px', display: 'block' as const },
  button: { padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  report: { backgroundColor: 'white', padding: '30px', borderRadius: '4px', border: '1px solid #ddd' },
  reportHeader: { textAlign: 'center' as const, marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #333' },
  table: { width: '100%' as const, borderCollapse: 'collapse' as const },
  thead: { backgroundColor: '#f8f9fa', fontWeight: 'bold' as const },
  th: { padding: '12px', textAlign: 'left' as const, borderBottom: '2px solid #ddd', fontWeight: 'bold' as const },
  tr: { borderBottom: '1px solid #e0e0e0' },
  td: { padding: '10px 12px', fontSize: '13px' },
  empty: { textAlign: 'center' as const, padding: '40px', fontSize: '16px', color: '#999', backgroundColor: 'white', borderRadius: '4px' },
};
