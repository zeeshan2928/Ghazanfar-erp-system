import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/api';
import { FilterOperator, DataType } from '../../types/filters';

interface Vendor { id: number; name: string; }
interface Warehouse { id: number; name: string; }
interface Product { id: number; name: string; }

interface ReturnItemRow {
  key: number;
  productId: number | null;
  productLabel: string;
  warehouseId: number | null;
  quantityReturned: string;
  unitCost: string;
}

interface PurchaseReturn {
  id: number;
  returnNumber: string;
  returnDate: string;
  returnAmount: number;
  vendor: Vendor;
  items: any[];
}

let rowKeySeq = 0;

export function PurchaseReturnsScreen() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [vendorId, setVendorId] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<ReturnItemRow[]>([]);
  const [saving, setSaving] = useState(false);

  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);

  useEffect(() => {
    fetchReturns();
    apiClient.getVendors(0, 500).then((r: any) => setVendors(r?.data ?? r ?? [])).catch(() => setVendors([]));
    apiClient.getWarehouses().then((r: any) => setWarehouses(r?.data ?? r ?? [])).catch(() => setWarehouses([]));
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [skip]);

  async function fetchReturns() {
    try {
      setLoading(true);
      const result = await apiClient.getPurchaseReturns(skip, take);
      setReturns(result.data ?? []);
      setTotal(result.total ?? 0);
    } catch (error) {
      console.error('Failed to load purchase returns:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openReturn(id: number) {
    setSelectedReturn({ loading: true });
    try {
      setSelectedReturn(await apiClient.getPurchaseReturnById(id));
    } catch {
      setSelectedReturn(null);
    }
  }

  function addItemRow() {
    setItems(prev => [...prev, { key: ++rowKeySeq, productId: null, productLabel: '', warehouseId: null, quantityReturned: '', unitCost: '' }]);
  }

  function removeItemRow(key: number) {
    setItems(prev => prev.filter(r => r.key !== key));
  }

  function updateItemRow(key: number, patch: Partial<ReturnItemRow>) {
    setItems(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));
  }

  function resetForm() {
    setVendorId('');
    setRemarks('');
    setItems([]);
    setShowAddForm(false);
  }

  async function handleSave() {
    if (!vendorId) { alert('Select a vendor'); return; }
    if (items.length === 0) { alert('Add at least one item'); return; }
    for (const it of items) {
      if (!it.productId || !it.warehouseId || !it.quantityReturned || !it.unitCost) {
        alert('Every item needs a product, warehouse, quantity, and unit cost');
        return;
      }
    }

    setSaving(true);
    try {
      await apiClient.createPurchaseReturn({
        vendorId,
        remarks: remarks || undefined,
        items: items.map(it => ({
          productId: it.productId,
          warehouseId: it.warehouseId,
          quantityReturned: Number(it.quantityReturned),
          unitCost: Number(it.unitCost),
        })),
      });
      alert('✅ Purchase return recorded');
      resetForm();
      await fetchReturns();
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>↩️ Purchase Returns</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} style={styles.addBtn}>
          {showAddForm ? '❌ Cancel' : '➕ New Return'}
        </button>
      </div>

      {showAddForm && (
        <div style={styles.formContainer}>
          <div style={styles.formRow}>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : '')} style={styles.input}>
              <option value="">Select vendor…</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <input type="text" placeholder="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ ...styles.input, flex: 2 }} />
          </div>

          <table style={styles.itemsTable}>
            <thead>
              <tr>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Warehouse</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Unit Cost (Rs)</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => (
                <ItemRow
                  key={row.key}
                  row={row}
                  warehouses={warehouses}
                  onChange={(patch) => updateItemRow(row.key, patch)}
                  onRemove={() => removeItemRow(row.key)}
                />
              ))}
            </tbody>
          </table>
          <button onClick={addItemRow} style={styles.btn}>➕ Add Item</button>

          <div style={{ marginTop: '12px' }}>
            <button onClick={handleSave} disabled={saving} style={styles.submitBtn}>{saving ? 'Saving…' : 'Save Return'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : returns.length === 0 ? (
        <p style={styles.noResults}>No purchase returns found</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Return #</th>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Items</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openReturn(r.id)} title="Click to open">
                    <td style={styles.td}>{r.returnNumber}</td>
                    <td style={styles.td}>{r.vendor?.name ?? '—'}</td>
                    <td style={styles.td}>{new Date(r.returnDate).toLocaleDateString()}</td>
                    <td style={styles.td}>Rs {(Number(r.returnAmount ?? 0) / 100).toLocaleString()}</td>
                    <td style={styles.td}>{r.items?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.pagination}>
            <div style={styles.info}>Showing {skip + 1} to {Math.min(skip + take, total)} of {total}</div>
            <div style={styles.buttons}>
              <button onClick={() => setSkip(Math.max(0, skip - take))} disabled={skip === 0} style={{ ...styles.btn, ...(skip === 0 ? styles.disabled : {}) }}>← Previous</button>
              <button onClick={() => setSkip(skip + take)} disabled={skip + take >= total} style={{ ...styles.btn, ...(skip + take >= total ? styles.disabled : {}) }}>Next →</button>
            </div>
          </div>
        </>
      )}

      {selectedReturn && (
        <div style={styles.overlay} onClick={() => setSelectedReturn(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {selectedReturn.loading ? (
              <p style={styles.loading}>Loading…</p>
            ) : (
              <>
                <div style={styles.modalHeader}>
                  <h3 style={{ margin: 0 }}>{selectedReturn.returnNumber}</h3>
                  <button style={styles.closeBtn} onClick={() => setSelectedReturn(null)}>✕</button>
                </div>
                <div style={styles.kv}><strong>Vendor:</strong> {selectedReturn.vendor?.name ?? '—'}</div>
                <div style={styles.kv}><strong>Date:</strong> {new Date(selectedReturn.returnDate).toLocaleDateString()}</div>
                <div style={styles.kv}><strong>Total:</strong> Rs {(Number(selectedReturn.returnAmount ?? 0) / 100).toLocaleString()}</div>
                {selectedReturn.purchaseOrder && (
                  <div style={styles.kv}><strong>Linked PO:</strong> {selectedReturn.purchaseOrder.po_number}</div>
                )}
                {selectedReturn.remarks && <div style={styles.kv}><strong>Remarks:</strong> {selectedReturn.remarks}</div>}
                <table style={styles.table}>
                  <thead><tr><th style={styles.th}>Product</th><th style={styles.th}>Warehouse</th><th style={styles.th}>Qty</th><th style={styles.th}>Unit Cost</th></tr></thead>
                  <tbody>
                    {(selectedReturn.items ?? []).map((it: any, i: number) => (
                      <tr key={i}>
                        <td style={styles.td}>{it.product?.name ?? it.productId}</td>
                        <td style={styles.td}>{it.warehouse?.name ?? '—'}</td>
                        <td style={styles.td}>{it.quantityReturned}</td>
                        <td style={styles.td}>Rs {(Number(it.unitCost ?? 0) / 100).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline product typeahead - same debounced search-and-pick pattern as
// LocationPicker, sized down for a single row's product cell (this catalog
// has 2500+ products, too many for a plain <select>).
function ItemRow({
  row,
  warehouses,
  onChange,
  onRemove,
}: {
  row: ReturnItemRow;
  warehouses: Warehouse[];
  onChange: (patch: Partial<ReturnItemRow>) => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState(row.productLabel);
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleQueryChange(next: string) {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.searchProducts({
          skip: 0,
          take: 15,
          primaryFilter: { field: 'name', operator: FilterOperator.CONTAINS, value: next.trim(), dataType: DataType.TEXT },
        });
        setResults(res?.data ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
  }

  return (
    <tr>
      <td style={styles.td}>
        <div ref={boxRef} style={{ position: 'relative' }}>
          <input
            style={styles.input}
            value={query}
            placeholder="Type to search product…"
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => { if (results.length) setOpen(true); }}
          />
          {open && results.length > 0 && (
            <div style={styles.dropdown}>
              {results.map((p) => (
                <div
                  key={p.id}
                  style={styles.option}
                  onMouseDown={() => {
                    onChange({ productId: p.id, productLabel: p.name });
                    setQuery(p.name);
                    setOpen(false);
                  }}
                >
                  {p.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
      <td style={styles.td}>
        <select value={row.warehouseId ?? ''} onChange={(e) => onChange({ warehouseId: e.target.value ? Number(e.target.value) : null })} style={styles.input}>
          <option value="">Warehouse…</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </td>
      <td style={styles.td}>
        <input type="number" min="0" value={row.quantityReturned} onChange={(e) => onChange({ quantityReturned: e.target.value })} style={{ ...styles.input, width: '80px' }} />
      </td>
      <td style={styles.td}>
        <input type="number" min="0" step="0.01" value={row.unitCost} onChange={(e) => onChange({ unitCost: e.target.value })} style={{ ...styles.input, width: '100px' }} />
      </td>
      <td style={styles.td}>
        <button onClick={onRemove} style={styles.dangerBtn}>✕</button>
      </td>
    </tr>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'white', borderRadius: '8px', padding: '20px', width: 'min(640px, 92vw)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#666' },
  kv: { fontSize: '13px', padding: '3px 0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  addBtn: { padding: '10px 20px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '600' },
  formContainer: { backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' },
  formRow: { display: 'flex', gap: '10px', marginBottom: '12px' },
  input: { flex: 1, minWidth: '120px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' },
  itemsTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '10px' },
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
  dangerBtn: { padding: '6px 10px', backgroundColor: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  disabled: { backgroundColor: '#ccc', cursor: 'not-allowed' },
  dropdown: { position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.12)' },
  option: { padding: '6px 10px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' },
};
