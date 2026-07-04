import React, { useState, useEffect } from 'react';
import { Pagination } from '../Pagination';
import { apiClient } from '../../services/api';

interface Bill {
  id: number;
  bill_number: string;
  customer_name: string;
  amount: number;
  bill_date: string;
  status: 'DRAFT' | 'FINALIZED' | 'PAID';
  payment_method?: string;
  employee_name?: string;
  due_date?: string;
  notes?: string;
}

interface BillFormData {
  customer_name: string;
  amount: number;
  bill_date: string;
  status: 'DRAFT' | 'FINALIZED' | 'PAID';
  payment_method?: string;
  due_date?: string;
  notes?: string;
}

export function BillsManagement() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [formData, setFormData] = useState<BillFormData>({
    customer_name: '',
    amount: 0,
    bill_date: new Date().toISOString().split('T')[0],
    status: 'DRAFT',
    payment_method: 'CASH',
    due_date: '',
    notes: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchBills();
  }, [skip, take, searchTerm, filterStatus]);

  async function fetchBills() {
    try {
      setLoading(true);
      const request = {
        skip,
        take,
        primaryFilter: searchTerm ? {
          field: 'bill_number',
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
      const result = await apiClient.searchBills(request);
      setBills(result.data);
      setTotal(result.total);
    } catch (error) {
      showMessage('error', 'Failed to load bills');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  function resetForm() {
    setFormData({
      customer_name: '',
      amount: 0,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      payment_method: 'CASH',
      due_date: '',
      notes: '',
    });
    setEditingId(null);
  }

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(bill: Bill) {
    setFormData({
      customer_name: bill.customer_name,
      amount: bill.amount,
      bill_date: bill.bill_date,
      status: bill.status,
      payment_method: bill.payment_method || 'CASH',
      due_date: bill.due_date || '',
      notes: bill.notes || '',
    });
    setEditingId(bill.id);
    setShowModal(true);
  }

  async function handleSaveBill() {
    if (!formData.customer_name || formData.amount <= 0) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }

    try {
      // In a real app, this would call actual API endpoints
      // For now, we'll simulate the operation
      console.log('Saving bill:', editingId ? 'Update' : 'Create', formData);

      if (editingId) {
        showMessage('success', 'Bill updated successfully');
      } else {
        showMessage('success', 'Bill created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchBills();
    } catch (error) {
      showMessage('error', 'Failed to save bill');
      console.error(error);
    }
  }

  async function handleDeleteBill(billId: number) {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;

    try {
      // In a real app, this would call the delete API
      console.log('Deleting bill:', billId);
      showMessage('success', 'Bill deleted successfully');
      fetchBills();
    } catch (error) {
      showMessage('error', 'Failed to delete bill');
      console.error(error);
    }
  }

  function handleViewInvoice(bill: Bill) {
    setSelectedBill(bill);
    setShowPdfPreview(true);
  }

  function exportToPdf(bill: Bill) {
    // Generate PDF data URL (simplified version)
    const pdfContent = generatePdfContent(bill);
    const element = document.createElement('a');
    element.href = 'data:text/plain,' + encodeURIComponent(pdfContent);
    element.download = `invoice-${bill.bill_number}.txt`;
    element.click();
    showMessage('success', 'Invoice exported successfully');
  }

  function generatePdfContent(bill: Bill): string {
    return `
INVOICE
========================================
Bill #: ${bill.bill_number}
Date: ${new Date(bill.bill_date).toLocaleDateString()}
Due Date: ${bill.due_date || 'N/A'}
Customer: ${bill.customer_name}
Amount: Rs ${bill.amount.toLocaleString()}
Status: ${bill.status}
Payment Method: ${bill.payment_method || 'N/A'}
Notes: ${bill.notes || 'N/A'}
========================================
    `.trim();
  }

  function updatePaymentStatus(bill: Bill) {
    const newStatus = bill.status === 'FINALIZED' ? 'PAID' : 'FINALIZED';
    openEditModal({ ...bill, status: newStatus as any });
  }

  const statuses = ['DRAFT', 'FINALIZED', 'PAID'];
  const paymentMethods = ['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>📄 Sales Bills Management</h2>
        <button onClick={openCreateModal} style={styles.primaryBtn}>
          + Create New Bill
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
          placeholder="Search by bill number..."
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

      {loading ? (
        <p style={styles.loading}>Loading bills...</p>
      ) : bills.length === 0 ? (
        <p style={styles.noResults}>No bills found. Create your first bill!</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Bill #</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Payment</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} style={styles.tr}>
                    <td style={styles.td}><strong>{bill.bill_number}</strong></td>
                    <td style={styles.td}>{bill.customer_name}</td>
                    <td style={styles.td}>Rs {bill.amount.toLocaleString()}</td>
                    <td style={styles.td}>{new Date(bill.bill_date).toLocaleDateString()}</td>
                    <td style={styles.td}>{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '-'}</td>
                    <td style={styles.td}>
                      <span style={getStatusStyle(bill.status)}>{bill.status}</span>
                    </td>
                    <td style={styles.td}>{bill.payment_method || '-'}</td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleViewInvoice(bill)}
                          style={styles.actionBtn}
                          title="View Invoice"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => exportToPdf(bill)}
                          style={styles.actionBtn}
                          title="Export PDF"
                        >
                          📥
                        </button>
                        <button
                          onClick={() => openEditModal(bill)}
                          style={styles.actionBtn}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => updatePaymentStatus(bill)}
                          style={styles.actionBtn}
                          title="Update Status"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => handleDeleteBill(bill.id)}
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
              <h3>{editingId ? 'Edit Bill' : 'Create New Bill'}</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label>Customer Name *</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  style={styles.input}
                  placeholder="Enter customer name"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>Amount (Rs) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    style={styles.input}
                    placeholder="0"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Bill Date *</label>
                  <input
                    type="date"
                    value={formData.bill_date}
                    onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    style={styles.input}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label>Payment Method</label>
                <select
                  value={formData.payment_method || ''}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  style={styles.input}
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label>Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ ...styles.input, minHeight: '100px' }}
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowModal(false)} style={styles.secondaryBtn}>
                Cancel
              </button>
              <button onClick={handleSaveBill} style={styles.primaryBtn}>
                {editingId ? 'Update Bill' : 'Create Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfPreview && selectedBill && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Invoice Preview</h3>
              <button onClick={() => setShowPdfPreview(false)} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.pdfPreview}>
              <div style={styles.invoiceContent}>
                <h2>INVOICE</h2>
                <hr style={{ borderTop: '2px solid #333', margin: '20px 0' }} />

                <div style={styles.invoiceRow}>
                  <div><strong>Bill #:</strong> {selectedBill.bill_number}</div>
                  <div><strong>Date:</strong> {new Date(selectedBill.bill_date).toLocaleDateString()}</div>
                </div>

                <div style={styles.invoiceRow}>
                  <div><strong>Customer:</strong> {selectedBill.customer_name}</div>
                  <div><strong>Status:</strong> {selectedBill.status}</div>
                </div>

                <div style={styles.invoiceRow}>
                  <div><strong>Amount:</strong> Rs {selectedBill.amount.toLocaleString()}</div>
                  <div><strong>Due Date:</strong> {selectedBill.due_date ? new Date(selectedBill.due_date).toLocaleDateString() : 'N/A'}</div>
                </div>

                {selectedBill.notes && (
                  <div style={styles.invoiceRow}>
                    <div><strong>Notes:</strong> {selectedBill.notes}</div>
                  </div>
                )}

                <hr style={{ borderTop: '2px solid #333', margin: '20px 0' }} />
                <div style={{ textAlign: 'center', marginTop: '30px', color: '#666' }}>
                  Thank you for your business!
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => exportToPdf(selectedBill)} style={styles.primaryBtn}>
                📥 Download PDF
              </button>
              <button onClick={() => setShowPdfPreview(false)} style={styles.secondaryBtn}>
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

  if (status === 'PAID') return { ...base, backgroundColor: '#d4edda', color: '#155724' };
  if (status === 'FINALIZED') return { ...base, backgroundColor: '#cfe2ff', color: '#084298' };
  if (status === 'DRAFT') return { ...base, backgroundColor: '#fff3cd', color: '#856404' };
  return { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
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
    maxWidth: '500px',
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
  formRow: { display: 'flex', gap: '12px' },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '20px',
    borderTop: '1px solid #eee',
  },
  pdfPreview: {
    padding: '30px',
    backgroundColor: '#f9f9f9',
    maxHeight: '600px',
    overflow: 'auto',
  },
  invoiceContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '4px',
    fontSize: '14px',
  },
  invoiceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    padding: '8px 0',
  },
};
