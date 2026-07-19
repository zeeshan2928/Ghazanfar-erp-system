import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import { isAdmin } from '../../utils/auth';

interface Province {
  id: number;
  name: string;
}

interface PendingCity {
  id: number;
  name: string;
  provinceId: number;
  province: { id: number; name: string };
  requestedByUser: { id: number; firstName: string; lastName: string; email: string } | null;
  createdAt: string;
}

interface CityRow {
  id: number;
  name: string;
  provinceId: number;
  province: { id: number; name: string };
}

export function LocationsScreen() {
  const admin = isAdmin();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provinceId, setProvinceId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [cities, setCities] = useState<CityRow[]>([]);
  const [pending, setPending] = useState<PendingCity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    apiClient.listProvinces().then(setProvinces).catch(() => setProvinces([]));
    if (admin) refreshPending();
  }, []);

  useEffect(() => {
    fetchCities();
  }, [provinceId, search]);

  async function fetchCities() {
    setLoadingCities(true);
    try {
      const res = await apiClient.searchCities({ search: search.trim() || undefined, provinceId: provinceId || undefined });
      setCities(res ?? []);
    } finally {
      setLoadingCities(false);
    }
  }

  async function refreshPending() {
    try {
      const res = await apiClient.listPendingCities();
      setPending(res ?? []);
    } catch {
      setPending([]);
    }
  }

  async function handleApprove(id: number) {
    setBusyId(id);
    try {
      await apiClient.approveCity(id);
      await Promise.all([refreshPending(), fetchCities()]);
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRename(city: PendingCity) {
    const name = window.prompt('City name', city.name);
    if (!name || name.trim() === '') return;
    setBusyId(city.id);
    try {
      await apiClient.updateCity(city.id, { name: name.trim() });
      await handleApprove(city.id);
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
      setBusyId(null);
    }
  }

  return (
    <div style={styles.container}>
      <h2>🗺️ Cities &amp; Provinces</h2>

      {admin && (
        <div style={styles.pendingCard}>
          <h3 style={styles.sectionTitle}>Pending city requests {pending.length > 0 && `(${pending.length})`}</h3>
          {pending.length === 0 ? (
            <p style={styles.muted}>No pending requests.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Province</th>
                  <th style={styles.th}>Requested by</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.name}</td>
                    <td style={styles.td}>{p.province.name}</td>
                    <td style={styles.td}>{p.requestedByUser ? `${p.requestedByUser.firstName} ${p.requestedByUser.lastName}` : '—'}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={styles.approveBtn} disabled={busyId === p.id} onClick={() => handleApprove(p.id)}>
                          {busyId === p.id ? '…' : '✅ Approve'}
                        </button>
                        <button style={styles.editBtn} disabled={busyId === p.id} onClick={() => handleRename(p)}>
                          ✏️ Edit &amp; approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div style={styles.browseCard}>
        <h3 style={styles.sectionTitle}>Browse approved cities</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <select style={styles.select} value={provinceId} onChange={(e) => setProvinceId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">All provinces</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            style={styles.input}
            placeholder="Search city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loadingCities ? (
          <p style={styles.muted}>Loading…</p>
        ) : cities.length === 0 ? (
          <p style={styles.muted}>No cities found.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Province</th>
              </tr>
            </thead>
            <tbody>
              {cities.map(c => (
                <tr key={c.id}>
                  <td style={styles.td}>{c.name}</td>
                  <td style={styles.td}>{c.province.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  sectionTitle: { margin: '0 0 10px' },
  muted: { color: '#888', fontSize: '13px' },
  pendingCard: { backgroundColor: '#fffaf0', border: '1px solid #f0d9a0', borderRadius: '8px', padding: '16px', marginBottom: '20px' },
  browseCard: { backgroundColor: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '16px' },
  select: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  input: { flex: 1, minWidth: '200px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px', backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left', fontSize: '12px', fontWeight: 600 },
  td: { padding: '8px 10px', fontSize: '13px', borderBottom: '1px solid #eee' },
  approveBtn: { padding: '6px 12px', backgroundColor: '#43e97b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  editBtn: { padding: '6px 12px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
};
