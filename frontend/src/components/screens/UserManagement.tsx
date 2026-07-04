import React, { useState, useEffect } from 'react';
import { Pagination } from '../Pagination';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  organization?: string;
  created_date: string;
  last_login?: string;
}

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';
  organization: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

const rolePermissions: Record<string, string[]> = {
  ADMIN: [
    'View All Data',
    'Create/Edit/Delete Records',
    'Manage Users',
    'View Reports',
    'Export/Import Data',
    'System Settings',
  ],
  MANAGER: [
    'View All Data',
    'Create/Edit Records',
    'View Reports',
    'Export/Import Data',
  ],
  STAFF: [
    'View Own Data',
    'Create/Edit Own Records',
    'View Basic Reports',
  ],
  VIEWER: [
    'View All Data',
    'View Reports Only',
  ],
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: 'Ahmed Hassan',
      email: 'ahmed@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      organization: 'Main Office',
      created_date: '2024-01-01',
      last_login: '2024-12-19',
    },
    {
      id: 2,
      name: 'Fatima Khan',
      email: 'fatima@example.com',
      role: 'MANAGER',
      status: 'ACTIVE',
      organization: 'Sales Department',
      created_date: '2024-01-05',
      last_login: '2024-12-18',
    },
    {
      id: 3,
      name: 'Ali Muhammad',
      email: 'ali@example.com',
      role: 'STAFF',
      status: 'ACTIVE',
      organization: 'Warehouse',
      created_date: '2024-02-10',
      last_login: '2024-12-19',
    },
    {
      id: 4,
      name: 'Aisha Malik',
      email: 'aisha@example.com',
      role: 'VIEWER',
      status: 'INACTIVE',
      organization: 'Finance',
      created_date: '2024-03-15',
      last_login: '2024-12-01',
    },
  ]);
  const [total, setTotal] = useState(users.length);
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showPermissions, setShowPermissions] = useState<number | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STAFF',
    organization: '',
    status: 'ACTIVE',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, filterRole, filterStatus]);

  function filterUsers() {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter((u) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole) {
      filtered = filtered.filter((u) => u.role === filterRole);
    }

    if (filterStatus) {
      filtered = filtered.filter((u) => u.status === filterStatus);
    }

    setTotal(filtered.length);
    // In a real app, this would be paginated on the server
    // For now, client-side pagination
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  function resetForm() {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'STAFF',
      organization: '',
      status: 'ACTIVE',
    });
    setEditingId(null);
  }

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(user: User) {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization || '',
      status: user.status,
    });
    setEditingId(user.id);
    setShowModal(true);
  }

  function validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  async function handleSaveUser() {
    if (!formData.name || !formData.email || !formData.organization) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }

    if (!validateEmail(formData.email)) {
      showMessage('error', 'Invalid email address');
      return;
    }

    if (!editingId && !formData.password) {
      showMessage('error', 'Password is required for new users');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }

    if (formData.password && formData.password.length < 8) {
      showMessage('error', 'Password must be at least 8 characters long');
      return;
    }

    try {
      if (editingId) {
        const userIndex = users.findIndex((u) => u.id === editingId);
        if (userIndex >= 0) {
          users[userIndex] = {
            ...users[userIndex],
            name: formData.name,
            email: formData.email,
            role: formData.role,
            organization: formData.organization,
            status: formData.status,
          };
          setUsers([...users]);
          showMessage('success', 'User updated successfully');
        }
      } else {
        const newUser: User = {
          id: Math.max(...users.map((u) => u.id), 0) + 1,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          organization: formData.organization,
          created_date: new Date().toISOString().split('T')[0],
        };
        setUsers([...users, newUser]);
        showMessage('success', 'User created successfully');
      }

      setShowModal(false);
      resetForm();
      filterUsers();
    } catch (error) {
      showMessage('error', 'Failed to save user');
      console.error(error);
    }
  }

  function handleDeleteUser(userId: number) {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      setUsers(users.filter((u) => u.id !== userId));
      showMessage('success', 'User deleted successfully');
      filterUsers();
    } catch (error) {
      showMessage('error', 'Failed to delete user');
      console.error(error);
    }
  }

  function handleChangePassword(userId: number) {
    if (!newPassword || !confirmPassword) {
      showMessage('error', 'Please enter new password and confirmation');
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters long');
      return;
    }

    try {
      // In a real app, this would call the API
      showMessage('success', 'Password changed successfully');
      setShowPasswordChange(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showMessage('error', 'Failed to change password');
      console.error(error);
    }
  }

  function toggleUserStatus(user: User) {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const userIndex = users.findIndex((u) => u.id === user.id);
    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], status: newStatus };
      setUsers([...users]);
      showMessage('success', `User ${newStatus.toLowerCase()}`);
      filterUsers();
    }
  }

  function getDisplayedUsers() {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter((u) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole) {
      filtered = filtered.filter((u) => u.role === filterRole);
    }

    if (filterStatus) {
      filtered = filtered.filter((u) => u.status === filterStatus);
    }

    return filtered.slice(skip, skip + take);
  }

  const displayedUsers = getDisplayedUsers();
  const roles = ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'];
  const statuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

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
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={styles.selectInput}
        >
          <option value="">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.selectInput}
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div style={styles.statsGrid}>
        <StatCard label="Total Users" value={total} icon="👥" />
        <StatCard label="Active Users" value={users.filter((u) => u.status === 'ACTIVE').length} icon="✅" />
        <StatCard label="Admins" value={users.filter((u) => u.role === 'ADMIN').length} icon="👑" />
        <StatCard label="Managers" value={users.filter((u) => u.role === 'MANAGER').length} icon="📋" />
      </div>

      {displayedUsers.length === 0 ? (
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
                  <th style={styles.th}>Organization</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Last Login</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((user) => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}><strong>{user.name}</strong></td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>
                      <span style={getRoleStyle(user.role)}>{user.role}</span>
                    </td>
                    <td style={styles.td}>{user.organization || '-'}</td>
                    <td style={styles.td}>
                      <span style={getStatusStyle(user.status)}>{user.status}</span>
                    </td>
                    <td style={styles.td}>{new Date(user.created_date).toLocaleDateString()}</td>
                    <td style={styles.td}>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => setShowPermissions(showPermissions === user.id ? null : user.id)}
                          style={styles.actionBtn}
                          title="View Permissions"
                        >
                          🔑
                        </button>
                        <button
                          onClick={() => setShowPasswordChange(showPasswordChange === user.id ? null : user.id)}
                          style={styles.actionBtn}
                          title="Change Password"
                        >
                          🔐
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          style={styles.actionBtn}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user)}
                          style={styles.actionBtn}
                          title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          {user.status === 'ACTIVE' ? '🔒' : '🔓'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
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

          {showPermissions && (
            <div style={styles.expandedRow}>
              <div style={styles.expandedContent}>
                <h4>Permissions for {users.find((u) => u.id === showPermissions)?.role}</h4>
                <div style={styles.permissionsGrid}>
                  {rolePermissions[users.find((u) => u.id === showPermissions)?.role || 'VIEWER']?.map((perm) => (
                    <div key={perm} style={styles.permissionItem}>
                      <span style={styles.permissionCheck}>✓</span>
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showPasswordChange && (
            <div style={styles.expandedRow}>
              <div style={styles.expandedContent}>
                <h4>Change Password</h4>
                <div style={styles.passwordForm}>
                  <div style={styles.formGroup}>
                    <label>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={styles.input}
                      placeholder="Enter new password (min 8 characters)"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={styles.input}
                      placeholder="Confirm password"
                    />
                  </div>
                  <div style={styles.actionButtons}>
                    <button
                      onClick={() => setShowPasswordChange(null)}
                      style={styles.secondaryBtn}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleChangePassword(showPasswordChange)}
                      style={styles.primaryBtn}
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              <div style={styles.formGroup}>
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  placeholder="Enter full name"
                />
              </div>

              <div style={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={styles.input}
                  placeholder="Enter email address"
                />
              </div>

              <div style={styles.formGroup}>
                <label>Organization *</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  style={styles.input}
                  placeholder="Enter organization name"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    style={styles.input}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label>Status *</label>
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

              {!editingId && (
                <>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label>Password *</label>
                      <input
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        style={styles.input}
                        placeholder="Enter password (min 8 characters)"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label>Confirm Password *</label>
                      <input
                        type="password"
                        value={formData.confirmPassword || ''}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        style={styles.input}
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={styles.roleInfo}>
                <p><strong>Selected Role Permissions:</strong></p>
                <ul style={styles.permissionsList}>
                  {rolePermissions[formData.role].map((perm) => (
                    <li key={perm}>{perm}</li>
                  ))}
                </ul>
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

  if (role === 'ADMIN') return { ...base, backgroundColor: '#ffe5e5', color: '#721c24' };
  if (role === 'MANAGER') return { ...base, backgroundColor: '#cfe2ff', color: '#084298' };
  if (role === 'STAFF') return { ...base, backgroundColor: '#e7d4f5', color: '#711a87' };
  if (role === 'VIEWER') return { ...base, backgroundColor: '#fff3cd', color: '#856404' };
  return base;
}

function getStatusStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: '500',
  };

  if (status === 'ACTIVE') return { ...base, backgroundColor: '#d4edda', color: '#155724' };
  if (status === 'INACTIVE') return { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
  if (status === 'SUSPENDED') return { ...base, backgroundColor: '#f8d7da', color: '#721c24' };
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
  expandedRow: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    margin: '12px 0',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  expandedContent: {},
  permissionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginTop: '12px',
  },
  permissionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '13px',
  },
  permissionCheck: { color: '#28a745', fontWeight: 'bold', fontSize: '16px' },
  passwordForm: { marginTop: '12px' },
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
  roleInfo: {
    padding: '12px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    marginTop: '16px',
  },
  permissionsList: {
    margin: '8px 0 0 20px',
    fontSize: '13px',
    color: '#555',
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '20px',
    borderTop: '1px solid #eee',
  },
};
