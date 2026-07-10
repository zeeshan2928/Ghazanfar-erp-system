import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface UserOption {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface PermissionEntry {
  key: string;
  label: string;
  granted: boolean;
}

interface PermissionModule {
  module: string;
  label: string;
  permissions: PermissionEntry[];
}

export function SettingsScreen() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) loadOverrides(parseInt(selectedUserId));
  }, [selectedUserId]);

  async function loadUsers() {
    try {
      const result = await apiClient.getUsers(0, 100);
      setUsers((result.data || []).filter((u: UserOption) => u.role !== 'ADMIN'));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  async function loadOverrides(userId: number) {
    try {
      setLoading(true);
      const result = await apiClient.getUserPermissionOverrides(userId);
      setModules(result || []);
    } catch (error) {
      console.error('Failed to load permission overrides:', error);
      showMessage('error', 'Failed to load permissions for this user');
    } finally {
      setLoading(false);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  function toggle(moduleIdx: number, permIdx: number) {
    setModules((prev) => {
      const next = [...prev];
      const mod = { ...next[moduleIdx] };
      const perms = [...mod.permissions];
      perms[permIdx] = { ...perms[permIdx], granted: !perms[permIdx].granted };
      mod.permissions = perms;
      next[moduleIdx] = mod;
      return next;
    });
  }

  async function handleSave() {
    if (!selectedUserId) return;
    try {
      setSaving(true);
      const overrides = modules.flatMap((m) => m.permissions.map((p) => ({ key: p.key, granted: p.granted })));
      await apiClient.setUserPermissionOverrides(parseInt(selectedUserId), overrides);
      showMessage('success', 'Permissions saved');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to save permissions';
      showMessage('error', msg);
    } finally {
      setSaving(false);
    }
  }

  const selectedUser = users.find((u) => u.id === parseInt(selectedUserId));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>⚙️ Settings — User Permissions</h2>
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

      <div style={styles.userPicker}>
        <label>Select a user (admins are not shown — their access can't be restricted):</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          style={styles.select}
        >
          <option value="">— Select a user —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName} ({u.role})
            </option>
          ))}
        </select>
      </div>

      {!selectedUserId ? (
        <p style={styles.empty}>Select a user above to view and edit their permissions.</p>
      ) : loading ? (
        <p style={styles.empty}>Loading...</p>
      ) : (
        <>
          <p style={styles.hint}>
            Editing permissions for <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>.
            A permission left ON means the action is allowed (the default). Turn a toggle OFF to
            block that specific action for this user.
          </p>

          {modules.map((mod, moduleIdx) => (
            <div key={mod.module} style={styles.moduleCard}>
              <h4 style={styles.moduleTitle}>{mod.label}</h4>
              <div style={styles.permGrid}>
                {mod.permissions.map((perm, permIdx) => (
                  <label key={perm.key} style={styles.permRow}>
                    <input
                      type="checkbox"
                      checked={perm.granted}
                      onChange={() => toggle(moduleIdx, permIdx)}
                      style={{ marginRight: '10px' }}
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div style={styles.saveBar}>
            <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: '900px', margin: '0 auto' },
  header: { marginBottom: '20px' },
  message: { padding: '12px 16px', borderRadius: '4px', marginBottom: '20px', fontSize: '14px' },
  userPicker: { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px' },
  select: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', maxWidth: '400px' },
  empty: { textAlign: 'center', padding: '40px', color: '#999' },
  hint: { fontSize: '13px', color: '#666', marginBottom: '20px', lineHeight: 1.5, backgroundColor: '#f0f0f0', padding: '12px', borderRadius: '4px' },
  moduleCard: { backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', padding: '16px', marginBottom: '16px' },
  moduleTitle: { margin: '0 0 12px 0', fontSize: '15px', borderBottom: '1px solid #eee', paddingBottom: '8px' },
  permGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' },
  permRow: { display: 'flex', alignItems: 'center', fontSize: '13px', cursor: 'pointer' },
  saveBar: { display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingBottom: '40px' },
  saveBtn: { padding: '12px 28px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
};
