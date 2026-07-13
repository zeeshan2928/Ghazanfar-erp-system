import React, { useRef, useState, useEffect } from 'react';
import { useModalKeyboard } from '../../utils/keyboardNav';
import { apiClient } from '../../services/api';

interface BillLineDetail {
  id?: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  product?: { name: string; code: string };
}

interface GatePassDetail {
  id: number;
  gate_pass_number: string;
  status: string;
  warehouse?: { name: string };
}

interface BillDetail {
  id: number;
  bill_number: string;
  bill_date: string;
  transactionType: string;
  status: string;
  channel: string;
  payment_method: string | null;
  subtotal: number;
  discount_amount: number;
  discountType: string | null;
  discountPercentage: string | number;
  deliveryCharges: number;
  total_amount: number;
  remarks: string | null;
  customer?: { id: number; name: string; phone: string };
  lines: BillLineDetail[];
  gatePasses?: GatePassDetail[];
}

interface EditableLine {
  productId: number | '';
  productLabel: string;
  warehouseId: number | '';
  quantity: number;
  unitPrice: number;
}

interface BillDetailModalProps {
  billId: number | null;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Full view + edit for a single saved invoice - line items, discount,
 * payment method, gate-pass status, and (when no gate pass has progressed
 * past PENDING) an edit mode that reconciles stock reservations on save.
 * Shared between BillsScreen's list and the Invoice screen's quick-search
 * popover so both open the exact same experience.
 */
export function BillDetailModal({ billId, onClose, onSaved }: BillDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(dialogRef, onClose, billId != null);
  const [billDetail, setBillDetail] = useState<BillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editRemarks, setEditRemarks] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [editDiscountValue, setEditDiscountValue] = useState('');
  const [editDeliveryCharges, setEditDeliveryCharges] = useState('');
  const [editLines, setEditLines] = useState<EditableLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [editProducts, setEditProducts] = useState<Array<{ id: number; name: string; code: string; cost_price?: number }>>([]);
  const [editWarehouses, setEditWarehouses] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (billId == null) {
      setBillDetail(null);
      setEditMode(false);
      setDetailError('');
      return;
    }
    openBillDetail(billId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billId]);

  async function openBillDetail(id: number) {
    setDetailError('');
    setEditMode(false);
    setDetailLoading(true);
    try {
      const data = await apiClient.getBillById(id);
      setBillDetail(data);
    } catch (err: any) {
      setDetailError(err.response?.data?.message || 'Failed to load invoice');
    } finally {
      setDetailLoading(false);
    }
  }

  function isLockedForEdit(detail: BillDetail): boolean {
    return (detail.gatePasses || []).some(gp => gp.status !== 'PENDING');
  }

  async function enterEditMode() {
    if (!billDetail) return;
    setEditRemarks(billDetail.remarks || '');
    setEditPaymentMethod(billDetail.payment_method || 'CASH');
    setEditDiscountType((billDetail.discountType as 'PERCENTAGE' | 'FIXED') || 'PERCENTAGE');
    setEditDiscountValue(
      billDetail.discountType === 'FIXED'
        ? String(billDetail.discount_amount || 0)
        : String(billDetail.discountPercentage || 0),
    );
    setEditDeliveryCharges(String(billDetail.deliveryCharges || 0));
    setEditLines(
      billDetail.lines.map(l => ({
        productId: l.productId,
        productLabel: l.product ? `${l.product.code} - ${l.product.name}` : '',
        warehouseId: l.warehouseId,
        quantity: l.quantity,
        unitPrice: l.unit_price,
      })),
    );

    if (editProducts.length === 0 || editWarehouses.length === 0) {
      try {
        const [prodRes, whRes] = await Promise.all([
          apiClient.searchProducts({ skip: 0, take: 500 }),
          apiClient.getWarehouses(),
        ]);
        setEditProducts(prodRes.data || []);
        setEditWarehouses(Array.isArray(whRes) ? whRes : whRes.data || []);
      } catch (err) {
        console.error('Failed to load products/warehouses for editing', err);
      }
    }

    setEditMode(true);
  }

  function updateEditLine(index: number, field: keyof EditableLine, value: any) {
    const updated = [...editLines];
    updated[index] = { ...updated[index], [field]: value };
    setEditLines(updated);
  }

  function updateEditLineProduct(index: number, productIdStr: string) {
    const productId = productIdStr ? parseInt(productIdStr, 10) : '';
    const product = editProducts.find(p => p.id === productId);
    const updated = [...editLines];
    updated[index] = {
      ...updated[index],
      productId,
      productLabel: product ? `${product.code} - ${product.name}` : '',
      unitPrice: product?.cost_price ?? updated[index].unitPrice,
    };
    setEditLines(updated);
  }

  function addEditLine() {
    setEditLines([...editLines, { productId: '', productLabel: '', warehouseId: '', quantity: 1, unitPrice: 0 }]);
  }

  function removeEditLine(index: number) {
    setEditLines(editLines.filter((_, i) => i !== index));
  }

  async function saveBillEdit() {
    if (!billDetail) return;
    setDetailError('');

    if (editLines.length === 0 || editLines.some(l => !l.productId || !l.warehouseId)) {
      setDetailError('Every line needs a product and a warehouse');
      return;
    }

    setSaving(true);
    try {
      const discountValueNum = Number(editDiscountValue) || 0;
      const payload: any = {
        remarks: editRemarks || undefined,
        paymentMethod: editPaymentMethod || undefined,
        discountType: editDiscountType,
        discountPercentage: editDiscountType === 'PERCENTAGE' ? discountValueNum : undefined,
        discountAmount: editDiscountType === 'FIXED' ? discountValueNum : undefined,
        deliveryCharges: Number(editDeliveryCharges) || 0,
        lines: editLines.map(l => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          warehouseId: l.warehouseId,
        })),
      };
      if (billDetail.transactionType === 'RETURN') {
        payload.returnWarehouseId = editLines[0]?.warehouseId;
      }

      const updated = await apiClient.updateBill(billDetail.id, payload);
      setBillDetail(updated);
      setEditMode(false);
      onSaved?.();
    } catch (err: any) {
      setDetailError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  if (billId == null && !detailLoading) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      {/* Escape closes it, Tab stays inside it: a keyboard has no backdrop to click. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={styles.modal}
        onClick={e => e.stopPropagation()}
      >
        {detailLoading && <p>Loading invoice...</p>}
        {detailError && <div style={styles.alertError}>{detailError}</div>}

        {billDetail && !detailLoading && (
          <>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>
                {billDetail.bill_number} <span style={styles.badgeMuted}>{billDetail.transactionType}</span>
              </h3>
              <button onClick={onClose} style={styles.smallBtn}>Close</button>
            </div>

            <div style={styles.modalMetaGrid}>
              <div><strong>Customer:</strong> {billDetail.customer?.name} ({billDetail.customer?.phone})</div>
              <div><strong>Date:</strong> {new Date(billDetail.bill_date).toLocaleString()}</div>
              <div><strong>Status:</strong> {billDetail.status}</div>
              <div><strong>Channel:</strong> {billDetail.channel}</div>
            </div>

            {(billDetail.gatePasses || []).length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <strong>Gate passes:</strong>{' '}
                {billDetail.gatePasses!.map(gp => (
                  <span key={gp.id} style={styles.badgeMuted}>
                    {gp.gate_pass_number} ({gp.warehouse?.name}: {gp.status})
                  </span>
                ))}
              </div>
            )}

            <table style={styles.editTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Warehouse</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>Unit Price</th>
                  <th style={styles.th}>Line Total</th>
                  {editMode && <th style={styles.th}></th>}
                </tr>
              </thead>
              <tbody>
                {!editMode &&
                  billDetail.lines.map((line, i) => (
                    <tr key={line.id ?? i}>
                      <td style={styles.td}>{line.product ? `${line.product.code} - ${line.product.name}` : line.productId}</td>
                      <td style={styles.td}>{editWarehouses.find(w => w.id === line.warehouseId)?.name || line.warehouseId}</td>
                      <td style={styles.td}>{line.quantity}</td>
                      <td style={styles.td}>{line.unit_price}</td>
                      <td style={styles.td}>{line.line_total}</td>
                    </tr>
                  ))}
                {editMode &&
                  editLines.map((line, i) => (
                    <tr key={i}>
                      <td style={styles.td}>
                        <select
                          style={styles.input}
                          value={line.productId}
                          onChange={e => updateEditLineProduct(i, e.target.value)}
                        >
                          <option value="">Select product...</option>
                          {editProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <select
                          style={styles.input}
                          value={line.warehouseId}
                          onChange={e => updateEditLine(i, 'warehouseId', e.target.value ? parseInt(e.target.value, 10) : '')}
                        >
                          <option value="">Select warehouse...</option>
                          {editWarehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <input
                          style={styles.inputNarrow}
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={e => updateEditLine(i, 'quantity', e.target.value)}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          style={styles.inputNarrow}
                          type="number"
                          min={0}
                          value={line.unitPrice}
                          onChange={e => updateEditLine(i, 'unitPrice', e.target.value)}
                        />
                      </td>
                      <td style={styles.td}>{(Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)}</td>
                      <td style={styles.td}>
                        <button style={styles.dangerBtn} onClick={() => removeEditLine(i)}>✕</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {editMode && (
              <button style={styles.smallBtn} onClick={addEditLine}>+ Add line</button>
            )}

            {editMode ? (
              <div style={styles.modalMetaGrid}>
                <div>
                  <label style={styles.smallLabel}>Payment Method</label>
                  <select style={styles.input} value={editPaymentMethod} onChange={e => setEditPaymentMethod(e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online</option>
                    <option value="CREDIT">Credit</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label style={styles.smallLabel}>Discount</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select style={styles.inputNarrow} value={editDiscountType} onChange={e => setEditDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}>
                      <option value="PERCENTAGE">%</option>
                      <option value="FIXED">Rs</option>
                    </select>
                    <input style={styles.input} type="number" value={editDiscountValue} onChange={e => setEditDiscountValue(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={styles.smallLabel}>Delivery Charges</label>
                  <input style={styles.input} type="number" value={editDeliveryCharges} onChange={e => setEditDeliveryCharges(e.target.value)} />
                </div>
                <div>
                  <label style={styles.smallLabel}>Remarks</label>
                  <input style={styles.input} value={editRemarks} onChange={e => setEditRemarks(e.target.value)} />
                </div>
              </div>
            ) : (
              <div style={styles.modalMetaGrid}>
                <div><strong>Subtotal:</strong> Rs {billDetail.subtotal.toLocaleString()}</div>
                <div><strong>Discount:</strong> Rs {billDetail.discount_amount.toLocaleString()}</div>
                <div><strong>Delivery:</strong> Rs {billDetail.deliveryCharges.toLocaleString()}</div>
                <div><strong>Total:</strong> Rs {billDetail.total_amount.toLocaleString()}</div>
                {billDetail.remarks && <div><strong>Remarks:</strong> {billDetail.remarks}</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              {!editMode ? (
                <button
                  style={styles.submitBtn}
                  disabled={isLockedForEdit(billDetail)}
                  title={isLockedForEdit(billDetail) ? 'A gate pass for this invoice has already been picked/confirmed' : ''}
                  onClick={enterEditMode}
                >
                  {isLockedForEdit(billDetail) ? 'Locked (gate pass in progress)' : 'Edit'}
                </button>
              ) : (
                <>
                  <button style={styles.submitBtn} disabled={saving} onClick={saveBillEdit}>
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button style={styles.smallBtn} onClick={() => setEditMode(false)}>Cancel</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '8px',
    padding: '20px',
    width: '800px',
    maxWidth: '95vw',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  modalMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    fontSize: '13px',
    marginTop: '12px',
  },
  badgeMuted: {
    display: 'inline-block',
    padding: '3px 8px',
    background: '#e2e3e5',
    color: '#383d41',
    borderRadius: '4px',
    fontSize: '11px',
    marginLeft: '6px',
  },
  editTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '14px',
  },
  th: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
  },
  td: {
    padding: '10px 12px',
    fontSize: '13px',
  },
  smallBtn: {
    padding: '6px 12px',
    background: 'white',
    color: '#667eea',
    border: '1px solid #667eea',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  submitBtn: {
    padding: '10px 30px',
    backgroundColor: '#43e97b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  dangerBtn: {
    padding: '4px 8px',
    border: 'none',
    background: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  smallLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#666',
    marginBottom: '4px',
  },
  input: { flex: 1, minWidth: '150px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' },
  inputNarrow: {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '13px',
    width: '80px',
  },
  alertError: {
    padding: '10px 14px',
    background: '#f8d7da',
    color: '#721c24',
    borderRadius: '6px',
    marginBottom: '10px',
  },
};
