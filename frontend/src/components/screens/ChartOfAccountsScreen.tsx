import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface Account {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  isActive: boolean;
}

interface CreateAccountRequest {
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountId?: number;
}

export function ChartOfAccountsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateAccountRequest>({
    accountCode: '',
    accountName: '',
    accountType: 'ASSET',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getChartOfAccounts();
      setAccounts(response.data || []);
    } catch (error) {
      console.error('Error loading chart of accounts:', error);
      alert('Failed to load chart of accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedCoA = async () => {
    if (!window.confirm('This will create a standard chart of accounts. Continue?')) return;
    try {
      setLoading(true);
      await apiClient.seedChartOfAccounts();
      await loadAccounts();
      alert('Chart of Accounts seeded successfully');
    } catch (error) {
      console.error('Error seeding CoA:', error);
      alert('Failed to seed chart of accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountCode || !formData.accountName) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await apiClient.createAccount(formData);
      setFormData({ accountCode: '', accountName: '', accountType: 'ASSET' });
      setShowForm(false);
      await loadAccounts();
      alert('Account created successfully');
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const accountTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Chart of Accounts</h2>
        <div style={styles.buttonGroup}>
          <button
            onClick={handleSeedCoA}
            disabled={loading}
            style={{
              ...styles.button,
              backgroundColor: '#17a2b8',
              ...(!loading ? {} : { opacity: 0.6, cursor: 'not-allowed' }),
            }}
          >
            Seed Standard CoA
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={loading}
            style={{
              ...styles.button,
              ...(!loading ? {} : { opacity: 0.6, cursor: 'not-allowed' }),
            }}
          >
            {showForm ? 'Cancel' : 'Add Account'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreateAccount} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Account Code *</label>
            <input
              type="text"
              value={formData.accountCode}
              onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
              placeholder="e.g., 1000"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Account Name *</label>
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              placeholder="e.g., Cash"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Account Type *</label>
            <select
              value={formData.accountType}
              onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
              style={styles.input}
            >
              {accountTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading} style={styles.submitButton}>
            Create Account
          </button>
        </form>
      )}

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : accounts.length === 0 ? (
        <p style={styles.empty}>No accounts found. Click "Seed Standard CoA" to create starter accounts.</p>
      ) : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Code</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} style={styles.tr}>
                <td style={styles.td}>{account.accountCode}</td>
                <td style={styles.td}>{account.accountName}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, backgroundColor: getTypeColor(account.accountType) }}>
                    {account.accountType}
                  </span>
                </td>
                <td style={styles.td}>{account.isActive ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    ASSET: '#28a745',
    LIABILITY: '#dc3545',
    EQUITY: '#007bff',
    REVENUE: '#20c997',
    EXPENSE: '#ffc107',
  };
  return colors[type] || '#6c757d';
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
  buttonGroup: {
    display: 'flex' as const,
    gap: '10px',
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
