import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface Account {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountCategory: string | null;
  isCashAccount: boolean;
  parentAccountId: number | null;
  isActive: boolean;
  childAccounts?: Account[];
}

interface AccountFormData {
  accountCode: string;
  accountName: string;
  accountType: string;
  accountCategory: string;
  isCashAccount: boolean;
  parentAccountId: string;
}

const EMPTY_FORM: AccountFormData = {
  accountCode: '',
  accountName: '',
  accountType: 'ASSET',
  accountCategory: '',
  isCashAccount: false,
  parentAccountId: '',
};

const accountTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

// Mirrors ALLOWED_CATEGORIES_BY_TYPE in chart-of-accounts.service.ts
const categoriesByType: Record<string, string[]> = {
  ASSET: ['CURRENT_ASSET', 'FIXED_ASSET', 'OTHER_ASSET'],
  LIABILITY: ['CURRENT_LIABILITY', 'LONG_TERM_LIABILITY'],
  EQUITY: ['OWNER_EQUITY'],
  REVENUE: ['SALES_REVENUE', 'OTHER_REVENUE'],
  EXPENSE: ['COGS', 'OPERATING_EXPENSE', 'NON_OPERATING_EXPENSE', 'TAX_EXPENSE'],
};

function flatten(accounts: Account[]): Account[] {
  const result: Account[] = [];
  for (const account of accounts) {
    result.push(account);
    if (account.childAccounts?.length) {
      result.push(...flatten(account.childAccounts));
    }
  }
  return result;
}

export function ChartOfAccountsScreen() {
  const [tree, setTree] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AccountFormData>(EMPTY_FORM);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const result = await apiClient.getAccountHierarchy();
      setTree(result || []);
    } catch (error) {
      console.error('Error loading chart of accounts:', error);
      alert('Failed to load chart of accounts');
    } finally {
      setLoading(false);
    }
  };

  const allAccounts = flatten(tree);

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

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (account: Account) => {
    setEditingId(account.id);
    setFormData({
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      accountCategory: account.accountCategory || '',
      isCashAccount: account.isCashAccount || false,
      parentAccountId: account.parentAccountId ? String(account.parentAccountId) : '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountCode || !formData.accountName) {
      alert('Please fill in all required fields');
      return;
    }

    const payload = {
      accountCode: formData.accountCode,
      accountName: formData.accountName,
      accountType: formData.accountType,
      accountCategory: formData.accountCategory || undefined,
      isCashAccount: formData.isCashAccount,
      parentAccountId: formData.parentAccountId ? parseInt(formData.parentAccountId) : undefined,
    };

    try {
      setLoading(true);
      if (editingId) {
        await apiClient.updateAccount(editingId, payload);
        alert('Account updated successfully');
      } else {
        await apiClient.createAccount(payload);
        alert('Account created successfully');
      }
      setFormData(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      await loadAccounts();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to save account';
      console.error('Error saving account:', error);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (account: Account) => {
    if (!window.confirm(`Deactivate account ${account.accountCode} - ${account.accountName}?`)) return;
    try {
      setLoading(true);
      await apiClient.deactivateAccount(account.id);
      await loadAccounts();
      alert('Account deactivated');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to deactivate account';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const parentOptions = allAccounts.filter((a) => a.id !== editingId);

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
            onClick={() => (showForm ? setShowForm(false) : openCreateForm())}
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
        <form onSubmit={handleSubmit} style={styles.form}>
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  accountType: e.target.value,
                  accountCategory: '',
                  isCashAccount: e.target.value === 'ASSET' ? formData.isCashAccount : false,
                })
              }
              style={styles.input}
            >
              {accountTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label>Category</label>
            <select
              value={formData.accountCategory}
              onChange={(e) => setFormData({ ...formData, accountCategory: e.target.value })}
              style={styles.input}
            >
              <option value="">— None —</option>
              {(categoriesByType[formData.accountType] || []).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {formData.accountType === 'ASSET' && (
            <div style={styles.formGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.isCashAccount}
                  onChange={(e) => setFormData({ ...formData, isCashAccount: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                Is Cash/Bank Account (used in Cash Receipts/Disbursements Journals)
              </label>
            </div>
          )}

          <div style={styles.formGroup}>
            <label>Parent Account</label>
            <select
              value={formData.parentAccountId}
              onChange={(e) => setFormData({ ...formData, parentAccountId: e.target.value })}
              style={styles.input}
            >
              <option value="">— No parent (top-level) —</option>
              {parentOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountCode} - {a.accountName}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading} style={styles.submitButton}>
            {editingId ? 'Save Changes' : 'Create Account'}
          </button>
        </form>
      )}

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : tree.length === 0 ? (
        <p style={styles.empty}>No accounts found. Click "Seed Standard CoA" to create starter accounts.</p>
      ) : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Code</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {tree.map((account) => (
              <AccountTreeRows
                key={account.id}
                account={account}
                depth={0}
                onEdit={openEditForm}
                onDeactivate={handleDeactivate}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AccountTreeRows({
  account,
  depth,
  onEdit,
  onDeactivate,
}: {
  account: Account;
  depth: number;
  onEdit: (account: Account) => void;
  onDeactivate: (account: Account) => void;
}) {
  return (
    <>
      <tr style={styles.tr}>
        <td style={styles.td}>{account.accountCode}</td>
        <td style={{ ...styles.td, paddingLeft: `${12 + depth * 24}px` }}>
          {depth > 0 ? '↳ ' : ''}
          {account.accountName}
          {account.isCashAccount ? ' 💵' : ''}
        </td>
        <td style={styles.td}>
          <span style={{ ...styles.badge, backgroundColor: getTypeColor(account.accountType) }}>
            {account.accountType}
          </span>
        </td>
        <td style={styles.td}>{account.accountCategory ? account.accountCategory.replace(/_/g, ' ') : '—'}</td>
        <td style={styles.td}>{account.isActive ? 'Active' : 'Inactive'}</td>
        <td style={styles.td}>
          <button onClick={() => onEdit(account)} style={styles.smallBtn}>Edit</button>
          <button onClick={() => onDeactivate(account)} style={styles.smallBtnDanger}>Deactivate</button>
        </td>
      </tr>
      {account.childAccounts?.map((child) => (
        <AccountTreeRows
          key={child.id}
          account={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
        />
      ))}
    </>
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
  smallBtn: {
    padding: '4px 10px',
    marginRight: '6px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  smallBtnDanger: {
    padding: '4px 10px',
    backgroundColor: '#fff5f5',
    border: '1px solid #f5c2c2',
    color: '#c0392b',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
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
