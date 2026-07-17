import React, { useState, useEffect } from 'react';
import { SearchBox } from '../filters/SearchBox';
import { FilterPanel } from '../filters/FilterPanel';
import { FilterSummary } from '../filters/FilterSummary';
import { FilterOperator, DataType, FilterOperatorDto, SearchRequestDto, ColumnValueDto } from '../../types/filters';
import { apiClient } from '../../services/api';

interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_name: string;
  status: string;
  created_date: string;
  amount: number;
  expected_delivery_date: string;
}

export function PurchaseOrdersScreen() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);
  const [primaryFilter, setPrimaryFilter] = useState<FilterOperatorDto | undefined>();
  const [columnFilters, setColumnFilters] = useState<FilterOperatorDto[]>([]);
  const [columnValues, setColumnValues] = useState<Record<string, ColumnValueDto[]>>({});
  // Click a PO row to open its detail (click-to-open, per the founding vision).
  const [poDetail, setPoDetail] = useState<any | null>(null);
  const [poLoading, setPoLoading] = useState(false);

  async function openPo(id: number) {
    setPoDetail({ loading: true });
    setPoLoading(true);
    try { setPoDetail(await apiClient.getPurchaseOrderById(id)); }
    catch { setPoDetail(null); }
    finally { setPoLoading(false); }
  }

  const columns = [
    { name: 'po_number', label: 'PO #', dataType: DataType.TEXT },
    { name: 'vendor_name', label: 'Vendor', dataType: DataType.TEXT },
    { name: 'status', label: 'Status', dataType: DataType.ENUM },
    { name: 'amount', label: 'Amount', dataType: DataType.NUMERIC },
    { name: 'created_date', label: 'Created', dataType: DataType.DATE },
  ];

  useEffect(() => {
    fetchOrders();
    preloadColumnValues();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [primaryFilter, columnFilters, skip]);

  async function preloadColumnValues() {
    try {
      const [statusVals, vendorVals] = await Promise.all([
        apiClient.getPurchaseOrderColumnValues('status'),
        apiClient.getPurchaseOrderColumnValues('vendor_name'),
      ]);
      setColumnValues((prev) => ({ ...prev, status: statusVals || [], vendor_name: vendorVals || [] }));
    } catch (error) {
      console.error('Failed to load values:', error);
    }
  }

  async function fetchOrders() {
    try {
      setLoading(true);
      const request: SearchRequestDto = { skip, take, primaryFilter, columnFilters: columnFilters.length > 0 ? columnFilters : undefined };
      const result = await apiClient.searchPurchaseOrders(request);
      setOrders(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setLoading(false);
    }
  }

  const handlePrimarySearch = (value: string, operator: FilterOperator) => {
    setPrimaryFilter({ field: 'po_number', operator, value, dataType: DataType.TEXT });
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

  return (
    <div style={styles.container}>
      <h2>📋 Purchase Orders</h2>
      <SearchBox onSearch={handlePrimarySearch} placeholder="Search by PO number..." />
      <FilterPanel columns={filterableColumns} onFilterApply={handleColumnFilter} />
      <FilterSummary
        primaryFilter={primaryFilter}
        columnFilters={columnFilters}
        onRemovePrimary={() => { setPrimaryFilter(undefined); setSkip(0); }}
        onRemoveColumn={(idx) => { setColumnFilters(prev => prev.filter((_, i) => i !== idx)); setSkip(0); }}
      />

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : orders.length === 0 ? (
        <p style={styles.noResults}>No purchase orders found</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>PO #</th>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Expected Delivery</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => openPo(o.id)} title="Click to open">
                    <td style={styles.td}>{o.po_number}</td>
                    <td style={styles.td}>{o.vendor_name}</td>
                    <td style={styles.td}><span style={getStatusStyle(o.status)}>{o.status}</span></td>
                    <td style={styles.td}>Rs {o.amount.toLocaleString()}</td>
                    <td style={styles.td}>{new Date(o.created_date).toLocaleDateString()}</td>
                    <td style={styles.td}>{o.expected_delivery_date !== 'N/A' ? new Date(o.expected_delivery_date).toLocaleDateString() : 'N/A'}</td>
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

      {poDetail && (
        <div style={styles.overlay} onClick={() => setPoDetail(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {poLoading || poDetail.loading ? (
              <p style={styles.loading}>Loading…</p>
            ) : (
              <>
                <div style={styles.modalHeader}>
                  <h3 style={{ margin: 0 }}>PO {poDetail.po_number ?? poDetail.poNumber ?? poDetail.id}</h3>
                  <button style={styles.closeBtn} onClick={() => setPoDetail(null)}>✕</button>
                </div>
                <div style={styles.kv}><strong>Vendor:</strong> {poDetail.vendor?.name ?? poDetail.vendor_name ?? '—'}</div>
                <div style={styles.kv}><strong>Status:</strong> {poDetail.status}</div>
                <div style={styles.kv}><strong>Amount:</strong> Rs {Number(poDetail.po_amount ?? poDetail.amount ?? 0).toLocaleString()}</div>
                {Array.isArray(poDetail.PurchaseOrderItem ?? poDetail.items) && (
                  <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Product</th><th style={styles.th}>Ordered</th><th style={styles.th}>Received</th></tr></thead>
                    <tbody>
                      {(poDetail.PurchaseOrderItem ?? poDetail.items).map((it: any, i: number) => (
                        <tr key={i}>
                          <td style={styles.td}>{it.product?.name ?? it.productName ?? it.productId}</td>
                          <td style={styles.td}>{it.quantity_ordered ?? it.quantityOrdered}</td>
                          <td style={styles.td}>{it.quantity_received ?? it.quantityReceived ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = { padding: '4px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: '500' };
  if (status === 'APPROVED') return { ...base, backgroundColor: '#d4edda', color: '#155724' };
  if (status === 'PENDING') return { ...base, backgroundColor: '#fff3cd', color: '#856404' };
  if (status === 'RECEIVED') return { ...base, backgroundColor: '#d1ecf1', color: '#0c5460' };
  return { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'white', borderRadius: '8px', padding: '20px', width: 'min(640px, 92vw)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#666' },
  kv: { fontSize: '13px', padding: '3px 0' },
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
