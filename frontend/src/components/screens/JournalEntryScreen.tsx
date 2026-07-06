import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface JournalEntryLine {
  accountId: number;
  accountCode: string;
  debitAmount: number;
  creditAmount: number;
}

interface JournalEntry {
  id: number;
  entryDate: string;
  memo: string;
  status: string;
  lines: JournalEntryLine[];
}

interface Account {
  id: number;
  accountCode: string;
  accountName: string;
}

export function JournalEntryScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<Partial<JournalEntryLine>[]>([
    { debitAmount: 0, creditAmount: 0 },
    { debitAmount: 0, creditAmount: 0 },
  ]);

  useEffect(() => {
    loadEntries();
    loadAccounts();
  }, []);

  const loadEntries = async () => {
    try {
      const response = await apiClient.getJournalEntries(0, 20);
      setEntries(response.data || []);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await apiClient.getChartOfAccounts();
      setAccounts(response.data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { debitAmount: 0, creditAmount: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updatedLines = [...lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    setLines(updatedLines);
  };

  const validateEntry = (): boolean => {
    if (!memo.trim()) {
      alert('Please enter a memo');
      return false;
    }

    const validLines = lines.filter((line) => line.accountId && (line.debitAmount || line.creditAmount));
    if (validLines.length < 2) {
      alert('Entry must have at least 2 lines');
      return false;
    }

    const totalDebit = validLines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredit = validLines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alert('Debits must equal credits');
      return false;
    }

    return true;
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEntry()) return;

    try {
      setLoading(true);
      const validLines = lines.filter((line) => line.accountId && (line.debitAmount || line.creditAmount));
      await apiClient.createJournalEntry({
        entryDate: new Date().toISOString(),
        memo,
        lines: validLines,
      });

      setMemo('');
      setLines([{ debitAmount: 0, creditAmount: 0 }, { debitAmount: 0, creditAmount: 0 }]);
      setShowForm(false);
      await loadEntries();
      alert('Journal entry created successfully');
    } catch (error) {
      console.error('Error creating entry:', error);
      alert('Failed to create journal entry');
    } finally {
      setLoading(false);
    }
  };

  const handlePostEntry = async (entryId: number) => {
    if (!window.confirm('Post this entry? This cannot be undone.')) return;
    try {
      setLoading(true);
      await apiClient.postJournalEntry(entryId);
      await loadEntries();
      alert('Entry posted successfully');
    } catch (error) {
      console.error('Error posting entry:', error);
      alert('Failed to post entry');
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Journal Entries</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
          style={styles.button}
        >
          {showForm ? 'Cancel' : 'New Entry'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateEntry} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Memo *</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Description of this journal entry"
              rows={2}
              style={{ ...styles.input, resize: 'vertical' as const }}
            />
          </div>

          <div style={styles.linesContainer}>
            <div style={styles.linesHeader}>
              <h3>Entry Lines</h3>
              <button
                type="button"
                onClick={handleAddLine}
                disabled={loading}
                style={{ ...styles.button, backgroundColor: '#17a2b8' }}
              >
                Add Line
              </button>
            </div>

            {lines.map((line, index) => (
              <div key={index} style={styles.lineItem}>
                <select
                  value={line.accountId || ''}
                  onChange={(e) => {
                    const accountId = parseInt(e.target.value);
                    const account = accounts.find((a) => a.id === accountId);
                    handleLineChange(index, 'accountId', accountId);
                    if (account) handleLineChange(index, 'accountCode', account.accountCode);
                  }}
                  style={{ ...styles.input, flex: 1 }}
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Debit"
                  value={line.debitAmount || ''}
                  onChange={(e) => handleLineChange(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                  style={{ ...styles.input, flex: 0.5 }}
                />

                <input
                  type="number"
                  placeholder="Credit"
                  value={line.creditAmount || ''}
                  onChange={(e) => handleLineChange(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                  style={{ ...styles.input, flex: 0.5 }}
                />

                {lines.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(index)}
                    style={{ ...styles.button, backgroundColor: '#dc3545', padding: '6px 12px' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <div
              style={{
                ...styles.lineItem,
                backgroundColor: '#f8f9fa',
                fontWeight: 'bold' as const,
              }}
            >
              <div style={{ flex: 1 }}>Totals:</div>
              <div style={{ flex: 0.5, textAlign: 'right' as const }}>
                PKR {totalDebit.toFixed(2)}
              </div>
              <div
                style={{
                  flex: 0.5,
                  textAlign: 'right' as const,
                  color: isBalanced ? '#28a745' : '#dc3545',
                }}
              >
                PKR {totalCredit.toFixed(2)}
              </div>
              <div style={{ width: '100px' }}></div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isBalanced}
            style={{
              ...styles.submitButton,
              ...(isBalanced ? {} : { opacity: 0.6, cursor: 'not-allowed' }),
            }}
          >
            Create Entry
          </button>
        </form>
      )}

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : entries.length === 0 ? (
        <p style={styles.empty}>No journal entries found</p>
      ) : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Memo</th>
              <th style={styles.th}>Lines</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} style={styles.tr}>
                <td style={styles.td}>{new Date(entry.entryDate).toLocaleDateString()}</td>
                <td style={styles.td}>{entry.memo}</td>
                <td style={styles.td}>{entry.lines.length} lines</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor:
                        entry.status === 'POSTED' ? '#28a745' : entry.status === 'REVERSED' ? '#6c757d' : '#007bff',
                    }}
                  >
                    {entry.status}
                  </span>
                </td>
                <td style={styles.td}>
                  {entry.status === 'DRAFT' && (
                    <button
                      onClick={() => handlePostEntry(entry.id)}
                      disabled={loading}
                      style={{
                        ...styles.button,
                        backgroundColor: '#28a745',
                        padding: '6px 12px',
                        fontSize: '12px',
                      }}
                    >
                      Post
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  form: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #ddd',
  },
  formGroup: {
    marginBottom: '15px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '5px',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  linesContainer: {
    marginBottom: '15px',
  },
  linesHeader: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: '10px',
  },
  lineItem: {
    display: 'flex' as const,
    gap: '10px',
    marginBottom: '10px',
    alignItems: 'center' as const,
  },
  table: {
    width: '100%' as const,
    borderCollapse: 'collapse' as const,
    backgroundColor: 'white',
    borderRadius: '4px',
    overflow: 'hidden' as const,
  },
  thead: {
    backgroundColor: '#f8f9fa',
    fontWeight: 'bold' as const,
  },
  th: {
    padding: '12px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #ddd',
  },
  tr: {
    borderBottom: '1px solid #ddd',
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
