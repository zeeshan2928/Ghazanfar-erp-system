import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface TrialBalanceAccount {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

interface TrialBalance {
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export function TrialBalanceScreen() {
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrialBalance();
  }, []);

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTrialBalance();
      setTrialBalance(response || { accounts: [], totalDebit: 0, totalCredit: 0, isBalanced: true });
    } catch (error) {
      console.error('Error loading trial balance:', error);
      setTrialBalance({ accounts: [], totalDebit: 0, totalCredit: 0, isBalanced: true });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return (amount / 100).toFixed(2);
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      ASSET: '#28a745',
      LIABILITY: '#dc3545',
      EQUITY: '#007bff',
      REVENUE: '#20c997',
      EXPENSE: '#ffc107',
    };
    return colors[type] || '#6c757d';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Trial Balance</h2>
        <button
          onClick={loadTrialBalance}
          disabled={loading}
          style={styles.button}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : trialBalance ? (
        <div style={styles.report}>
          <div style={styles.reportHeader}>
            <h3>Trial Balance</h3>
            <p style={{ margin: '5px 0', color: '#666' }}>
              As of {new Date().toLocaleDateString()}
            </p>
          </div>

          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>Account Code</th>
                <th style={styles.th}>Account Name</th>
                <th style={styles.th}>Type</th>
                <th style={{ ...styles.th, textAlign: 'right' as const }}>Debit</th>
                <th style={{ ...styles.th, textAlign: 'right' as const }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance?.accounts && trialBalance.accounts.length > 0 ? (
                trialBalance.accounts.map((account) => (
                  <tr key={account.accountId} style={styles.tr}>
                    <td style={styles.td}>{account.accountCode}</td>
                    <td style={styles.td}>{account.accountName}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: getTypeColor(account.accountType),
                        }}
                      >
                        {account.accountType}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' as const }}>
                      {account.debit > 0 ? `PKR ${formatCurrency(account.debit)}` : '-'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' as const }}>
                      {account.credit > 0 ? `PKR ${formatCurrency(account.credit)}` : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={styles.tr}>
                  <td style={styles.td} colSpan={5}>
                    No accounts found
                  </td>
                </tr>
              )}
              <tr style={{ ...styles.tr, borderTop: '2px solid #333', backgroundColor: '#f8f9fa' }}>
                <td colSpan={3} style={{ ...styles.td, fontWeight: 'bold' as const }}>
                  TOTALS
                </td>
                <td
                  style={{
                    ...styles.td,
                    textAlign: 'right' as const,
                    fontWeight: 'bold' as const,
                  }}
                >
                  PKR {formatCurrency(trialBalance?.totalDebit || 0)}
                </td>
                <td
                  style={{
                    ...styles.td,
                    textAlign: 'right' as const,
                    fontWeight: 'bold' as const,
                    color: trialBalance?.isBalanced ? '#28a745' : '#dc3545',
                  }}
                >
                  PKR {formatCurrency(trialBalance?.totalCredit || 0)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '20px', textAlign: 'center' as const }}>
            <span
              style={{
                ...styles.badge,
                backgroundColor: trialBalance?.isBalanced ? '#28a745' : '#dc3545',
                fontSize: '14px',
                padding: '8px 16px',
              }}
            >
              {trialBalance?.isBalanced
                ? '✓ Trial Balance is Balanced'
                : '✗ Trial Balance is NOT Balanced - Variance: PKR ' +
                  formatCurrency(Math.abs((trialBalance?.totalDebit || 0) - (trialBalance?.totalCredit || 0)))}
            </span>
          </div>
        </div>
      ) : (
        <p style={styles.empty}>No data available</p>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: '20px',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  report: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  reportHeader: {
    textAlign: 'center' as const,
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #333',
  },
  table: {
    width: '100%' as const,
    borderCollapse: 'collapse' as const,
  },
  thead: {
    backgroundColor: '#f8f9fa',
    fontWeight: 'bold' as const,
  },
  th: {
    padding: '12px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #ddd',
    fontWeight: 'bold' as const,
  },
  tr: {
    borderBottom: '1px solid #e0e0e0',
  },
  td: {
    padding: '12px',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold' as const,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '16px',
    color: '#666',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '16px',
    color: '#999',
    backgroundColor: 'white',
    borderRadius: '4px',
  },
};
