import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface Brand {
  id: number;
  name: string;
  isActive: boolean;
  products?: Array<{ id: number; name: string; code: string }>;
}

export function BrandsScreen() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getBrands();
      setBrands(data);
    } catch (err) {
      setError('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Brand name is required');
      return;
    }

    try {
      if (editingId) {
        await apiClient.updateBrand(editingId, formData);
        setSuccess('Brand updated');
      } else {
        await apiClient.createBrand(formData);
        setSuccess('Brand created');
      }
      setFormData({ name: '' });
      setEditingId(null);
      loadBrands();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Error saving brand');
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setFormData({ name: brand.name });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;

    try {
      await apiClient.deleteBrand(id);
      setSuccess('Brand deleted');
      loadBrands();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Error deleting brand');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '' });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏷️ Brands</h2>

      {error && <div style={styles.alert.error}>{error}</div>}
      {success && <div style={styles.alert.success}>{success}</div>}

      <form onSubmit={handleAddEdit} style={styles.form}>
        <input
          type="text"
          placeholder="Brand Name"
          value={formData.name}
          onChange={(e) => setFormData({ name: e.target.value })}
          style={styles.input}
        />
        <button type="submit" style={styles.button.primary}>
          {editingId ? 'Update Brand' : 'Add Brand'}
        </button>
        {editingId && (
          <button type="button" onClick={handleCancel} style={styles.button.secondary}>
            Cancel
          </button>
        )}
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Brand Name</th>
                <th style={styles.th}>Products</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id}>
                  <td style={styles.td}>{brand.name}</td>
                  <td style={styles.td}>{brand.products?.length || 0}</td>
                  <td style={styles.td}>
                    <span style={brand.isActive ? styles.badge.active : styles.badge.inactive}>
                      {brand.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleEdit(brand)} style={styles.button.small}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(brand.id)} style={styles.button.danger}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
  },
  title: {
    marginBottom: '20px',
    color: '#333',
  },
  form: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: '200px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  button: {
    primary: {
      padding: '10px 20px',
      background: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '14px',
    },
    secondary: {
      padding: '10px 20px',
      background: '#999',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '14px',
    },
    small: {
      padding: '6px 12px',
      background: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      marginRight: '5px',
    },
    danger: {
      padding: '6px 12px',
      background: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
    },
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px',
    background: '#f5f5f5',
    textAlign: 'left' as const,
    fontWeight: 600,
    borderBottom: '2px solid #ddd',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #ddd',
  },
  badge: {
    active: {
      display: 'inline-block',
      padding: '4px 8px',
      background: '#d4edda',
      color: '#155724',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
    },
    inactive: {
      display: 'inline-block',
      padding: '4px 8px',
      background: '#f8d7da',
      color: '#721c24',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
    },
  },
  alert: {
    error: {
      padding: '12px',
      background: '#f8d7da',
      color: '#721c24',
      borderRadius: '4px',
      marginBottom: '15px',
    },
    success: {
      padding: '12px',
      background: '#d4edda',
      color: '#155724',
      borderRadius: '4px',
      marginBottom: '15px',
    },
  },
};
