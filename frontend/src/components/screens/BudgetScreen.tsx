import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface Budget {
  id: number;
  accountId: number;
  fiscalYear: number;
  period: string;
  budgetAmount: number;
  notes?: string;
  account: {
    accountCode: string;
    accountName: string;
  };
}

interface Variance {
  accountId: number;
  accountCode: string;
  accountName: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
}

export function BudgetScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [variances, setVariances] = useState<Variance[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    accountId: 0,
    fiscalYear: new Date().getFullYear(),
    period: 'ANNUAL',
    budgetAmount: 0,
    notes: '',
  });

  useEffect(() => {
    loadBudgets();
    loadVariances();
  }, [selectedYear]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBudgets(selectedYear);
      setBudgets(response.data || []);
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVariances = async () => {
    try {
      const response = await apiClient.getBudgetVariances(selectedYear);
      setVariances(response || []);
    } catch (error) {
      console.error('Error loading variances:', error);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId || formData.budgetAmount === 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await apiClient.createBudget({
        accountId: formData.accountId,
        fiscalYear: formData.fiscalYear,
        period: formData.period,
        budgetAmount: Math.round(formData.budgetAmount * 100), // convert to cents
        notes: formData.notes,
      });
      setFormData({ accountId: 0, fiscalYear: selectedYear, period: 'ANNUAL', budgetAmount: 0, notes: '' });
      setShowForm(false);
      await loadBudgets();
      alert('Budget created successfully');
    } catch (error) {
      console.error('Error creating budget:', error);
      alert('Failed to create budget');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => (cents / 100).toFixed(2);
  const getVarianceColor = (variance: number) => (variance < 0 ? '#28a745' : variance > 0 ? '#dc3545' : '#6c757d');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Budget Management</h2>
        <div style={styles.controls}>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={styles.input}
          >
            {[2024, 2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button onClick={() => setShowForm(!showForm)} style={styles.button}>
            {showForm ? 'Cancel' : 'New Budget'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreateBudget} style={styles.form}>
          <div style={styles.formRow}>
            <input
              type="number"
              placeholder="Account ID"
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: parseInt(e.target.value) })}
              style={styles.input}
            />
            <select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              style={styles.input}
            >
              <option value="ANNUAL">Annual</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            <input
              type="number"
              placeholder="Budget Amount"
              value={formData.budgetAmount}
              onChange={(e) => setFormData({ ...formData, budgetAmount: parseFloat(e.target.value) })}
              step="0.01"
              style={styles.input}
            />
            <button type="submit" disabled={loading} style={styles.submitButton}>
              Create
            </button>
          </div>
        </form>
      )}

      <div style={styles.section}>
        <h3>Budget vs Actual (Variance Analysis)</h3>
        {loading ? (
          <p>Loading...</p>
        ) : variances.length === 0 ? (
          <p>No variance data available</p>
        ) : (
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>Account</th>
                <th style={styles.th}>Budget</th>
                <th style={styles.th}>Actual</th>
                <th style={styles.th}>Variance</th>
                <th style={styles.th}>% Var</th>
              </tr>
            </thead>
            <tbody>
              {variances.map((v) => (
                <tr key={v.accountId} style={styles.tr}>
                  <td style={styles.td}>{v.accountCode} - {v.accountName}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>PKR {formatCurrency(v.budgetAmount)}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>PKR {formatCurrency(v.actualAmount)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: getVarianceColor(v.variance) }}>
                    PKR {formatCurrency(v.variance)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', color: getVarianceColor(v.variance) }}>
                    {v.variancePercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.section}>
        <h3>All Budgets ({selectedYear})</h3>
        {loading ? (
          <p>Loading...</p>
        ) : budgets.length === 0 ? (
          <p>No budgets created for {selectedYear}</p>
        ) : (
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>Account</th>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Budget Amount</th>
                <th style={styles.th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id} style={styles.tr}>
                  <td style={styles.td}>{b.account.accountCode} - {b.account.accountName}</td>
                  <td style={styles.td}>{b.period}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>PKR {formatCurrency(b.budgetAmount)}</td>
                  <td style={styles.td}>{b.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
  controls: {
    display: 'flex' as const,
    gap: '10px',
  },
  form: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  formRow: {
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
  },
  submitButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  table: {
    width: '100%' as const,
    borderCollapse: 'collapse' as const,
  },
  thead: {
    backgroundColor: '#f8f9fa',
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
};
