import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface IncomeStatementLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  amount: number;
}

interface IncomeStatement {
  period: {
    from: string;
    to: string;
  };
  revenues: IncomeStatementLine[];
  totalRevenue: number;
  expenses: IncomeStatementLine[];
  totalExpenses: number;
  netIncome: number;
}

export function IncomeStatementScreen() {
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(0);
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadIncomeStatement();
  }, []);

  const loadIncomeStatement = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getIncomeStatement(fromDate, toDate);
      setIncomeStatement(response);
    } catch (error) {
      console.error('Error loading income statement:', error);
      alert('Failed to load income statement');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    loadIncomeStatement();
  };

  const formatCurrency = (amount: number) => {
    return (amount / 100).toFixed(2);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Income Statement</h2>
        <div style={styles.dateControl}>
          <div>
            <label>From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label>To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={styles.input}
            />
          </div>
          <button
            onClick={handleDateChange}
            disabled={loading}
            style={styles.button}
          >
            Load
          </button>
        </div>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : incomeStatement ? (
        <div style={styles.report}>
          <div style={styles.reportHeader}>
            <h3>Income Statement</h3>
            <p style={{ margin: '5px 0', color: '#666' }}>
              For the Period: {new Date(incomeStatement.period.from).toLocaleDateString()} to{' '}
              {new Date(incomeStatement.period.to).toLocaleDateString()}
            </p>
          </div>

          {/* REVENUES */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>REVENUES</h4>
            <table style={styles.table}>
              <tbody>
                {incomeStatement.revenues.length > 0 ? (
                  incomeStatement.revenues.map((line) => (
                    <tr key={line.accountId} style={styles.tr}>
                      <td style={{ ...styles.td, paddingLeft: '30px' }}>
                        {line.accountCode} - {line.accountName}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' as const }}>
                        PKR {formatCurrency(line.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr style={styles.tr}>
                    <td style={styles.td} colSpan={2}>
                      No revenue accounts
                    </td>
                  </tr>
                )}
                <tr style={{ ...styles.tr, borderTop: '1px solid #333' }}>
                  <td style={{ ...styles.td, fontWeight: 'bold' as const }}>Total Revenues</td>
                  <td
                    style={{
                      ...styles.td,
                      textAlign: 'right' as const,
                      fontWeight: 'bold' as const,
                    }}
                  >
                    PKR {formatCurrency(incomeStatement.totalRevenue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* EXPENSES */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>EXPENSES</h4>
            <table style={styles.table}>
              <tbody>
                {incomeStatement.expenses.length > 0 ? (
                  incomeStatement.expenses.map((line) => (
                    <tr key={line.accountId} style={styles.tr}>
                      <td style={{ ...styles.td, paddingLeft: '30px' }}>
                        {line.accountCode} - {line.accountName}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' as const }}>
                        PKR {formatCurrency(line.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr style={styles.tr}>
                    <td style={styles.td} colSpan={2}>
                      No expense accounts
                    </td>
                  </tr>
                )}
                <tr style={{ ...styles.tr, borderTop: '1px solid #333' }}>
                  <td style={{ ...styles.td, fontWeight: 'bold' as const }}>Total Expenses</td>
                  <td
                    style={{
                      ...styles.td,
                      textAlign: 'right' as const,
                      fontWeight: 'bold' as const,
                    }}
                  >
                    PKR {formatCurrency(incomeStatement.totalExpenses)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* NET INCOME */}
          <div style={styles.section}>
            <table style={styles.table}>
              <tbody>
                <tr style={{ ...styles.tr, borderTop: '2px solid #333', backgroundColor: '#f0f0f0' }}>
                  <td style={{ ...styles.td, fontWeight: 'bold' as const, fontSize: '16px' }}>
                    NET INCOME
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      textAlign: 'right' as const,
                      fontWeight: 'bold' as const,
                      fontSize: '16px',
                      color: incomeStatement.netIncome >= 0 ? '#28a745' : '#dc3545',
                    }}
                  >
                    PKR {formatCurrency(incomeStatement.netIncome)}
                  </td>
                </tr>
              </tbody>
            </table>
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
  dateControl: {
    display: 'flex' as const,
    gap: '15px',
    alignItems: 'flex-end' as const,
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '4px',
    display: 'block' as const,
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
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    marginBottom: '10px',
    borderBottom: '1px solid #333',
    paddingBottom: '5px',
  },
  table: {
    width: '100%' as const,
    borderCollapse: 'collapse' as const,
    marginBottom: '15px',
  },
  tr: {
    borderBottom: '1px solid #e0e0e0',
  },
  td: {
    padding: '10px 5px',
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
