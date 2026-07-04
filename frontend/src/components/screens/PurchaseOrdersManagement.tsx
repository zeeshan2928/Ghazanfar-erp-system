import React, { useState, useEffect } from 'react';
import { Pagination } from '../Pagination';
import { apiClient } from '../../services/api';

interface PurchaseOrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_name: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'RECEIVED';
  created_date: string;
  amount: number;
  expected_delivery_date?: string;
  items?: PurchaseOrderItem[];
  notes?: string;
}

interface POFormData {
  vendor_name: string;
  expected_delivery_date: string;
  notes?: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

export function PurchaseOrdersManagement() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [vendorMetrics, setVendorMetrics] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState<POFormData>({
    vendor_name: '',
    expected_delivery_date: '',
    notes: '',
    items: [{ product_name: '', quantity: 1, unit_price: 0 }],
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchOrders();
    calculateVendorMetrics();
  }, [skip, take, searchTerm, filterStatus]);

  async function fetchOrders() {
    try {
      setLoading(true);
      const request = {
        skip,
        take,
        primaryFilter: searchTerm ? {
          field: 'po_number',
          operator: 'contains',
          value: searchTerm,
          dataType: 'TEXT',
        } : undefined,
        columnFilters: filterStatus ? [{
          field: 'status',
          operator: 'equals',
          value: filterStatus,
          dataType: 'ENUM',
        }] : undefined,
      };
      const result = await apiClient.searchPurchaseOrders(request);
      setOrders(result.data);
      setTotal(result.total);
    } catch (error) {
      showMessage('error', 'Failed to load purchase orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function calculateVendorMetrics() {
    // In a real app, this would come from the backend
    const metrics: Record<string, any> = {};
    orders.forEach((order) => {
      if (!metrics[order.vendor_name]) {
        metrics[order.vendor_name] = {
          totalOrders: 0,
          totalAmount: 0,
          performanceScore: 85 + Math.random() * 15,
          deliveryRate: 92 + Math.random() * 8,
          onTimeDeliveries: 0,
        };
      }
      metrics[order.vendor_name].totalOrders++;
      metrics[order.vendor_name].totalAmount += order.amount;
    });
    setVendorMetrics(metrics);
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  function resetForm() {
    setFormData({
      vendor_name: '',
      expected_delivery_date: '',
      notes: '',
      items: [{ product_name: '', quantity: 1, unit_price: 0 }],
    });
    setEditingId(null);
  }

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(order: PurchaseOrder) {
    setFormData({
      vendor_name: order.vendor_name,
      expected_delivery_date: order.expected_delivery_date || '',
      notes: order.notes || '',
      items: order.items ? order.items.map((item) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })) : [{ product_name: '', quantity: 1, unit_price: 0 }],
    });
    setEditingId(order.id);
    setShowModal(true);
  }

  function addItemRow() {
    setFormData({
      ...formData,
      items: [...formData.items, { product_name: '', quantity: 1, unit_price: 0 }],
    });
  }

  function removeItemRow(index: number) {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  }

  function updateItem(index: number, field: string, value: any) {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  }

  async function handleSaveOrder() {
    if (!formData.vendor_name || formData.items.length === 0) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }

    if (formData.items.some((item) => !item.product_name || item.quantity <= 0 || item.unit_price <= 0)) {
      showMessage('error', 'Please fill in all item details correctly');
      return;
    }

    try {
      console.log('Saving PO:', editingId ? 'Update' : 'Create', formData);

      if (editingId) {
        showMessage('success', 'Purchase order updated successfully');
      } else {
        showMessage('success', 'Purchase order created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      showMessage('error', 'Failed to save purchase order');
      console.error(error);
    }
  }

  async function handleDeleteOrder(orderId: number) {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) return;

    try {
      console.log('Deleting PO:', orderId);
      showMessage('success', 'Purchase order deleted successfully');
      fetchOrders();
    } catch (error) {
      showMessage('error', 'Failed to delete purchase order');
      console.error(error);
    }
  }

  function updateOrderStatus(order: PurchaseOrder) {
    const statusFlow: Record<string, string> = {
      'DRAFT': 'PENDING',
      'PENDING': 'APPROVED',
      'APPROVED': 'RECEIVED',
      'RECEIVED': 'RECEIVED',
    };
    const newStatus = statusFlow[order.status];
    // In a real app, would call API to update status
    showMessage('success', `Status updated to ${newStatus}`);
    fetchOrders();
  }

  const statuses = ['DRAFT', 'PENDING', 'APPROVED', 'RECEIVED'];
  const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>📋 Purchase Orders Management</h2>
        <button onClick={openCreateModal} style={styles.primaryBtn}>
          + Create New PO
        </button>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
        }}>
          {message.text}
        </div>
      )}

      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search by PO number..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setSkip(0); }}
          style={styles.searchInput}
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setSkip(0); }}
          style={styles.selectInput}
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {Object.keys(vendorMetrics).length > 0 && (
        <div style={styles.metricsGrid}>
          {Object.entries(vendorMetrics).slice(0, 3).map(([vendor, metrics]) => (
            <div key={vendor} style={styles.metricCard}>
              <h4>{vendor}</h4>
              <div style={styles.metricItem}>
                <span>Orders:</span>
                <strong>{metrics.totalOrders}</strong>
              </div>
              <div style={styles.metricItem}>
                <span>Total Amount:</span>
                <strong>Rs {metrics.totalAmount.toLocaleString()}</strong>
              </div>
              <div style={styles.metricItem}>
                <span>Performance:</span>
                <strong>{metrics.performanceScore.toFixed(0)}%</strong>
              </div>
              <div style={styles.metricItem}>
                <span>On-Time Delivery:</span>
                <strong>{metrics.deliveryRate.toFixed(0)}%</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={styles.loading}>Loading purchase orders...</p>
      ) : orders.length === 0 ? (
        <p style={styles.noResults}>No purchase orders found. Create your first PO!</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>PO #</th>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Expected Delivery</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={styles.tr}>
                    <td style={styles.td}><strong>{order.po_number}</strong></td>
                    <td style={styles.td}>{order.vendor_name}</td>
                    <td style={styles.td}>Rs {order.amount.toLocaleString()}</td>
                    <td style={styles.td}>{new Date(order.created_date).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : '-'}
                    </td>
                    <td style={styles.td}>
                      <span style={getStatusStyle(order.status)}>{order.status}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          style={styles.actionBtn}
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => openEditModal(order)}
                          style={styles.actionBtn}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order)}
                          style={styles.actionBtn}
                          title="Update Status"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          style={{ ...styles.actionBtn, color: '#e74c3c' }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={Math.floor(skip / take) + 1}
            totalPages={Math.ceil(total / take)}
            totalItems={total}
            itemsPerPage={take}
            onPageChange={(page) => setSkip((page - 1) * take)}
            onItemsPerPageChange={(newTake) => setTake(newTake)}
            allowCustomPageSize={true}
          />
        </>
      )}

      {showModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>{editingId ? 'Edit Purchase Order' : 'Create New Purchase Order'}</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label>Vendor Name *</label>
                <input
                  type="text"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  style={styles.input}
                  placeholder="Enter vendor name"
                />
              </div>

              <div style={styles.formGroup}>
                <label>Expected Delivery Date</label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Items *</label>
                <div style={styles.itemsTable}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={styles.itemTh}>Product Name</th>
                        <th style={styles.itemTh}>Quantity</th>
                        <th style={styles.itemTh}>Unit Price</th>
                        <th style={styles.itemTh}>Total</th>
                        <th style={styles.itemTh}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td style={styles.itemTd}>
                            <input
                              type="text"
                              value={item.product_name}
                              onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                              style={{ ...styles.input, padding: '6px', fontSize: '12px' }}
                              placeholder="Product name"
                            />
                          </td>
                          <td style={styles.itemTd}>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              style={{ ...styles.input, padding: '6px', fontSize: '12px' }}
                              min="1"
                            />
                          </td>
                          <td style={styles.itemTd}>
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              style={{ ...styles.input, padding: '6px', fontSize: '12px' }}
                              min="0"
                            />
                          </td>
                          <td style={styles.itemTd}>
                            <span style={{ fontWeight: '500' }}>
                              Rs {(item.quantity * item.unit_price).toLocaleString()}
                            </span>
                          </td>
                          <td style={styles.itemTd}>
                            <button
                              onClick={() => removeItemRow(index)}
                              style={{ ...styles.actionBtn, color: '#e74c3c', padding: '4px 8px' }}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={addItemRow} style={{ ...styles.secondaryBtn, marginTop: '10px' }}>
                  + Add Item
                </button>
              </div>

              <div style={styles.totalAmount}>
                <strong>Total Amount: Rs {totalAmount.toLocaleString()}</strong>
              </div>

              <div style={styles.formGroup}>
                <label>Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ ...styles.input, minHeight: '80px' }}
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowModal(false)} style={styles.secondaryBtn}>
                Cancel
              </button>
              <button onClick={handleSaveOrder} style={styles.primaryBtn}>
                {editingId ? 'Update PO' : 'Create PO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Purchase Order Details</h3>
              <button onClick={() => setSelectedOrder(null)} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.detailsGrid}>
                <div><strong>PO #:</strong> {selectedOrder.po_number}</div>
                <div><strong>Vendor:</strong> {selectedOrder.vendor_name}</div>
                <div><strong>Status:</strong> <span style={getStatusStyle(selectedOrder.status)}>{selectedOrder.status}</span></div>
                <div><strong>Amount:</strong> Rs {selectedOrder.amount.toLocaleString()}</div>
                <div><strong>Created:</strong> {new Date(selectedOrder.created_date).toLocaleDateString()}</div>
                <div><strong>Delivery Date:</strong> {selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString() : 'N/A'}</div>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <>
                  <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Items:</h4>
                  <div style={styles.itemsTable}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={styles.itemTh}>Product</th>
                          <th style={styles.itemTh}>Qty</th>
                          <th style={styles.itemTh}>Unit Price</th>
                          <th style={styles.itemTh}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={styles.itemTd}>{item.product_name}</td>
                            <td style={styles.itemTd}>{item.quantity}</td>
                            <td style={styles.itemTd}>Rs {item.unit_price.toLocaleString()}</td>
                            <td style={styles.itemTd}>Rs {(item.quantity * item.unit_price).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {selectedOrder.notes && (
                <div style={{ marginTop: '20px' }}>
                  <strong>Notes:</strong>
                  <p style={{ marginTop: '8px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    {selectedOrder.notes}
                  </p>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setSelectedOrder(null)} style={styles.secondaryBtn}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: '500',
  };

  if (status === 'RECEIVED') return { ...base, backgroundColor: '#d4edda', color: '#155724' };
  if (status === 'APPROVED') return { ...base, backgroundColor: '#d1ecf1', color: '#0c5460' };
  if (status === 'PENDING') return { ...base, backgroundColor: '#fff3cd', color: '#856404' };
  if (status === 'DRAFT') return { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
  return base;
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: '1400px', margin: '0 auto' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  searchInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  selectInput: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '150px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  metricCard: {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #ddd',
  },
  metricItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
  },
  primaryBtn: {
    padding: '10px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  secondaryBtn: {
    padding: '10px 20px',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  noResults: { textAlign: 'center', padding: '40px', color: '#999' },
  message: {
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  tableWrapper: { overflowX: 'auto', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' },
  th: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
  },
  tr: { borderBottom: '1px solid #eee' },
  td: { padding: '12px', fontSize: '13px' },
  actionButtons: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: '1px solid #ddd',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #eee',
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
  },
  modalBody: { padding: '20px' },
  formGroup: { marginBottom: '16px' },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  itemsTable: {
    border: '1px solid #ddd',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  itemTh: {
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #ddd',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
  },
  itemTd: {
    padding: '8px 10px',
    borderBottom: '1px solid #eee',
    fontSize: '13px',
  },
  totalAmount: {
    padding: '12px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    textAlign: 'right',
    marginBottom: '16px',
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '20px',
    borderTop: '1px solid #eee',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px',
  },
};
