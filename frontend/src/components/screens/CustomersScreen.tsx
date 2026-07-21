import React, { useState, useEffect } from 'react';
import { SearchBox } from '../filters/SearchBox';
import { FilterPanel } from '../filters/FilterPanel';
import { FilterSummary } from '../filters/FilterSummary';
import { FilterOperator, DataType, FilterOperatorDto, SearchRequestDto, ColumnValueDto } from '../../types/filters';
import { apiClient } from '../../services/api';
import { LocationPicker } from '../LocationPicker';

interface Customer {
  id: number;
  name: string;
  customerType: string;
  accountType: string;
  phone: string;
  email: string;
  creditLimit: number;
  city: { id: number; name: string; province: { id: number; name: string } } | null;
}

export function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);
  const [primaryFilter, setPrimaryFilter] = useState<FilterOperatorDto | undefined>();
  const [columnFilters, setColumnFilters] = useState<FilterOperatorDto[]>([]);
  const [columnValues, setColumnValues] = useState<Record<string, ColumnValueDto[]>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', creditLimit: '', accountType: 'WALK_IN', customerType: 'WALK_IN', cityId: null as number | null, cityLabel: '' });
  // Click a customer row to open their detail + recent sale history.
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [custHistory, setCustHistory] = useState<any[] | null>(null);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', email: '', creditLimit: '', accountType: 'WALK_IN', customerType: 'WALK_IN', cityId: null as number | null, cityLabel: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // CustomerType enum (prisma/schema.prisma) - this is the customer's "nature"
  // (walk-in vs. wholesale vs. retail etc.), distinct from accountType
  // (walk-in/khata, which is about credit terms not customer nature).
  const CUSTOMER_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: 'WALK_IN', label: 'Walk-in' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'WHOLESALE', label: 'Wholesale' },
    { value: 'CORPORATE', label: 'Corporate' },
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'VIP', label: 'VIP' },
  ];

  async function openCustomer(c: Customer) {
    setSelectedCustomer(c);
    setCustHistory(null);
    setEditingCustomer(false);
    try {
      const h = await apiClient.getCustomerSaleHistory(c.id);
      setCustHistory(Array.isArray(h) ? h : (h?.data ?? h?.transactions ?? []));
    } catch { setCustHistory([]); }
  }

  // The search endpoint fills missing phone/email with the literal display
  // placeholder "N/A" (customers-search.service.ts) rather than leaving them
  // null - fine for a read-only table cell, but if echoed straight back into
  // an editable field it gets sent to the server as if it were real data,
  // and "N/A" then correctly fails email validation. Treat it as blank here.
  const realValue = (v: string) => (v && v !== 'N/A' ? v : '');

  function startEditCustomer() {
    if (!selectedCustomer) return;
    setEditFormData({
      name: selectedCustomer.name,
      phone: realValue(selectedCustomer.phone),
      email: realValue(selectedCustomer.email),
      creditLimit: String(selectedCustomer.creditLimit ?? 0),
      accountType: selectedCustomer.accountType || 'WALK_IN',
      customerType: selectedCustomer.customerType || 'WALK_IN',
      cityId: selectedCustomer.city?.id ?? null,
      cityLabel: selectedCustomer.city?.name ?? '',
    });
    setEditingCustomer(true);
  }

  async function handleSaveEdit() {
    if (!selectedCustomer) return;
    setSavingEdit(true);
    try {
      const updated = await apiClient.updateCustomer(selectedCustomer.id, {
        name: editFormData.name,
        phone: editFormData.phone,
        email: editFormData.email,
        creditLimit: parseInt(editFormData.creditLimit) || 0,
        accountType: editFormData.accountType,
        customerType: editFormData.customerType,
        cityId: editFormData.cityId,
      });
      setSelectedCustomer(updated);
      setEditingCustomer(false);
      await fetchCustomers();
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeactivateCustomer() {
    if (!selectedCustomer) return;
    if (!window.confirm(`Deactivate ${selectedCustomer.name}? They will no longer appear in customer lists, but their sale history is kept.`)) return;
    try {
      await apiClient.deactivateCustomer(selectedCustomer.id);
      setSelectedCustomer(null);
      await fetchCustomers();
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  }

  const columns = [
    { name: 'name', label: 'Name', dataType: DataType.TEXT },
    { name: 'customerType', label: 'Type', dataType: DataType.ENUM },
    { name: 'accountType', label: 'Account', dataType: DataType.ENUM },
    { name: 'phone', label: 'Phone', dataType: DataType.TEXT },
    { name: 'email', label: 'Email', dataType: DataType.TEXT },
    { name: 'creditLimit', label: 'Credit', dataType: DataType.NUMERIC },
  ];

  useEffect(() => {
    fetchCustomers();
    preloadColumnValues();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [primaryFilter, columnFilters, skip]);

  async function preloadColumnValues() {
    try {
      const [typeVals, accountVals] = await Promise.all([
        apiClient.getCustomerColumnValues('customerType'),
        apiClient.getCustomerColumnValues('accountType'),
      ]);
      setColumnValues((prev) => ({ ...prev, customerType: typeVals || [], accountType: accountVals || [] }));
    } catch (error) {
      console.error('Failed to load values:', error);
    }
  }

  async function fetchCustomers() {
    try {
      setLoading(true);
      const request: SearchRequestDto = { skip, take, primaryFilter, columnFilters: columnFilters.length > 0 ? columnFilters : undefined };
      const result = await apiClient.searchCustomers(request);
      setCustomers(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setLoading(false);
    }
  }

  const handlePrimarySearch = (value: string, operator: FilterOperator) => {
    setPrimaryFilter({ field: 'name', operator, value, dataType: DataType.TEXT });
    setSkip(0);
  };

  const handleColumnFilter = (columnName: string, operator: FilterOperator, value: any) => {
    const newFilter: FilterOperatorDto = {
      field: columnName,
      operator,
      value,
      dataType: columns.find((c) => c.name === columnName)?.dataType || DataType.TEXT,
    };
    const idx = columnFilters.findIndex((f) => f.field === columnName);
    if (idx >= 0) {
      const updated = [...columnFilters];
      updated[idx] = newFilter;
      setColumnFilters(updated);
    } else {
      setColumnFilters([...columnFilters, newFilter]);
    }
    setSkip(0);
  };

  const filterableColumns = columns.map((col) => ({ ...col, values: columnValues[col.name] }));

  async function handleAddCustomer() {
    try {
      await apiClient.createCustomer({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        creditLimit: parseInt(formData.creditLimit) || 0,
        accountType: formData.accountType,
        customerType: formData.customerType,
        cityId: formData.cityId,
      });
      setFormData({ name: '', phone: '', email: '', creditLimit: '', accountType: 'WALK_IN', customerType: 'WALK_IN', cityId: null, cityLabel: '' });
      setShowAddForm(false);
      await fetchCustomers();
      alert('✅ Customer created successfully!');
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>👥 Customers</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} style={styles.addBtn}>
          {showAddForm ? '❌ Cancel' : '➕ Add Customer'}
        </button>
      </div>

      {showAddForm && (
        <div style={styles.formContainer}>
          <input type="text" placeholder="Customer Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={styles.input} />
          <input type="tel" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={styles.input} />
          <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={styles.input} />
          <select value={formData.accountType} onChange={(e) => setFormData({...formData, accountType: e.target.value})} style={styles.input}>
            <option value="WALK_IN">Walk-in (no credit)</option>
            <option value="KHATA">Khata (credit)</option>
          </select>
          <select value={formData.customerType} onChange={(e) => setFormData({...formData, customerType: e.target.value})} style={styles.input} title="Customer nature/type">
            {CUSTOMER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="number" placeholder="Credit Limit" value={formData.creditLimit} onChange={(e) => setFormData({...formData, creditLimit: e.target.value})} style={styles.input} />
          <LocationPicker
            cityId={formData.cityId}
            valueLabel={formData.cityLabel}
            onChange={(city) => setFormData({...formData, cityId: city?.id ?? null, cityLabel: city?.name ?? ''})}
          />
          <button onClick={handleAddCustomer} style={styles.submitBtn}>Save</button>
        </div>
      )}
      <SearchBox onSearch={handlePrimarySearch} placeholder="Search by customer name..." />
      <FilterPanel columns={filterableColumns} onFilterApply={handleColumnFilter} />
      <FilterSummary
        primaryFilter={primaryFilter}
        columnFilters={columnFilters}
        onRemovePrimary={() => { setPrimaryFilter(undefined); setSkip(0); }}
        onRemoveColumn={(idx) => { setColumnFilters(prev => prev.filter((_, i) => i !== idx)); setSkip(0); }}
      />

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : customers.length === 0 ? (
        <p style={styles.noResults}>No customers found</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Account</th>
                  <th style={styles.th}>City</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Credit Limit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openCustomer(c)} title="Click to open">
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.td}><span style={getTypeStyle(c.customerType)}>{c.customerType}</span></td>
                    <td style={styles.td}><span style={getAccountTypeStyle(c.accountType)}>{c.accountType === 'KHATA' ? 'Khata' : 'Walk-in'}</span></td>
                    <td style={styles.td}>{c.city?.name ?? '—'}</td>
                    <td style={styles.td}>{c.phone}</td>
                    <td style={styles.td}>{c.email}</td>
                    <td style={styles.td}>Rs {c.creditLimit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.pagination}>
            <div style={styles.info}>Showing {skip + 1} to {Math.min(skip + take, total)} of {total}</div>
            <div style={styles.buttons}>
              <button onClick={() => setSkip(Math.max(0, skip - take))} disabled={skip === 0} style={{...styles.btn, ...(skip === 0 ? styles.disabled : {})}}>← Previous</button>
              <button onClick={() => setSkip(skip + take)} disabled={skip + take >= total} style={{...styles.btn, ...(skip + take >= total ? styles.disabled : {})}}>Next →</button>
            </div>
          </div>
        </>
      )}

      {selectedCustomer && (
        <div style={styles.overlay} onClick={() => setSelectedCustomer(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>{selectedCustomer.name}</h3>
              <button style={styles.closeBtn} onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>

            {editingCustomer ? (
              <div style={styles.editForm}>
                <input type="text" placeholder="Customer Name" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} style={styles.input} />
                <input type="tel" placeholder="Phone" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} style={styles.input} />
                <input type="email" placeholder="Email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} style={styles.input} />
                <select value={editFormData.accountType} onChange={(e) => setEditFormData({ ...editFormData, accountType: e.target.value })} style={styles.input}>
                  <option value="WALK_IN">Walk-in (no credit)</option>
                  <option value="KHATA">Khata (credit)</option>
                </select>
                <label style={styles.fieldLabel}>
                  Customer nature
                  <select value={editFormData.customerType} onChange={(e) => setEditFormData({ ...editFormData, customerType: e.target.value })} style={styles.input}>
                    {CUSTOMER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <input type="number" placeholder="Credit Limit" value={editFormData.creditLimit} onChange={(e) => setEditFormData({ ...editFormData, creditLimit: e.target.value })} style={styles.input} />
                <LocationPicker
                  cityId={editFormData.cityId}
                  valueLabel={editFormData.cityLabel}
                  onChange={(city) => setEditFormData({ ...editFormData, cityId: city?.id ?? null, cityLabel: city?.name ?? '' })}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button onClick={handleSaveEdit} disabled={savingEdit} style={styles.submitBtn}>{savingEdit ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => setEditingCustomer(false)} style={styles.btn}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={styles.kv}><strong>Type:</strong> {selectedCustomer.customerType}</div>
                <div style={styles.kv}><strong>Account:</strong> {selectedCustomer.accountType === 'KHATA' ? 'Khata (credit)' : 'Walk-in (no credit)'}</div>
                <div style={styles.kv}><strong>City:</strong> {selectedCustomer.city ? `${selectedCustomer.city.name}, ${selectedCustomer.city.province.name}` : '—'}</div>
                <div style={styles.kv}><strong>Phone:</strong> {selectedCustomer.phone || '—'}</div>
                <div style={styles.kv}><strong>Email:</strong> {selectedCustomer.email || '—'}</div>
                <div style={styles.kv}><strong>Credit limit:</strong> Rs {Number(selectedCustomer.creditLimit || 0).toLocaleString()}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={startEditCustomer} style={styles.btn}>✏️ Edit</button>
                  <button onClick={handleDeactivateCustomer} style={styles.dangerBtn}>🚫 Deactivate</button>
                </div>
              </>
            )}

            <h4 style={{ margin: '14px 0 6px' }}>Recent sales</h4>
            {custHistory === null ? (
              <p style={styles.info}>Loading…</p>
            ) : custHistory.length === 0 ? (
              <p style={styles.info}>No sales recorded for this customer yet.</p>
            ) : (
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Date</th><th style={styles.th}>Bill</th><th style={styles.th}>Amount</th></tr></thead>
                <tbody>
                  {custHistory.slice(0, 20).map((t: any, i: number) => (
                    <tr key={i}>
                      <td style={styles.td}>{t.date ? new Date(t.date).toLocaleDateString() : (t.bill_date ? new Date(t.bill_date).toLocaleDateString() : '—')}</td>
                      <td style={styles.td}>{t.billNumber ?? t.bill_number ?? t.invoiceNumber ?? '—'}</td>
                      <td style={styles.td}>Rs {Number(t.amount ?? t.total_amount ?? t.totalAmount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getAccountTypeStyle(accountType: string): React.CSSProperties {
  const base: React.CSSProperties = { padding: '4px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: '500' };
  if (accountType === 'KHATA') return { ...base, backgroundColor: '#fff3cd', color: '#856404' };
  return { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
}

function getTypeStyle(type: string): React.CSSProperties {
  const base: React.CSSProperties = { padding: '4px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: '500' };
  if (type === 'RETAILER') return { ...base, backgroundColor: '#d4edda', color: '#155724' };
  if (type === 'WHOLESALER') return { ...base, backgroundColor: '#d1ecf1', color: '#0c5460' };
  return { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'white', borderRadius: '8px', padding: '20px', width: 'min(640px, 92vw)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#666' },
  kv: { fontSize: '13px', padding: '3px 0' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#666' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  addBtn: { padding: '10px 20px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '600' },
  formContainer: { backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' },
  input: { flex: 1, minWidth: '150px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' },
  submitBtn: { padding: '10px 30px', backgroundColor: '#43e97b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  noResults: { textAlign: 'center', padding: '40px', color: '#999' },
  tableWrapper: { overflowX: 'auto', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' },
  th: { padding: '12px', backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left', fontSize: '12px', fontWeight: '600' },
  td: { padding: '10px 12px', fontSize: '13px', borderBottom: '1px solid #eee' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #eee' },
  info: { fontSize: '12px', color: '#666' },
  buttons: { display: 'flex', gap: '8px' },
  btn: { padding: '8px 16px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  dangerBtn: { padding: '8px 16px', backgroundColor: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  disabled: { backgroundColor: '#ccc', cursor: 'not-allowed' },
  editForm: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' },
};
