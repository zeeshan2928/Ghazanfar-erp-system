import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface AccountOption {
  id: number;
  accountCode: string;
  accountName: string;
  isCashAccount: boolean;
  isActive: boolean;
}

interface LedgerTransaction {
  id: number;
  transactionDate: string;
  postingDate: string;
  reference: string | null;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface LedgerReport {
  account: { id: number; accountCode: string; accountName: string; accountType: string; isCashAccount: boolean };
  from: string;
  to: string;
  openingBalance: number;
  transactions: LedgerTransaction[];
  closingBalance: number;
}

export function GeneralLedgerScreen() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(0);
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledger, setLedger] = useState<LedgerReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const result = await apiClient.getChartOfAccounts();
      setAccounts((result || []).filter((a: AccountOption) => a.isActive));
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadLedger = async () => {
    if (!accountId) {
      alert('Please select an account');
      return;
    }
    try {
      setLoading(true);
      const result = await apiClient.getGeneralLedger(parseInt(accountId), fromDate, toDate);
      setLedger(result);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to load general ledger';
      alert(msg);
      setLedger(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => (amount / 100).toFixed(2);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>General Ledger / Cash Account Register</h2>
      </div>

      <div style={styles.controls}>
        <div>
          <label>Account:</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={styles.input}>
            <option value="">— Select an account —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.accountCode} - {a.accountName}{a.isCashAccount ? ' 💵' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>From:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={styles.input} />
        </div>
        <div>
          <label>To:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={styles.input} />
        </div>
        <button onClick={loadLedger} disabled={loading} style={styles.button}>
          {loading ? 'Loading...' : 'Load'}
        </button>
      </div>

      {ledger && (
        <div style={styles.report}>
          <div style={styles.reportHeader}>
            <h3>{ledger.account.accountCode} - {ledger.account.accountName}{ledger.account.isCashAccount ? ' 💵' : ''}</h3>
            <p style={{ margin: '5px 0', color: '#666' }}>
              {new Date(ledger.from).toLocaleDateString()} to {new Date(ledger.to).toLocaleDateString()}
            </p>
          </div>

          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Reference</th>
                <th style={styles.th}>Description</th>
                <th style={{ ...styles.th, textAlign: 'right' as const }}>Debit</th>
                <th style={{ ...styles.th, textAlign: 'right' as const }}>Credit</th>
                <th style={{ ...styles.th, textAlign: 'right' as const }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ ...styles.tr, backgroundColor: '#f8f9fa' }}>
                <td colSpan={5} style={{ ...styles.td, fontWeight: 'bold' as const }}>Opening Balance</td>
                <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 'bold' as const }}>
                  PKR {formatCurrency(ledger.openingBalance)}
                </td>
              </tr>
              {ledger.transactions.length === 0 ? (
                <tr style={styles.tr}>
                  <td style={styles.td} colSpan={6}>No transactions in this period</td>
                </tr>
              ) : (
                ledger.transactions.map((t) => (
                  <tr key={t.id} style={styles.tr}>
                    <td style={styles.td}>{new Date(t.transactionDate).toLocaleDateString()}</td>
                    <td style={styles.td}>{t.reference || '-'}</td>
                    <td style={styles.td}>{t.description || '-'}</td>
                    <td style={{ ...styles.td, textAlign: 'right' as const }}>
                      {t.debit > 0 ? `PKR ${formatCurrency(t.debit)}` : '-'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' as const }}>
                      {t.credit > 0 ? `PKR ${formatCurrency(t.credit)}` : '-'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' as const }}>
                      PKR {formatCurrency(t.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
              <tr style={{ ...styles.tr, borderTop: '2px solid #333', backgroundColor: '#f8f9fa' }}>
                <td colSpan={5} style={{ ...styles.td, fontWeight: 'bold' as const }}>Closing Balance</td>
                <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 'bold' as const }}>
                  PKR {formatCurrency(ledger.closingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!ledger && !loading && (
        <p style={styles.empty}>Select an account and date range, then click Load.</p>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' },
  header: { display: 'flex' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: '20px' },
  controls: { display: 'flex' as const, gap: '15px', alignItems: 'flex-end' as const, marginBottom: '20px', flexWrap: 'wrap' as const },
  input: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', marginTop: '4px', display: 'block' as const, minWidth: '200px' },
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
