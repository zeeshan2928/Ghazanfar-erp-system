import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface Warehouse {
  id: number;
  name: string;
  location: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

export function WarehousesScreen() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '' });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  async function fetchWarehouses() {
    try {
      setLoading(true);
      const response = await apiClient.getWarehouses();
      setWarehouses(Array.isArray(response) ? response : response.data || []);
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddWarehouse() {
    if (!formData.name.trim() || !formData.location.trim()) {
      alert('⚠️ Please fill in all fields');
      return;
    }

    try {
      await apiClient.createWarehouse({
        name: formData.name,
        location: formData.location,
      });
      setFormData({ name: '', location: '' });
      setShowAddForm(false);
      await fetchWarehouses();
      alert('✅ Warehouse created successfully!');
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>🏭 Warehouses</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} style={styles.addBtn}>
          {showAddForm ? '❌ Cancel' : '➕ Add Warehouse'}
        </button>
      </div>

      {showAddForm && (
        <div style={styles.formContainer}>
          <input
            type="text"
            placeholder="Warehouse Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            style={styles.input}
          />
          <button onClick={handleAddWarehouse} style={styles.submitBtn}>
            Save
          </button>
        </div>
      )}

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : warehouses.length === 0 ? (
        <p style={styles.noResults}>No warehouses found. Create one to get started!</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Location</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} style={styles.tr}>
                    <td style={styles.td}>{warehouse.id}</td>
                    <td style={styles.td}>{warehouse.name}</td>
                    <td style={styles.td}>{warehouse.location}</td>
                    <td style={styles.td}>
                      <span style={warehouse.isActive ? styles.active : styles.inactive}>
                        {warehouse.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(warehouse.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  addBtn: {
    padding: '10px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#f5f5f5',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: '150px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
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
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '20px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  th: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
  },
  tr: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '10px 12px',
    fontSize: '13px',
  },
  active: {
    padding: '4px 8px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: '500',
  },
  inactive: {
    padding: '4px 8px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: '500',
  },
};
