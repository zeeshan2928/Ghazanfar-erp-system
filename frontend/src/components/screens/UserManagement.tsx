import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { Pagination } from '../Pagination';

const ROLES = ['ADMIN', 'SALESMAN', 'WAREHOUSE', 'ACCOUNTANT', 'MANAGER', 'DATA_ENTRY'];

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  canViewFinancials: boolean;
  isActive: boolean;
  createdAt: string;
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  canViewFinancials: boolean;
}

const EMPTY_FORM: UserFormData = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  role: 'SALESMAN',
  canViewFinancials: false,
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, [skip, take, searchTerm]);

  async function loadUsers() {
    try {
      setLoading(true);
      const result = await apiClient.getUsers(skip, take, searchTerm || undefined);
      setUsers(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Failed to load users:', error);
      showMessage('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  function openCreateModal() {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(user: User) {
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: '',
      role: user.role,
      canViewFinancials: user.canViewFinancials,
    });
    setEditingId(user.id);
    setShowModal(true);
  }

  async function handleSaveUser() {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }
    if (!editingId && !formData.password) {
      showMessage('error', 'Password is required for new users');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      showMessage('error', 'Password must be at least 6 characters');
      return;
    }

    try {
      if (editingId) {
        const payload: any = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          canViewFinancials: formData.canViewFinancials,
        };
        if (formData.password) payload.password = formData.password;
        await apiClient.updateUser(editingId, payload);
        showMessage('success', 'User updated successfully');
      } else {
        await apiClient.createUser({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          role: formData.role,
          canViewFinancials: formData.canViewFinancials,
        });
        showMessage('success', 'User created successfully');
      }
      setShowModal(false);
      await loadUsers();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to save user';
      showMessage('error', msg);
    }
  }

  async function handleDeactivate(user: User) {
    if (!window.confirm(`Deactivate ${user.firstName} ${user.lastName}? They will no longer be able to log in.`)) return;
    try {
      await apiClient.deleteUser(user.id);
      showMessage('success', 'User deactivated');
      await loadUsers();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to deactivate user';
      showMessage('error', msg);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>👥 User Management</h2>
        <button onClick={openCreateModal} style={styles.primaryBtn}>
          + Create New User
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
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setSkip(0); }}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.statsGrid}>
        <StatCard label="Total Users" value={total} icon="👥" />
        <StatCard label="Active" value={users.filter((u) => u.isActive).length} icon="✅" />
        <StatCard label="Can View Financials" value={users.filter((u) => u.canViewFinancials).length} icon="💰" />
      </div>

      {loading ? (
        <p style={styles.noResults}>Loading...</p>
      ) : users.length === 0 ? (
        <p style={styles.noResults}>No users found</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Financial Access</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}><strong>{user.firstName} {user.lastName}</strong></td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>
                      <span style={getRoleStyle(user.role)}>{user.role}</span>
                    </td>
                    <td style={styles.td}>{user.canViewFinancials ? '💰 Yes' : '—'}</td>
                    <td style={styles.td}>
                      <span style={getStatusStyle(user.isActive)}>{user.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={styles.td}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button onClick={() => openEditModal(user)} style={styles.actionBtn} title="Edit">✏️</button>
                        {user.isActive && (
                          <button
                            onClick={() => handleDeactivate(user)}
                            style={{ ...styles.actionBtn, color: '#e74c3c' }}
                            title="Deactivate"
                          >
                            🔒
                          </button>
                        )}
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
              <h3>{editingId ? 'Edit User' : 'Create New User'}</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>{editingId ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={styles.input}
                  placeholder="Min 6 characters"
                />
              </div>

              <div style={styles.formGroup}>
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={styles.input}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.canViewFinancials}
                    onChange={(e) => setFormData({ ...formData, canViewFinancials: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Can View Financials
                </label>
                <p style={styles.hint}>
                  Grants access to the Income Statement, Balance Sheet, Vendor pricing, and cost
                  data (Products, Purchase Orders) anywhere in the app. Independent of role — grant
                  this only to trusted individuals, regardless of what role they otherwise hold.
                </p>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowModal(false)} style={styles.secondaryBtn}>
                Cancel
              </button>
              <button onClick={handleSaveUser} style={styles.primaryBtn}>
                {editingId ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function getRoleStyle(role: string): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: '500',
  };
  const colors: Record<string, { bg: string; fg: string }> = {
    ADMIN: { bg: '#ffe5e5', fg: '#721c24' },
    MANAGER: { bg: '#cfe2ff', fg: '#084298' },
    ACCOUNTANT: { bg: '#e7d4f5', fg: '#711a87' },
    SALESMAN: { bg: '#d4edda', fg: '#155724' },
    WAREHOUSE: { bg: '#fff3cd', fg: '#856404' },
    DATA_ENTRY: { bg: '#e2e3e5', fg: '#383d41' },
  };
  const c = colors[role] || { bg: '#e2e3e5', fg: '#383d41' };
  return { ...base, backgroundColor: c.bg, color: c.fg };
}

function getStatusStyle(isActive: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: '500',
  };
  return isActive
    ? { ...base, backgroundColor: '#d4edda', color: '#155724' }
    : { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  statCard: {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    textAlign: 'center',
  },
  statIcon: { fontSize: '24px', marginBottom: '8px' },
  statLabel: { fontSize: '12px', color: '#666', marginBottom: '6px' },
  statValue: { fontSize: '24px', fontWeight: 'bold', color: '#333' },
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
  message: {
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  noResults: { textAlign: 'center', padding: '40px', color: '#999' },
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
  hint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '6px',
    lineHeight: 1.4,
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '20px',
    borderTop: '1px solid #eee',
  },
};
