import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface Vendor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  address?: string;
  paymentTerms?: string;
  creditLimit?: number;
  taxNumber?: string;
  tags?: string[];
  isActive: boolean;
}

interface ProductVendorRow {
  id: number;
  productId: number;
  unit_price: number;
  lead_time_days: number;
  last_purchase_date: string | null;
  product: { id: number; name: string; code: string };
}

interface VendorDetail extends Vendor {
  ProductVendor: ProductVendorRow[];
  purchaseOrders: Array<{
    id: number;
    po_number: string;
    status: string;
    po_amount: number;
    amount_paid: number;
    due_date: string | null;
    createdAt: string;
  }>;
}

interface PriceTrendEntry {
  productId: number;
  productName: string;
  currentPrice: number;
  history: Array<{ date: string; price: number; poNumber: string; quantity: number }>;
}

interface VendorScorecard {
  vendorId: number;
  vendorName: string;
  totalDeliveredPOs: number;
  onTimeDeliveryPercent: number | null;
  averageLeadTimeDays: number | null;
  priceTrend: PriceTrendEntry[];
}

interface ProductOption {
  id: number;
  name: string;
  code: string;
}

interface ProductHistoryEntry {
  vendor: string;
  poNumber: string;
  poDate: string;
  quantity: number;
  costPrice: number;
}

/** Renders a self-contained HTML document into a genuinely separate browser
 * window/tab - there's no router in this app, so this is how "open in a new
 * window" is done without one. */
function openInNewWindow(title: string, bodyHtml: string) {
  const win = window.open('', '_blank', 'width=700,height=800');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
          th { background: #f5f5f5; }
          h2 { margin-top: 0; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `);
  win.document.close();
}

export function VendorsScreen() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', contactPerson: '', address: '',
    paymentTerms: '', creditLimit: '', taxNumber: '', tags: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [vendorDetail, setVendorDetail] = useState<VendorDetail | null>(null);
  const [detailTab, setDetailTab] = useState<'products' | 'statement' | 'scorecard'>('products');
  const [scorecard, setScorecard] = useState<VendorScorecard | null>(null);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductId, setAddProductId] = useState<number | ''>('');
  const [addUnitPrice, setAddUnitPrice] = useState('');
  const [addLeadTime, setAddLeadTime] = useState('7');
  const [productHistory, setProductHistory] = useState<ProductHistoryEntry[] | null>(null);

  useEffect(() => {
    loadVendors();
    apiClient.searchProducts({ skip: 0, take: 500 }).then((r: any) => setProducts(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedVendorId) loadVendorDetail(selectedVendorId);
  }, [selectedVendorId]);

  async function loadVendors() {
    setLoading(true);
    try {
      const result = await apiClient.getVendors(0, 100);
      setVendors(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error('Failed to load vendors', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadVendorDetail(id: number) {
    try {
      const data = await apiClient.getVendorById(id);
      setVendorDetail(data);
      setScorecard(null);
    } catch (err) {
      console.error('Failed to load vendor detail', err);
    }
  }

  async function openScorecardTab() {
    setDetailTab('scorecard');
    if (!vendorDetail || scorecard) return;
    try {
      const data = await apiClient.getVendorScorecard(vendorDetail.id);
      setScorecard(data);
    } catch (err) {
      console.error('Failed to load vendor scorecard', err);
    }
  }

  function resetForm() {
    setFormData({ name: '', email: '', phone: '', contactPerson: '', address: '', paymentTerms: '', creditLimit: '', taxNumber: '', tags: '' });
  }

  async function submitVendor() {
    setError('');
    if (!formData.name.trim()) {
      setError('Vendor name is required');
      return;
    }
    try {
      await apiClient.createVendor({
        name: formData.name.trim(),
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        contactPerson: formData.contactPerson || undefined,
        address: formData.address || undefined,
        paymentTerms: formData.paymentTerms || undefined,
        creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
        taxNumber: formData.taxNumber || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      });
      setSuccess('Vendor created');
      setTimeout(() => setSuccess(''), 2000);
      resetForm();
      setShowForm(false);
      loadVendors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create vendor');
    }
  }

  async function handleDeactivate(id: number) {
    if (!window.confirm('Deactivate this vendor?')) return;
    try {
      await apiClient.deactivateVendor(id);
      if (selectedVendorId === id) {
        setSelectedVendorId(null);
        setVendorDetail(null);
      }
      loadVendors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate vendor');
    }
  }

  async function handleProductPick(productId: string) {
    const id = productId ? parseInt(productId, 10) : '';
    setAddProductId(id);
    setProductHistory(null);
    if (id) {
      try {
        const history = await apiClient.getProductPurchaseHistory(id);
        setProductHistory(history);
      } catch (err) {
        console.error('Failed to load product purchase history', err);
      }
    }
  }

  async function submitAddProduct() {
    if (!vendorDetail || !addProductId || !addUnitPrice) {
      setError('Select a product and enter a unit price');
      return;
    }
    try {
      await apiClient.addProductToVendor(vendorDetail.id, {
        productId: addProductId,
        unitPrice: Number(addUnitPrice),
        leadTimeDays: Number(addLeadTime) || 7,
      });
      setShowAddProduct(false);
      setAddProductId('');
      setAddUnitPrice('');
      setAddLeadTime('7');
      setProductHistory(null);
      loadVendorDetail(vendorDetail.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add product to vendor');
    }
  }

  async function handleRemoveProduct(productId: number) {
    if (!vendorDetail) return;
    if (!window.confirm('Remove this product from the vendor?')) return;
    try {
      await apiClient.removeProductFromVendor(vendorDetail.id, productId);
      loadVendorDetail(vendorDetail.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove product');
    }
  }

  async function openPurchaseOrder(poId: number) {
    try {
      const po = await apiClient.getPurchaseOrderById(poId);
      const productName = (id: number) => products.find(p => p.id === id)?.name || `Product #${id}`;
      const itemsHtml = (po.PurchaseOrderItem || [])
        .map((item: any) => `<tr><td>${productName(item.productId)}</td><td>${item.quantity_ordered}</td><td>${item.quantity_received}</td></tr>`)
        .join('');
      openInNewWindow(`Purchase Order ${po.po_number}`, `
        <h2>Purchase Order ${po.po_number}</h2>
        <p><strong>Vendor:</strong> ${po.vendor?.name || ''}</p>
        <p><strong>Status:</strong> ${po.status}</p>
        <p><strong>Total:</strong> Rs ${po.po_amount?.toLocaleString?.() || po.po_amount}</p>
        <p><strong>Paid:</strong> Rs ${po.amount_paid?.toLocaleString?.() || po.amount_paid}</p>
        <table>
          <thead><tr><th>Product</th><th>Qty Ordered</th><th>Qty Received</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
      `);
    } catch (err) {
      setError('Failed to open purchase order');
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>🏢 Vendors</h2>
        <button style={styles.primaryBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Vendor'}
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {success && <div style={styles.successBanner}>{success}</div>}

      {showForm && (
        <div style={styles.card}>
          <div style={styles.grid3}>
            <div style={styles.field}>
              <label style={styles.label}>Name *</label>
              <input style={styles.input} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Contact Person</label>
              <input style={styles.input} value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone</label>
              <input style={styles.input} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input style={styles.input} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Address</label>
              <input style={styles.input} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Payment Terms</label>
              <input style={styles.input} placeholder="e.g. Net 30" value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Credit Limit (Rs)</label>
              <input style={styles.input} type="number" value={formData.creditLimit} onChange={e => setFormData({ ...formData, creditLimit: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Tax / NTN Number</label>
              <input style={styles.input} value={formData.taxNumber} onChange={e => setFormData({ ...formData, taxNumber: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Tags (comma-separated)</label>
              <input style={styles.input} placeholder="Local, Preferred" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
            </div>
          </div>
          <button style={styles.primaryBtn} onClick={submitVendor}>Create Vendor</button>
        </div>
      )}

      <div style={styles.layout}>
        <div style={styles.listPane}>
          {loading ? (
            <p style={styles.emptyState}>Loading...</p>
          ) : vendors.length === 0 ? (
            <p style={styles.emptyState}>No vendors yet</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Contact</th>
                  <th style={styles.th}>Terms</th>
                  <th style={styles.th}>Tags</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr
                    key={v.id}
                    style={v.id === selectedVendorId ? styles.trSelected : styles.trClickable}
                    onClick={() => setSelectedVendorId(v.id)}
                  >
                    <td style={styles.td}>{v.name}</td>
                    <td style={styles.td}>{v.contact_person || v.phone || '-'}</td>
                    <td style={styles.td}>{v.paymentTerms || '-'}</td>
                    <td style={styles.td}>{(v.tags || []).join(', ') || '-'}</td>
                    <td style={styles.td}>
                      <button style={styles.dangerBtn} onClick={e => { e.stopPropagation(); handleDeactivate(v.id); }}>Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {vendorDetail && (
          <div style={styles.detailPane}>
            <h3 style={styles.h3}>{vendorDetail.name}</h3>
            <div style={styles.vendorMeta}>
              <div>{vendorDetail.contact_person} · {vendorDetail.phone} · {vendorDetail.email}</div>
              <div>{vendorDetail.paymentTerms || 'No payment terms set'} · Credit limit Rs {(vendorDetail.creditLimit || 0).toLocaleString()}</div>
              <div>{vendorDetail.taxNumber ? `Tax #: ${vendorDetail.taxNumber}` : ''} {(vendorDetail.tags || []).length > 0 && `· ${(vendorDetail.tags || []).join(', ')}`}</div>
            </div>

            <div style={styles.tabRow}>
              <button style={detailTab === 'products' ? styles.tabActive : styles.tab} onClick={() => setDetailTab('products')}>Products</button>
              <button style={detailTab === 'statement' ? styles.tabActive : styles.tab} onClick={() => setDetailTab('statement')}>Statement</button>
              <button style={detailTab === 'scorecard' ? styles.tabActive : styles.tab} onClick={openScorecardTab}>Scorecard</button>
            </div>

            {detailTab === 'products' && (
              <div>
                <div style={styles.inlineRow}>
                  <button style={styles.smallBtn} onClick={() => setShowAddProduct(!showAddProduct)}>
                    {showAddProduct ? 'Cancel' : '+ Add Product'}
                  </button>
                </div>

                {showAddProduct && (
                  <div style={styles.addProductForm}>
                    <select style={styles.input} value={addProductId} onChange={e => handleProductPick(e.target.value)}>
                      <option value="">Select product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                    <input style={styles.input} type="number" placeholder="Unit price" value={addUnitPrice} onChange={e => setAddUnitPrice(e.target.value)} />
                    <input style={styles.input} type="number" placeholder="Lead time (days)" value={addLeadTime} onChange={e => setAddLeadTime(e.target.value)} />
                    <button style={styles.primaryBtn} onClick={submitAddProduct}>Save</button>

                    {productHistory && (
                      <div style={styles.historyPopupInline}>
                        <div style={styles.label}>Last purchases of this product (any vendor):</div>
                        {productHistory.length === 0 ? (
                          <div style={styles.emptyStateSmall}>No prior purchases recorded</div>
                        ) : (
                          <table style={styles.table}>
                            <thead>
                              <tr>
                                <th style={styles.th}>Vendor</th>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>Qty</th>
                                <th style={styles.th}>Cost Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {productHistory.map((h, i) => (
                                <tr key={i}>
                                  <td style={styles.td}>{h.vendor}</td>
                                  <td style={styles.td}>{new Date(h.poDate).toLocaleDateString()}</td>
                                  <td style={styles.td}>{h.quantity}</td>
                                  <td style={styles.td}>Rs {h.costPrice.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Unit Price</th>
                      <th style={styles.th}>Lead Time</th>
                      <th style={styles.th}>Last Purchased</th>
                      <th style={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorDetail.ProductVendor.map(pv => (
                      <tr key={pv.id}>
                        <td style={styles.td}>{pv.product.code} - {pv.product.name}</td>
                        <td style={styles.td}>Rs {pv.unit_price.toLocaleString()}</td>
                        <td style={styles.td}>{pv.lead_time_days} days</td>
                        <td style={styles.td}>{pv.last_purchase_date ? new Date(pv.last_purchase_date).toLocaleDateString() : '-'}</td>
                        <td style={styles.td}>
                          <button style={styles.dangerBtn} onClick={() => handleRemoveProduct(pv.productId)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                    {vendorDetail.ProductVendor.length === 0 && (
                      <tr><td style={styles.td} colSpan={5}>No products assigned to this vendor yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {detailTab === 'statement' && (
              <div>
                {(() => {
                  const totalOutstanding = vendorDetail.purchaseOrders.reduce(
                    (sum, po) => sum + Math.max(0, po.po_amount - po.amount_paid), 0,
                  );
                  return <div style={styles.statementTotal}>Total outstanding: Rs {totalOutstanding.toLocaleString()}</div>;
                })()}
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>PO #</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Paid</th>
                      <th style={styles.th}>Outstanding</th>
                      <th style={styles.th}>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorDetail.purchaseOrders.map(po => (
                      <tr key={po.id}>
                        <td style={styles.td}>
                          <button style={styles.linkBtn} onClick={() => openPurchaseOrder(po.id)}>{po.po_number}</button>
                        </td>
                        <td style={styles.td}>{po.status}</td>
                        <td style={styles.td}>Rs {po.po_amount.toLocaleString()}</td>
                        <td style={styles.td}>Rs {po.amount_paid.toLocaleString()}</td>
                        <td style={styles.td}>Rs {Math.max(0, po.po_amount - po.amount_paid).toLocaleString()}</td>
                        <td style={styles.td}>{po.due_date ? new Date(po.due_date).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                    {vendorDetail.purchaseOrders.length === 0 && (
                      <tr><td style={styles.td} colSpan={6}>No purchase orders for this vendor yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {detailTab === 'scorecard' && (
              <div>
                {!scorecard ? (
                  <p style={styles.emptyStateSmall}>Loading scorecard...</p>
                ) : (
                  <>
                    <div style={styles.scorecardStats}>
                      <div style={styles.statCard}>
                        <div style={styles.statLabel}>On-time delivery</div>
                        <div style={styles.statValue}>{scorecard.onTimeDeliveryPercent != null ? `${scorecard.onTimeDeliveryPercent}%` : 'N/A'}</div>
                      </div>
                      <div style={styles.statCard}>
                        <div style={styles.statLabel}>Avg. lead time</div>
                        <div style={styles.statValue}>{scorecard.averageLeadTimeDays != null ? `${scorecard.averageLeadTimeDays} days` : 'N/A'}</div>
                      </div>
                      <div style={styles.statCard}>
                        <div style={styles.statLabel}>Delivered POs</div>
                        <div style={styles.statValue}>{scorecard.totalDeliveredPOs}</div>
                      </div>
                    </div>

                    <h4 style={styles.h3}>Price trend by product</h4>
                    {scorecard.priceTrend.length === 0 && <p style={styles.emptyStateSmall}>No products assigned yet</p>}
                    {scorecard.priceTrend.map(pt => (
                      <div key={pt.productId} style={{ marginBottom: '14px' }}>
                        <strong>{pt.productName}</strong> - current: Rs {pt.currentPrice.toLocaleString()}
                        {pt.history.length === 0 ? (
                          <div style={styles.emptyStateSmall}>No purchase history recorded</div>
                        ) : (
                          <table style={styles.table}>
                            <thead>
                              <tr>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>PO #</th>
                                <th style={styles.th}>Qty</th>
                                <th style={styles.th}>Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pt.history.map((h, i) => (
                                <tr key={i}>
                                  <td style={styles.td}>{new Date(h.date).toLocaleDateString()}</td>
                                  <td style={styles.td}>{h.poNumber}</td>
                                  <td style={styles.td}>{h.quantity}</td>
                                  <td style={styles.td}>Rs {h.price.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: '1300px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  h2: { margin: 0 },
  h3: { margin: '0 0 8px' },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' },
  successBanner: { background: '#d4edda', color: '#155724', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' },
  card: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '18px', marginBottom: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#555' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', width: '100%' },
  primaryBtn: { padding: '10px 18px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  smallBtn: { padding: '6px 12px', background: 'white', color: '#667eea', border: '1px solid #667eea', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  dangerBtn: { padding: '6px 12px', background: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  linkBtn: { background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', padding: 0 },
  inlineRow: { display: 'flex', gap: '8px', marginBottom: '10px' },
  layout: { display: 'flex', gap: '16px' },
  listPane: { flex: '1 1 45%', minWidth: '380px' },
  detailPane: { flex: '1 1 55%', background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' },
  vendorMeta: { fontSize: '13px', color: '#555', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' },
  tabRow: { display: 'flex', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #eee' },
  tab: { padding: '8px 14px', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontSize: '13px', color: '#666' },
  tabActive: { padding: '8px 14px', background: 'none', border: 'none', borderBottom: '2px solid #667eea', cursor: 'pointer', fontSize: '13px', color: '#667eea', fontWeight: 600 },
  addProductForm: { display: 'flex', flexDirection: 'column', gap: '8px', background: '#f9f9fb', padding: '12px', borderRadius: '6px', marginBottom: '12px' },
  historyPopupInline: { marginTop: '8px', border: '1px solid #eee', borderRadius: '6px', padding: '10px', background: 'white' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '8px', background: '#f5f5f5', textAlign: 'left', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #ddd' },
  td: { padding: '8px', fontSize: '13px', borderBottom: '1px solid #eee' },
  trClickable: { cursor: 'pointer' },
  trSelected: { cursor: 'pointer', background: '#eef0fe' },
  emptyState: { color: '#888', textAlign: 'center', padding: '30px' },
  emptyStateSmall: { color: '#999', fontSize: '12px', fontStyle: 'italic' },
  statementTotal: { fontSize: '14px', fontWeight: 600, marginBottom: '10px' },
  scorecardStats: { display: 'flex', gap: '12px', marginBottom: '18px' },
  statCard: { flex: 1, background: '#f9f9fb', border: '1px solid #eee', borderRadius: '8px', padding: '12px', textAlign: 'center' as const },
  statLabel: { fontSize: '11px', color: '#888', marginBottom: '4px' },
  statValue: { fontSize: '20px', fontWeight: 700, color: '#333' },
};
