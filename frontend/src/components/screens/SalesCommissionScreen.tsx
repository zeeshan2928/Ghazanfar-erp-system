import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface Salesman {
  id: number;
  firstName: string;
  lastName: string;
}

interface Product {
  id: number;
  name: string;
  code: string;
}

interface Assignment {
  id: number;
  salesmanId: number;
  productId: number;
  commissionType: 'PERCENTAGE' | 'FIXED_PER_UNIT';
  rate: string | number;
  targetQuantity: number;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  paidAmount: number | null;
  journalEntryId: number | null;
  salesman: Salesman;
  product: Product;
  achievedQuantity: number;
  achievedValue: number;
  commissionEarned: number;
  progressPercent: number;
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SalesCommissionScreen() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filterSalesmanId, setFilterSalesmanId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formSalesmanId, setFormSalesmanId] = useState<number | ''>('');
  const [formProductId, setFormProductId] = useState<number | ''>('');
  const [formType, setFormType] = useState<'PERCENTAGE' | 'FIXED_PER_UNIT'>('PERCENTAGE');
  const [formRate, setFormRate] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formPeriodStart, setFormPeriodStart] = useState(todayPlus(0));
  const [formPeriodEnd, setFormPeriodEnd] = useState(todayPlus(30));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSalesmanId]);

  async function loadReferenceData() {
    try {
      const [userRes, prodRes] = await Promise.all([
        apiClient.getUsers(0, 200, undefined, 'SALESMAN'),
        apiClient.searchProducts({ skip: 0, take: 500 }),
      ]);
      setSalesmen(userRes.data || userRes || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Failed to load salesmen/products', err);
    }
  }

  async function loadAssignments() {
    setLoading(true);
    try {
      const data = await apiClient.getCommissionAssignments(filterSalesmanId ? (filterSalesmanId as number) : undefined);
      setAssignments(data || []);
    } catch (err) {
      console.error('Failed to load commission assignments', err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormSalesmanId('');
    setFormProductId('');
    setFormType('PERCENTAGE');
    setFormRate('');
    setFormTarget('');
    setFormPeriodStart(todayPlus(0));
    setFormPeriodEnd(todayPlus(30));
  }

  async function submitAssignment() {
    setError('');
    if (!formSalesmanId || !formProductId) {
      setError('Select a salesman and a product');
      return;
    }
    if (!formRate || Number(formRate) <= 0) {
      setError('Enter a commission rate greater than 0');
      return;
    }
    if (!formTarget || Number(formTarget) <= 0) {
      setError('Enter a target quantity greater than 0');
      return;
    }

    setSaving(true);
    try {
      await apiClient.createCommissionAssignment({
        salesmanId: formSalesmanId,
        productId: formProductId,
        commissionType: formType,
        rate: Number(formRate),
        targetQuantity: Number(formTarget),
        periodStart: new Date(formPeriodStart).toISOString(),
        periodEnd: new Date(formPeriodEnd).toISOString(),
      });
      setSuccess('Commission assignment created');
      setTimeout(() => setSuccess(''), 2500);
      resetForm();
      setShowForm(false);
      loadAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: number) {
    if (!window.confirm('Deactivate this commission assignment?')) return;
    try {
      await apiClient.deactivateCommissionAssignment(id);
      loadAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate assignment');
    }
  }

  async function handleMarkPaid(id: number) {
    setError('');
    try {
      await apiClient.markCommissionPaid(id);
      setSuccess('Commission marked as paid and posted to the ledger');
      setTimeout(() => setSuccess(''), 2500);
      loadAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark commission paid');
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>💰 Sales Commission</h2>
        <button style={styles.primaryBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Assign Product'}
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {success && <div style={styles.successBanner}>{success}</div>}

      {showForm && (
        <div style={styles.card}>
          <div style={styles.grid3}>
            <div style={styles.field}>
              <label style={styles.label}>Salesman *</label>
              <select style={styles.input} value={formSalesmanId} onChange={e => setFormSalesmanId(e.target.value ? parseInt(e.target.value, 10) : '')}>
                <option value="">Select salesman...</option>
                {salesmen.map(s => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Product *</label>
              <select style={styles.input} value={formProductId} onChange={e => setFormProductId(e.target.value ? parseInt(e.target.value, 10) : '')}>
                <option value="">Select product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Commission Type</label>
              <select style={styles.input} value={formType} onChange={e => setFormType(e.target.value as 'PERCENTAGE' | 'FIXED_PER_UNIT')}>
                <option value="PERCENTAGE">% of sale price</option>
                <option value="FIXED_PER_UNIT">Rs per unit sold</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Rate {formType === 'PERCENTAGE' ? '(%)' : '(Rs/unit)'} *</label>
              <input style={styles.input} type="number" min={0} value={formRate} onChange={e => setFormRate(e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Target Quantity *</label>
              <input style={styles.input} type="number" min={0} value={formTarget} onChange={e => setFormTarget(e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Period</label>
              <div style={styles.inlineRow}>
                <input style={styles.input} type="date" value={formPeriodStart} onChange={e => setFormPeriodStart(e.target.value)} />
                <input style={styles.input} type="date" value={formPeriodEnd} onChange={e => setFormPeriodEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <button style={styles.primaryBtn} disabled={saving} onClick={submitAssignment}>
            {saving ? 'Saving...' : 'Create Assignment'}
          </button>
        </div>
      )}

      <div style={styles.filterRow}>
        <label style={styles.label}>Filter by salesman:</label>
        <select style={styles.input} value={filterSalesmanId} onChange={e => setFilterSalesmanId(e.target.value ? parseInt(e.target.value, 10) : '')}>
          <option value="">All salesmen</option>
          {salesmen.map(s => (
            <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={styles.emptyState}>Loading...</p>
      ) : assignments.length === 0 ? (
        <p style={styles.emptyState}>No commission assignments yet</p>
      ) : (
        <div style={styles.cardsGrid}>
          {assignments.map(a => (
            <div key={a.id} style={styles.assignmentCard}>
              <div style={styles.assignmentHeader}>
                <strong>{a.product.code} - {a.product.name}</strong>
                <span style={styles.badge}>{a.salesman.firstName} {a.salesman.lastName}</span>
              </div>
              <div style={styles.assignmentMeta}>
                {a.commissionType === 'PERCENTAGE' ? `${a.rate}% of sale price` : `Rs ${a.rate} per unit`}
                {' · '}
                {new Date(a.periodStart).toLocaleDateString()} - {new Date(a.periodEnd).toLocaleDateString()}
              </div>

              <div style={styles.progressLabel}>
                {a.achievedQuantity} / {a.targetQuantity} units ({a.progressPercent}%)
              </div>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${a.progressPercent}%` }} />
              </div>

              <div style={styles.figuresRow}>
                <span>Sales value: Rs {a.achievedValue.toLocaleString()}</span>
                <span>Commission earned: <strong>Rs {a.commissionEarned.toLocaleString()}</strong></span>
              </div>

              <div style={styles.inlineRow}>
                {a.paidAt ? (
                  <span style={styles.paidBadge}>Paid Rs {a.paidAmount?.toLocaleString()} (JE #{a.journalEntryId})</span>
                ) : (
                  <button style={styles.primaryBtn} onClick={() => handleMarkPaid(a.id)}>Mark Paid</button>
                )}
                <button style={styles.dangerBtn} onClick={() => handleDeactivate(a.id)}>Deactivate</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: '1200px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  h2: { margin: 0 },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' },
  successBanner: { background: '#d4edda', color: '#155724', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' },
  card: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '18px', marginBottom: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#555' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', width: '100%' },
  inlineRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  primaryBtn: { padding: '10px 18px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  dangerBtn: { padding: '10px 18px', background: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  filterRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  emptyState: { color: '#888', textAlign: 'center', padding: '30px' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' },
  assignmentCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  assignmentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { background: '#eef0fe', color: '#667eea', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 },
  assignmentMeta: { fontSize: '12px', color: '#666' },
  progressLabel: { fontSize: '12px', color: '#444', marginTop: '4px' },
  progressTrack: { width: '100%', height: '10px', background: '#eee', borderRadius: '5px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#43e97b', transition: 'width 0.3s ease' },
  figuresRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#333', marginTop: '4px' },
  paidBadge: { background: '#d4edda', color: '#155724', padding: '8px 14px', borderRadius: '6px', fontSize: '13px' },
};
