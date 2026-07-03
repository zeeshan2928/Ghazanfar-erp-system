import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { GatePass } from '../types/api';

export function GatePassDashboard({ warehouseId }: { warehouseId: number }) {
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGatePass, setSelectedGatePass] = useState<GatePass | null>(null);
  const [pickedQuantities, setPickedQuantities] = useState<Record<number, number>>({});
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchGatePasses();
  }, [warehouseId]);

  async function fetchGatePasses() {
    try {
      setLoading(true);
      const response = await apiClient.getGatePasses(warehouseId);
      setGatePasses(response.data);
    } catch (error) {
      console.error('Failed to fetch gate passes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!selectedGatePass) return;

    try {
      const pickedItems = selectedGatePass.items.map((item) => ({
        billLineId: item.billLineId,
        pickedQuantity: pickedQuantities[item.billLineId] || item.quantity,
      }));

      await apiClient.confirmGatePass(
        selectedGatePass.id,
        pickedItems,
        remarks
      );

      await fetchGatePasses();
      setSelectedGatePass(null);
      setPickedQuantities({});
      setRemarks('');
      alert('Gate pass confirmed successfully!');
    } catch (error) {
      console.error('Failed to confirm gate pass:', error);
      alert('Failed to confirm gate pass');
    }
  }

  async function handleReject() {
    if (!selectedGatePass) return;

    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await apiClient.rejectGatePass(selectedGatePass.id, reason);
      await fetchGatePasses();
      setSelectedGatePass(null);
      alert('Gate pass rejected successfully!');
    } catch (error) {
      console.error('Failed to reject gate pass:', error);
      alert('Failed to reject gate pass');
    }
  }

  return (
    <div style={styles.container}>
      <h2>📦 Gate Pass Management</h2>

      {loading ? (
        <p>Loading...</p>
      ) : !selectedGatePass ? (
        <div>
          <div style={styles.stats}>
            <div style={styles.stat}>
              <strong>Total Pending:</strong> {gatePasses.length}
            </div>
          </div>

          <div style={styles.gatePassList}>
            {gatePasses.map((gp) => (
              <div key={gp.id} style={styles.gatePassCard}>
                <div style={styles.header}>
                  <strong>{gp.gate_pass_number}</strong>
                  <span style={styles.badge}>{gp.status}</span>
                </div>
                <p>
                  <strong>Bill:</strong> {gp.bill.bill_number}
                </p>
                <p>
                  <strong>Customer:</strong> {gp.bill.customer.name}
                </p>
                <p>
                  <strong>Items:</strong> {gp.items.length} products
                </p>
                <p>
                  <strong>Amount:</strong> Rs. {gp.bill.total_amount / 100}
                </p>
                <button
                  style={styles.selectBtn}
                  onClick={() => setSelectedGatePass(gp)}
                >
                  Pick & Confirm →
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={styles.detail}>
          <button style={styles.backBtn} onClick={() => setSelectedGatePass(null)}>
            ← Back
          </button>

          <h3>{selectedGatePass.gate_pass_number}</h3>
          <p>
            <strong>Bill:</strong> {selectedGatePass.bill.bill_number}
          </p>
          <p>
            <strong>Customer:</strong> {selectedGatePass.bill.customer.name}
          </p>

          <h4>Items to Pick:</h4>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Required Qty</th>
                <th>Picked Qty</th>
              </tr>
            </thead>
            <tbody>
              {selectedGatePass.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.billLine.product.code}</td>
                  <td>{item.billLine.product.name}</td>
                  <td style={styles.rightAlign}>{item.quantity}</td>
                  <td style={styles.rightAlign}>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={pickedQuantities[item.billLineId] ?? item.quantity}
                      onChange={(e) =>
                        setPickedQuantities({
                          ...pickedQuantities,
                          [item.billLineId]: parseInt(e.target.value),
                        })
                      }
                      style={styles.input}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={styles.remarksSection}>
            <label>Remarks:</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any remarks..."
              style={styles.textarea}
            />
          </div>

          <div style={styles.buttonGroup}>
            <button style={styles.confirmBtn} onClick={handleConfirm}>
              ✓ Confirm Pickup
            </button>
            <button style={styles.rejectBtn} onClick={handleReject}>
              ✗ Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  stats: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  stat: {
    padding: '10px 15px',
    backgroundColor: '#f0f0f0',
    borderRadius: '5px',
  },
  gatePassList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px',
  },
  gatePassCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  badge: {
    padding: '5px 10px',
    backgroundColor: '#ffc107',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  selectBtn: {
    marginTop: '10px',
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  detail: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  backBtn: {
    marginBottom: '15px',
    padding: '8px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
    marginBottom: '15px',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  rightAlign: {
    textAlign: 'right',
  },
  input: {
    width: '70px',
    padding: '5px',
    borderRadius: '3px',
    border: '1px solid #ddd',
  },
  remarksSection: {
    marginTop: '15px',
    marginBottom: '15px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    marginTop: '5px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    fontFamily: 'Arial, sans-serif',
    minHeight: '80px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  confirmBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  rejectBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
