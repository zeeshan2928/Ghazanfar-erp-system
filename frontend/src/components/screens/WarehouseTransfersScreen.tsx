import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface Warehouse {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  code: string;
}

interface TransferItem {
  productId: number;
  quantity: number;
  quantity_received?: number;
}

interface Transfer {
  id: number;
  transfer_number: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  transfer_date: string;
  remarks: string | null;
  from_warehouse: Warehouse;
  to_warehouse: Warehouse;
  items: TransferItem[];
}

interface DraftLine {
  productId: number | '';
  quantity: string;
}

export function WarehouseTransfersScreen() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pending, setPending] = useState<Transfer[]>([]);
  const [inTransit, setInTransit] = useState<Transfer[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState<number | ''>('');
  const [toWarehouseId, setToWarehouseId] = useState<number | ''>('');
  const [lines, setLines] = useState<DraftLine[]>([{ productId: '', quantity: '' }]);
  const [remarks, setRemarks] = useState('');

  const [receivingTransfer, setReceivingTransfer] = useState<Transfer | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, string>>({});
  const [receiveRemarks, setReceiveRemarks] = useState('');

  const [printingTransfer, setPrintingTransfer] = useState<Transfer | null>(null);

  useEffect(() => {
    loadReferenceData();
    loadTransfers();
  }, []);

  async function loadReferenceData() {
    try {
      const [whRes, prodRes] = await Promise.all([
        apiClient.getWarehouses(),
        apiClient.searchProducts({ skip: 0, take: 500 }),
      ]);
      setWarehouses(Array.isArray(whRes) ? whRes : whRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Failed to load warehouses/products', err);
    }
  }

  async function loadTransfers() {
    try {
      const [pendingRes, inTransitRes] = await Promise.all([
        apiClient.getPendingTransfers(0, 50),
        apiClient.getInTransitTransfers(0, 50),
      ]);
      setPending(pendingRes.data || []);
      setInTransit(inTransitRes.data || []);
    } catch (err) {
      console.error('Failed to load transfers', err);
    }
  }

  function updateLine(index: number, field: keyof DraftLine, value: any) {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  }

  function addLine() {
    setLines([...lines, { productId: '', quantity: '' }]);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  function resetForm() {
    setFromWarehouseId('');
    setToWarehouseId('');
    setLines([{ productId: '', quantity: '' }]);
    setRemarks('');
  }

  async function submitTransfer() {
    setError('');
    if (!fromWarehouseId || !toWarehouseId) {
      setError('Select both source and destination warehouses');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      setError('Source and destination must be different warehouses');
      return;
    }
    if (lines.length === 0 || lines.some(l => !l.productId || !l.quantity)) {
      setError('Every line needs a product and a quantity');
      return;
    }

    try {
      await apiClient.createWarehouseTransfer({
        fromWarehouseId,
        toWarehouseId,
        items: lines.map(l => ({ productId: l.productId, quantity: Number(l.quantity) })),
        remarks: remarks || undefined,
      });
      setSuccess('Transfer created - stock reserved at source warehouse');
      setTimeout(() => setSuccess(''), 2500);
      resetForm();
      setShowForm(false);
      loadTransfers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create transfer');
    }
  }

  async function handleStart(id: number) {
    setError('');
    try {
      await apiClient.startTransfer(id);
      setSuccess('Transfer dispatched - now in transit');
      setTimeout(() => setSuccess(''), 2500);
      loadTransfers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start transfer');
    }
  }

  function openReceiveForm(transfer: Transfer) {
    setReceivingTransfer(transfer);
    const initial: Record<number, string> = {};
    transfer.items.forEach(item => { initial[item.productId] = String(item.quantity); });
    setReceiveQuantities(initial);
    setReceiveRemarks('');
  }

  async function submitReceive() {
    if (!receivingTransfer) return;
    setError('');
    try {
      await apiClient.confirmTransferReceipt(
        receivingTransfer.id,
        receivingTransfer.items.map(item => ({
          productId: item.productId,
          quantity_received: Number(receiveQuantities[item.productId] || 0),
        })),
        receiveRemarks || undefined,
      );
      setSuccess('Receipt confirmed - stock moved into destination warehouse');
      setTimeout(() => setSuccess(''), 2500);
      setReceivingTransfer(null);
      loadTransfers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm receipt');
    }
  }

  async function handleReject(id: number) {
    const reason = window.prompt('Reason for rejecting this transfer:');
    if (!reason) return;
    try {
      await apiClient.rejectTransfer(id, reason);
      setSuccess('Transfer rejected - stock released back at source');
      setTimeout(() => setSuccess(''), 2500);
      loadTransfers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject transfer');
    }
  }

  function productLabel(id: number): string {
    const p = products.find(pr => pr.id === id);
    return p ? `${p.code} - ${p.name}` : `Product #${id}`;
  }

  function warehouseName(id: number): string {
    return warehouses.find(w => w.id === id)?.name || `Warehouse #${id}`;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>🔄 Warehouse Transfers</h2>
        <button style={styles.primaryBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Transfer'}
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {success && <div style={styles.successBanner}>{success}</div>}

      {showForm && (
        <div style={styles.card}>
          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>From Warehouse *</label>
              <select style={styles.input} value={fromWarehouseId} onChange={e => setFromWarehouseId(e.target.value ? parseInt(e.target.value, 10) : '')}>
                <option value="">Select warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>To Warehouse *</label>
              <select style={styles.input} value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value ? parseInt(e.target.value, 10) : '')}>
                <option value="">Select warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Quantity</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>
                    <select style={styles.input} value={line.productId} onChange={e => updateLine(idx, 'productId', e.target.value ? parseInt(e.target.value, 10) : '')}>
                      <option value="">Select product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                    </select>
                  </td>
                  <td style={styles.td}>
                    <input style={styles.inputNarrow} type="number" min={1} value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} />
                  </td>
                  <td style={styles.td}>
                    <button style={styles.dangerBtn} onClick={() => removeLine(idx)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button style={styles.smallBtn} onClick={addLine}>+ Add line</button>

          <div style={{ ...styles.field, marginTop: '12px' }}>
            <label style={styles.label}>Remarks</label>
            <input style={styles.input} value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>

          <button style={{ ...styles.primaryBtn, marginTop: '12px' }} onClick={submitTransfer}>Create Transfer</button>
        </div>
      )}

      <div style={styles.columns}>
        <div style={styles.column}>
          <h3 style={styles.h3}>Pending (stock reserved, not yet dispatched)</h3>
          {pending.length === 0 ? (
            <p style={styles.emptyState}>No pending transfers</p>
          ) : (
            pending.map(t => (
              <div key={t.id} style={styles.transferCard}>
                <div style={styles.transferHeader}>
                  <strong>{t.transfer_number}</strong>
                  <span style={styles.badgePending}>PENDING</span>
                </div>
                <div style={styles.transferMeta}>{warehouseName(t.from_warehouse.id)} → {warehouseName(t.to_warehouse.id)}</div>
                <ul style={styles.itemList}>
                  {t.items.map((item, i) => <li key={i}>{productLabel(item.productId)} × {item.quantity}</li>)}
                </ul>
                <button style={styles.primaryBtn} onClick={() => handleStart(t.id)}>Dispatch</button>
              </div>
            ))
          )}
        </div>

        <div style={styles.column}>
          <h3 style={styles.h3}>In Transit (awaiting receipt confirmation)</h3>
          {inTransit.length === 0 ? (
            <p style={styles.emptyState}>No transfers in transit</p>
          ) : (
            inTransit.map(t => (
              <div key={t.id} style={styles.transferCard}>
                <div style={styles.transferHeader}>
                  <strong>{t.transfer_number}</strong>
                  <span style={styles.badgeTransit}>IN TRANSIT</span>
                </div>
                <div style={styles.transferMeta}>{warehouseName(t.from_warehouse.id)} → {warehouseName(t.to_warehouse.id)}</div>
                <ul style={styles.itemList}>
                  {t.items.map((item, i) => <li key={i}>{productLabel(item.productId)} × {item.quantity}</li>)}
                </ul>
                <div style={styles.inlineRow}>
                  <button style={styles.primaryBtn} onClick={() => openReceiveForm(t)}>Confirm Receipt</button>
                  <button style={styles.smallBtn} onClick={() => setPrintingTransfer(t)}>Print Slip</button>
                  <button style={styles.dangerBtn} onClick={() => handleReject(t.id)}>Reject</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {receivingTransfer && (
        <div style={styles.popupOverlay} onClick={() => setReceivingTransfer(null)}>
          <div style={styles.popup} onClick={e => e.stopPropagation()}>
            <h4 style={styles.popupTitle}>Confirm receipt - {receivingTransfer.transfer_number}</h4>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Sent</th>
                  <th style={styles.th}>Received</th>
                </tr>
              </thead>
              <tbody>
                {receivingTransfer.items.map((item, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{productLabel(item.productId)}</td>
                    <td style={styles.td}>{item.quantity}</td>
                    <td style={styles.td}>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        value={receiveQuantities[item.productId] ?? ''}
                        onChange={e => setReceiveQuantities({ ...receiveQuantities, [item.productId]: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.field}>
              <label style={styles.label}>Remarks (e.g. damage/shortage notes)</label>
              <input style={styles.input} value={receiveRemarks} onChange={e => setReceiveRemarks(e.target.value)} />
            </div>
            <div style={styles.inlineRow}>
              <button style={styles.primaryBtn} onClick={submitReceive}>Confirm</button>
              <button style={styles.smallBtn} onClick={() => setReceivingTransfer(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {printingTransfer && (
        <div style={styles.popupOverlay}>
          <div style={styles.popup}>
            <h4 style={styles.popupTitle}>Print transfer slip - {printingTransfer.transfer_number}</h4>
            <div style={styles.inlineRow}>
              <button style={styles.primaryBtn} onClick={() => window.print()}>Print</button>
              <button style={styles.smallBtn} onClick={() => setPrintingTransfer(null)}>Close</button>
            </div>
          </div>

          <div id="print-area" style={styles.printAreaHidden}>
            <TransferSlipDocument
              transfer={printingTransfer}
              fromName={warehouseName(printingTransfer.from_warehouse.id)}
              toName={warehouseName(printingTransfer.to_warehouse.id)}
              productLabel={productLabel}
            />
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
        }
      `}</style>
    </div>
  );
}

function TransferSlipDocument({
  transfer,
  fromName,
  toName,
  productLabel,
}: {
  transfer: Transfer;
  fromName: string;
  toName: string;
  productLabel: (id: number) => string;
}) {
  const Copy = ({ heading }: { heading: string }) => (
    <div style={printStyles.copy}>
      <h3 style={printStyles.heading}>{heading}</h3>
      <p style={printStyles.meta}>Transfer #: {transfer.transfer_number}</p>
      <p style={printStyles.meta}>From: {fromName}</p>
      <p style={printStyles.meta}>To: {toName}</p>
      <p style={printStyles.meta}>Date: {new Date(transfer.transfer_date).toLocaleDateString()}</p>
      <table style={printStyles.table}>
        <thead>
          <tr>
            <th style={printStyles.th}>Product</th>
            <th style={printStyles.th}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {transfer.items.map((item, i) => (
            <tr key={i}>
              <td style={printStyles.td}>{productLabel(item.productId)}</td>
              <td style={printStyles.td}>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <Copy heading="WAREHOUSE COPY" />
      <div style={printStyles.pageBreak} />
      <Copy heading="OFFICE COPY" />

      <style>{`@page { size: A5; margin: 10mm; }`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: '1300px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  h2: { margin: 0 },
  h3: { margin: '0 0 10px', fontSize: '15px' },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' },
  successBanner: { background: '#d4edda', color: '#155724', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' },
  card: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '18px', marginBottom: '16px' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#555' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', width: '100%' },
  inputNarrow: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', width: '90px' },
  primaryBtn: { padding: '10px 18px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  smallBtn: { padding: '6px 12px', background: 'white', color: '#667eea', border: '1px solid #667eea', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  dangerBtn: { padding: '8px 14px', background: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  inlineRow: { display: 'flex', gap: '8px', marginTop: '10px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '8px', background: '#f5f5f5', textAlign: 'left', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #ddd' },
  td: { padding: '8px', fontSize: '13px', borderBottom: '1px solid #eee' },
  columns: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  column: {},
  emptyState: { color: '#888', padding: '16px', textAlign: 'center', background: 'white', border: '1px solid #eee', borderRadius: '8px' },
  transferCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '14px', marginBottom: '12px' },
  transferHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  transferMeta: { fontSize: '13px', color: '#555', marginBottom: '8px' },
  itemList: { fontSize: '13px', color: '#333', margin: '0 0 10px', paddingLeft: '18px' },
  badgePending: { background: '#fff3cd', color: '#856404', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 },
  badgeTransit: { background: '#cfe2ff', color: '#084298', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 },
  popupOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  popup: { background: 'white', borderRadius: '8px', padding: '20px', width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' },
  popupTitle: { marginTop: 0 },
  printAreaHidden: { display: 'none' },
};

const printStyles: Record<string, React.CSSProperties> = {
  copy: { width: '78mm', fontFamily: 'monospace', fontSize: '12px' },
  heading: { textAlign: 'center', margin: '0 0 8px' },
  meta: { margin: '2px 0' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  th: { textAlign: 'left', borderBottom: '1px solid #000', padding: '4px 2px' },
  td: { padding: '4px 2px', borderBottom: '1px dashed #999' },
  pageBreak: { pageBreakAfter: 'always' as any, height: 0 },
};
