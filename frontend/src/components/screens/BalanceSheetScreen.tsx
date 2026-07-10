import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface BalanceSheetLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  amount: number;
}

interface BalanceSheetSubsection {
  category: string;
  label: string;
  lines: BalanceSheetLine[];
  total: number;
}

interface BalanceSheetSection {
  section: string;
  subsections: BalanceSheetSubsection[];
  total: number;
}

interface BalanceSheet {
  asOfDate: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export function BalanceSheetScreen() {
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadBalanceSheet();
  }, []);

  const loadBalanceSheet = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBalanceSheet(asOfDate);
      setBalanceSheet(response);
    } catch (error) {
      console.error('Error loading balance sheet:', error);
      alert('Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    loadBalanceSheet();
  };

  const formatCurrency = (amount: number) => {
    return (amount / 100).toFixed(2);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Balance Sheet</h2>
        <div style={styles.dateControl}>
          <label>As Of Date:</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            style={styles.input}
          />
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
      ) : balanceSheet ? (
        <div style={styles.report}>
          <div style={styles.reportHeader}>
            <h3>Balance Sheet As Of {new Date(asOfDate).toLocaleDateString()}</h3>
          </div>

          {/* ASSETS */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>ASSETS</h4>
            {balanceSheet.assets.subsections.map((sub) => (
              <table key={sub.category} style={styles.table}>
                <tbody>
                  <tr>
                    <td colSpan={2} style={styles.subsectionTitle}>{sub.label}</td>
                  </tr>
                  {sub.lines.map((line) => (
                    <tr key={line.accountId} style={styles.tr}>
                      <td style={{ ...styles.td, paddingLeft: '30px' }}>
                        {line.accountCode} - {line.accountName}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' as const }}>
                        PKR {formatCurrency(line.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr style={styles.tr}>
                    <td style={{ ...styles.td, paddingLeft: '20px', fontWeight: 'bold' as const }}>
                      Total {sub.label}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 'bold' as const }}>
                      PKR {formatCurrency(sub.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ))}
            <table style={styles.table}>
              <tbody>
                <tr style={{ ...styles.tr, borderTop: '2px solid #333' }}>
                  <td style={{ ...styles.td, fontWeight: 'bold' as const }}>Total Assets</td>
                  <td
                    style={{
                      ...styles.td,
                      textAlign: 'right' as const,
                      fontWeight: 'bold' as const,
                    }}
                  >
                    PKR {formatCurrency(balanceSheet.totalAssets)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LIABILITIES & EQUITY */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>LIABILITIES & EQUITY</h4>

            {balanceSheet.liabilities.subsections.map((sub) => (
              <table key={sub.category} style={styles.table}>
                <tbody>
                  <tr>
                    <td colSpan={2} style={styles.subsectionTitle}>{sub.label}</td>
                  </tr>
                  {sub.lines.map((line) => (
                    <tr key={line.accountId} style={styles.tr}>
                      <td style={{ ...styles.td, paddingLeft: '30px' }}>
                        {line.accountCode} - {line.accountName}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' as const }}>
                        PKR {formatCurrency(line.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr style={styles.tr}>
                    <td style={{ ...styles.td, paddingLeft: '20px', fontWeight: 'bold' as const }}>
                      Total {sub.label}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 'bold' as const }}>
                      PKR {formatCurrency(sub.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ))}
            <table style={styles.table}>
              <tbody>
                <tr style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 'bold' as const }}>Total Liabilities</td>
                  <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 'bold' as const }}>
                    PKR {formatCurrency(balanceSheet.liabilities.total)}
                  </td>
                </tr>
              </tbody>
            </table>

            {balanceSheet.equity.subsections.map((sub) => (
              <table key={sub.category} style={styles.table}>
                <tbody>
                  <tr>
                    <td colSpan={2} style={styles.subsectionTitle}>{sub.label}</td>
                  </tr>
                  {sub.lines.map((line) => (
                    <tr key={line.accountId} style={styles.tr}>
                      <td style={{ ...styles.td, paddingLeft: '30px' }}>
                        {line.accountCode} - {line.accountName}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' as const }}>
                        PKR {formatCurrency(line.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr style={styles.tr}>
                    <td style={{ ...styles.td, paddingLeft: '20px', fontWeight: 'bold' as const }}>
                      Total {sub.label}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 'bold' as const }}>
                      PKR {formatCurrency(sub.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ))}
            <table style={styles.table}>
              <tbody>
                <tr style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 'bold' as const }}>Total Equity</td>
                  <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 'bold' as const }}>
                    PKR {formatCurrency(balanceSheet.equity.total)}
                  </td>
                </tr>
                <tr style={{ ...styles.tr, borderTop: '2px solid #333' }}>
                  <td style={{ ...styles.td, fontWeight: 'bold' as const }}>
                    Total Liabilities & Equity
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      textAlign: 'right' as const,
                      fontWeight: 'bold' as const,
                    }}
                  >
                    PKR {formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* VALIDATION */}
          <div style={{ marginTop: '20px', textAlign: 'center' as const }}>
            <span
              style={{
                ...styles.badge,
                backgroundColor: balanceSheet.isBalanced ? '#28a745' : '#dc3545',
                fontSize: '14px',
                padding: '8px 16px',
              }}
            >
              {balanceSheet.isBalanced ? '✓ Balance Sheet is Balanced' : '✗ Balance Sheet is NOT Balanced'}
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
  dateControl: {
    display: 'flex' as const,
    gap: '10px',
    alignItems: 'center' as const,
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
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
  subsectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    marginTop: '15px',
    marginBottom: '8px',
    color: '#555',
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
  badge: {
    borderRadius: '4px',
    color: 'white',
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
