import React, { useState, useEffect } from 'react';
import { SearchBox } from '../filters/SearchBox';
import { FilterPanel } from '../filters/FilterPanel';
import { FilterSummary } from '../filters/FilterSummary';
import { FilterOperator, DataType, FilterOperatorDto, SearchRequestDto, ColumnValueDto } from '../../types/filters';
import { apiClient } from '../../services/api';

interface Customer {
  id: number;
  name: string;
  customerType: string;
  phone: string;
  email: string;
  creditLimit: number;
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
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', creditLimit: '' });

  const columns = [
    { name: 'name', label: 'Name', dataType: DataType.TEXT },
    { name: 'customerType', label: 'Type', dataType: DataType.ENUM },
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
      const [typeVals] = await Promise.all([
        apiClient.getCustomerColumnValues('customerType'),
      ]);
      setColumnValues((prev) => ({ ...prev, customerType: typeVals || [] }));
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
      });
      setFormData({ name: '', phone: '', email: '', creditLimit: '' });
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
          <input type="number" placeholder="Credit Limit" value={formData.creditLimit} onChange={(e) => setFormData({...formData, creditLimit: e.target.value})} style={styles.input} />
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
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Credit Limit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.td}><span style={getTypeStyle(c.customerType)}>{c.customerType}</span></td>
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
    </div>
  );
}

function getTypeStyle(type: string): React.CSSProperties {
  const base: React.CSSProperties = { padding: '4px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: '500' };
  if (type === 'RETAILER') return { ...base, backgroundColor: '#d4edda', color: '#155724' };
  if (type === 'WHOLESALER') return { ...base, backgroundColor: '#d1ecf1', color: '#0c5460' };
  return { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
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
  disabled: { backgroundColor: '#ccc', cursor: 'not-allowed' },
};
