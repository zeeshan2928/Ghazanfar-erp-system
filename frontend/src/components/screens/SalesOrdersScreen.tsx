import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

// Optional, secondary to direct invoicing - this business creates most sales
// as a direct Bill via InvoiceScreen. A Sales Order only exists to record a
// quote/order before it's confirmed, then gets converted into a real invoice
// (same reservation + gate-pass pipeline as a direct invoice - see
// SalesOrdersService.convertToInvoice on the backend).

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface Salesman {
  id: number;
  firstName: string;
  lastName: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  code: string;
}

interface SalesOrderLine {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: { name: string; code: string };
}

interface SalesOrder {
  id: number;
  orderNumber: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CONVERTED' | 'CANCELLED';
  orderDate: string;
  remarks?: string | null;
  convertedBillId?: number | null;
  customer?: { name: string; phone: string };
  lines: SalesOrderLine[];
}

interface DraftLine {
  productId: number | '';
  quantity: number;
  unitPrice: number;
}

export function SalesOrdersScreen() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [draftLines, setDraftLines] = useState<DraftLine[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);

  const [convertingOrder, setConvertingOrder] = useState<SalesOrder | null>(null);
  const [convertChannel, setConvertChannel] = useState('COUNTER');
  const [convertSalesmanId, setConvertSalesmanId] = useState<number | ''>('');
  const [convertCustomerPhone, setConvertCustomerPhone] = useState('');
  const [convertWarehouseByLine, setConvertWarehouseByLine] = useState<Record<number, number | ''>>({});
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    loadOrders();
    loadReferenceData();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const result = await apiClient.getSalesOrders();
      setOrders(result || []);
    } catch (err) {
      console.error('Failed to load sales orders', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadReferenceData() {
    try {
      const [custRes, userRes, whRes, prodRes] = await Promise.all([
        apiClient.searchCustomers({ skip: 0, take: 200 }),
        apiClient.getUsers(0, 200, undefined, 'SALESMAN'),
        apiClient.getWarehouses(),
        apiClient.searchProducts({ skip: 0, take: 500 }),
      ]);
      setCustomers(custRes.data || []);
      setSalesmen(userRes.data || userRes || []);
      setWarehouses(Array.isArray(whRes) ? whRes : whRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Failed to load reference data', err);
    }
  }

  function addDraftLine() {
    setDraftLines(lines => [...lines, { productId: '', quantity: 1, unitPrice: 0 }]);
  }

  function updateDraftLine(index: number, patch: Partial<DraftLine>) {
    setDraftLines(lines => lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeDraftLine(index: number) {
    setDraftLines(lines => lines.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (!customerId) {
      alert('Select a customer');
      return;
    }
    const lines = draftLines.filter(l => l.productId);
    if (lines.length === 0) {
      alert('Add at least one product line');
      return;
    }
    setSaving(true);
    try {
      await apiClient.createSalesOrder({
        customerId,
        remarks: remarks || undefined,
        lines: lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
      });
      setShowCreateForm(false);
      setCustomerId('');
      setRemarks('');
      setDraftLines([{ productId: '', quantity: 1, unitPrice: 0 }]);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create sales order');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(order: SalesOrder) {
    if (!confirm(`Cancel sales order ${order.orderNumber}?`)) return;
    try {
      await apiClient.cancelSalesOrder(order.id);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel sales order');
    }
  }

  function openConvertDialog(order: SalesOrder) {
    setConvertingOrder(order);
    setConvertChannel('COUNTER');
    setConvertSalesmanId('');
    setConvertCustomerPhone(order.customer?.phone || '');
    const initial: Record<number, number | ''> = {};
    order.lines.forEach(l => { initial[l.id] = ''; });
    setConvertWarehouseByLine(initial);
  }

  async function handleConvert() {
    if (!convertingOrder) return;
    const lineWarehouses = convertingOrder.lines.map(l => ({
      salesOrderLineId: l.id,
      warehouseId: convertWarehouseByLine[l.id],
    }));
    if (lineWarehouses.some(lw => !lw.warehouseId)) {
      alert('Select a warehouse for every line');
      return;
    }
    setConverting(true);
    try {
      const bill = await apiClient.convertSalesOrderToInvoice(convertingOrder.id, {
        channel: convertChannel,
        salesmanId: convertSalesmanId || undefined,
        customerPhone: convertCustomerPhone || undefined,
        lineWarehouses,
      });
      alert(`Converted to invoice ${bill.bill_number}`);
      setConvertingOrder(null);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert to invoice');
    } finally {
      setConverting(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Sales Orders</h2>
        <button style={styles.primaryBtn} onClick={() => setShowCreateForm(true)}>+ New Sales Order</button>
      </div>

      {showCreateForm && (
        <div style={styles.card}>
          <h4>New Sales Order</h4>
          <div style={styles.formRow}>
            <label style={styles.label}>Customer</label>
            <select style={styles.input} value={customerId} onChange={e => setCustomerId(e.target.value ? parseInt(e.target.value, 10) : '')}>
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Remarks</label>
            <input style={styles.input} value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>

          <h5>Lines</h5>
          {draftLines.map((line, i) => (
            <div key={i} style={styles.lineRow}>
              <select
                style={styles.lineSelect}
                value={line.productId}
                onChange={e => updateDraftLine(i, { productId: e.target.value ? parseInt(e.target.value, 10) : '' })}
              >
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
              <input
                style={styles.lineNumberInput}
                type="number"
                min={1}
                value={line.quantity}
                onChange={e => updateDraftLine(i, { quantity: parseInt(e.target.value, 10) || 1 })}
                placeholder="Qty"
              />
              <input
                style={styles.lineNumberInput}
                type="number"
                min={0}
                value={line.unitPrice}
                onChange={e => updateDraftLine(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                placeholder="Unit price"
              />
              <button style={styles.smallBtn} onClick={() => removeDraftLine(i)}>Remove</button>
            </div>
          ))}
          <button style={styles.smallBtn} onClick={addDraftLine}>+ Add line</button>

          <div style={styles.formActions}>
            <button style={styles.primaryBtn} onClick={handleCreate} disabled={saving}>
              {saving ? 'Saving...' : 'Save Sales Order'}
            </button>
            <button style={styles.smallBtn} onClick={() => setShowCreateForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Order #</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Lines</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td style={styles.td}>{order.orderNumber}</td>
                <td style={styles.td}>{order.customer?.name}</td>
                <td style={styles.td}>{order.status}</td>
                <td style={styles.td}>{order.orderDate.split('T')[0]}</td>
                <td style={styles.td}>{order.lines.length}</td>
                <td style={styles.td}>
                  {(order.status === 'DRAFT' || order.status === 'CONFIRMED') && (
                    <>
                      <button style={styles.smallBtn} onClick={() => openConvertDialog(order)}>Convert to Invoice</button>
                      <button style={styles.smallBtn} onClick={() => handleCancel(order)}>Cancel</button>
                    </>
                  )}
                  {order.status === 'CONVERTED' && <span>Bill #{order.convertedBillId}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {convertingOrder && (
        <div style={styles.popupOverlay}>
          <div style={styles.popup}>
            <h4>Convert {convertingOrder.orderNumber} to Invoice</h4>
            <div style={styles.formRow}>
              <label style={styles.label}>Channel</label>
              <select style={styles.input} value={convertChannel} onChange={e => setConvertChannel(e.target.value)}>
                <option value="COUNTER">Counter</option>
                <option value="WEBSITE">Website</option>
                <option value="PHONE">Phone</option>
                <option value="BULK">Bulk</option>
              </select>
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Salesman</label>
              <select style={styles.input} value={convertSalesmanId} onChange={e => setConvertSalesmanId(e.target.value ? parseInt(e.target.value, 10) : '')}>
                <option value="">Select salesman...</option>
                {salesmen.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Customer phone</label>
              <input style={styles.input} value={convertCustomerPhone} onChange={e => setConvertCustomerPhone(e.target.value)} />
            </div>

            <h5>Warehouse per line</h5>
            {convertingOrder.lines.map(line => (
              <div key={line.id} style={styles.formRow}>
                <label style={styles.label}>{line.product?.name || `Line ${line.id}`} (x{line.quantity})</label>
                <select
                  style={styles.input}
                  value={convertWarehouseByLine[line.id] || ''}
                  onChange={e => setConvertWarehouseByLine(prev => ({ ...prev, [line.id]: e.target.value ? parseInt(e.target.value, 10) : '' }))}
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            ))}

            <div style={styles.formActions}>
              <button style={styles.primaryBtn} onClick={handleConvert} disabled={converting}>
                {converting ? 'Converting...' : 'Convert to Invoice'}
              </button>
              <button style={styles.smallBtn} onClick={() => setConvertingOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  h2: { margin: 0 },
  card: { background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '20px' },
  formRow: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', maxWidth: '400px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#444' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' },
  lineRow: { display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' },
  lineSelect: { flex: 2, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
  lineNumberInput: { flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '90px' },
  formActions: { display: 'flex', gap: '8px', marginTop: '12px' },
  primaryBtn: { background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 },
  smallBtn: { background: '#eee', border: '1px solid #ccc', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', marginRight: '6px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '13px', color: '#555' },
  td: { borderBottom: '1px solid #eee', padding: '8px', fontSize: '14px' },
  popupOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  popup: { background: 'white', borderRadius: '8px', padding: '20px', width: '480px', maxHeight: '80vh', overflowY: 'auto' },
};
