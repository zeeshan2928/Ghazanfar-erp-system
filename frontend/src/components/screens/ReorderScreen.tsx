import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface VendorOption {
  vendorId: number;
  vendorName: string;
  unitPrice: number;
  leadTimeDays: number;
}

interface LowStockAlert {
  productId: number;
  productCode: string;
  productName: string;
  minimumQuantity: number;
  currentAvailable: number;
  shortage: number;
  reorderQuantity: number;
  primaryVendorId: number | null;
  vendors: VendorOption[];
  cheapestVendorId?: number;
}

export function ReorderScreen() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [manualMode, setManualMode] = useState(false);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [chosenVendor, setChosenVendor] = useState<Record<number, number>>({});
  const [quantity, setQuantity] = useState<Record<number, string>>({});
  const [working, setWorking] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    try {
      const result = await apiClient.getLowStockAlerts();
      setAlerts(result.alerts || []);

      const initialVendor: Record<number, number> = {};
      const initialQty: Record<number, string> = {};
      (result.alerts || []).forEach((a: LowStockAlert) => {
        initialVendor[a.productId] = a.primaryVendorId || a.cheapestVendorId || 0;
        initialQty[a.productId] = String(a.reorderQuantity || a.shortage * 2);
      });
      setChosenVendor(initialVendor);
      setQuantity(initialQty);
    } catch (err) {
      console.error('Failed to load low-stock alerts', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoGenerate() {
    setError('');
    setWorking(true);
    try {
      const result = await apiClient.autoCreatePOsForLowStock();
      setSuccess(result.message || 'Purchase orders created');
      setTimeout(() => setSuccess(''), 3000);
      loadAlerts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to auto-generate purchase orders');
    } finally {
      setWorking(false);
    }
  }

  function toggleSelected(productId: number) {
    setSelected(prev => ({ ...prev, [productId]: !prev[productId] }));
  }

  async function handleManualGenerate() {
    setError('');
    const items = alerts
      .filter(a => selected[a.productId])
      .map(a => ({
        productId: a.productId,
        vendorId: chosenVendor[a.productId],
        quantity: Number(quantity[a.productId]) || a.reorderQuantity || a.shortage,
      }));

    if (items.length === 0) {
      setError('Select at least one product to reorder');
      return;
    }
    if (items.some(i => !i.vendorId)) {
      setError('Every selected product needs a vendor chosen');
      return;
    }

    setWorking(true);
    try {
      const result = await apiClient.manualCreatePOsForLowStock(items);
      setSuccess(result.message || 'Purchase orders created');
      setTimeout(() => setSuccess(''), 3000);
      setSelected({});
      setManualMode(false);
      loadAlerts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create purchase orders');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>📉 Reorder / Low Stock</h2>
        <div style={styles.inlineRow}>
          <button style={styles.primaryBtn} disabled={working || alerts.length === 0} onClick={handleAutoGenerate}>
            Auto Generate
          </button>
          <button style={styles.smallBtn} onClick={() => setManualMode(!manualMode)}>
            {manualMode ? 'Cancel Manual' : 'Manual Generate'}
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {success && <div style={styles.successBanner}>{success}</div>}

      {loading ? (
        <p style={styles.emptyState}>Loading...</p>
      ) : alerts.length === 0 ? (
        <p style={styles.emptyState}>Nothing is below its minimum stock level right now 🎉</p>
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                {manualMode && <th style={styles.th}></th>}
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Available</th>
                <th style={styles.th}>Minimum</th>
                <th style={styles.th}>Shortage</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.productId}>
                  {manualMode && (
                    <td style={styles.td}>
                      <input type="checkbox" checked={!!selected[a.productId]} onChange={() => toggleSelected(a.productId)} />
                    </td>
                  )}
                  <td style={styles.td}>{a.productCode} - {a.productName}</td>
                  <td style={styles.td}>{a.currentAvailable}</td>
                  <td style={styles.td}>{a.minimumQuantity}</td>
                  <td style={styles.td}><span style={styles.shortageBadge}>{a.shortage}</span></td>
                  <td style={styles.td}>
                    {manualMode ? (
                      <select
                        style={styles.input}
                        value={chosenVendor[a.productId] || ''}
                        onChange={e => setChosenVendor({ ...chosenVendor, [a.productId]: parseInt(e.target.value, 10) })}
                      >
                        <option value="">Select vendor...</option>
                        {a.vendors.map(v => (
                          <option key={v.vendorId} value={v.vendorId}>
                            {v.vendorName} - Rs {v.unitPrice.toLocaleString()} {v.vendorId === a.cheapestVendorId ? '★ best price' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      a.vendors.length === 0
                        ? <span style={styles.emptyStateSmall}>No vendor assigned</span>
                        : a.vendors.map(v => (
                            <div key={v.vendorId}>
                              {v.vendorName} - Rs {v.unitPrice.toLocaleString()}
                              {v.vendorId === a.cheapestVendorId && <span style={styles.bestPriceBadge}> ★ best</span>}
                            </div>
                          ))
                    )}
                  </td>
                  <td style={styles.td}>
                    {manualMode ? (
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={1}
                        value={quantity[a.productId] || ''}
                        onChange={e => setQuantity({ ...quantity, [a.productId]: e.target.value })}
                      />
                    ) : (
                      a.reorderQuantity || a.shortage * 2
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {manualMode && (
            <button style={{ ...styles.primaryBtn, marginTop: '14px' }} disabled={working} onClick={handleManualGenerate}>
              Create Selected Purchase Orders
            </button>
          )}
        </>
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
  inlineRow: { display: 'flex', gap: '8px' },
  primaryBtn: { padding: '10px 18px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  smallBtn: { padding: '10px 18px', background: 'white', color: '#667eea', border: '1px solid #667eea', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  input: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '100%', minWidth: '220px' },
  inputNarrow: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '80px' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white' },
  th: { padding: '10px', background: '#f5f5f5', textAlign: 'left', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #ddd' },
  td: { padding: '10px', fontSize: '13px', borderBottom: '1px solid #eee' },
  shortageBadge: { background: '#fff3cd', color: '#856404', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 },
  bestPriceBadge: { color: '#155724', fontWeight: 600, fontSize: '11px' },
  emptyState: { color: '#888', textAlign: 'center', padding: '30px' },
  emptyStateSmall: { color: '#999', fontSize: '12px', fontStyle: 'italic' },
};
