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

interface TehsilRow {
  id: number;
  name: string;
  cityId: number;
  city: { id: number; name: string; province: { id: number; name: string } };
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

  // Admin "create" tab: Province -> City -> Tehsil, in sequence. Each level's
  // dropdown only populates once its parent is picked, and creating a new
  // City here goes straight to APPROVED (this is the direct-admin path,
  // not the pending-request flow above) so a Tehsil can be added under it
  // in the same sitting.
  const [showManage, setShowManage] = useState(false);
  const [mgmtCities, setMgmtCities] = useState<CityRow[]>([]);
  const [tehsils, setTehsils] = useState<TehsilRow[]>([]);
  const [newCityProvinceId, setNewCityProvinceId] = useState<number | ''>('');
  const [newCityName, setNewCityName] = useState('');
  const [creatingCity, setCreatingCity] = useState(false);
  const [tehsilCityId, setTehsilCityId] = useState<number | ''>('');
  const [newTehsilName, setNewTehsilName] = useState('');
  const [creatingTehsil, setCreatingTehsil] = useState(false);

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

  // ---- Admin "create" tab: Province -> City -> Tehsil ----

  useEffect(() => {
    if (!newCityProvinceId) { setMgmtCities([]); return; }
    apiClient.searchCities({ provinceId: newCityProvinceId }).then((res) => setMgmtCities(res ?? [])).catch(() => setMgmtCities([]));
  }, [newCityProvinceId]);

  useEffect(() => {
    if (!tehsilCityId) { setTehsils([]); return; }
    apiClient.searchTehsils({ cityId: tehsilCityId }).then((res) => setTehsils(res ?? [])).catch(() => setTehsils([]));
  }, [tehsilCityId]);

  async function handleCreateCity() {
    if (!newCityProvinceId || !newCityName.trim()) return;
    setCreatingCity(true);
    try {
      await apiClient.createCityDirect({ name: newCityName.trim(), provinceId: newCityProvinceId });
      setNewCityName('');
      const res = await apiClient.searchCities({ provinceId: newCityProvinceId });
      setMgmtCities(res ?? []);
      await fetchCities();
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreatingCity(false);
    }
  }

  async function handleCreateTehsil() {
    if (!tehsilCityId || !newTehsilName.trim()) return;
    setCreatingTehsil(true);
    try {
      await apiClient.createTehsil({ name: newTehsilName.trim(), cityId: tehsilCityId });
      setNewTehsilName('');
      const res = await apiClient.searchTehsils({ cityId: tehsilCityId });
      setTehsils(res ?? []);
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreatingTehsil(false);
    }
  }

  async function handleDeactivateTehsil(id: number) {
    if (!window.confirm('Deactivate this tehsil?')) return;
    try {
      await apiClient.deactivateTehsil(id);
      if (tehsilCityId) {
        const res = await apiClient.searchTehsils({ cityId: tehsilCityId });
        setTehsils(res ?? []);
      }
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
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
        <div style={styles.browseCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={styles.sectionTitle}>Manage locations (Province → City → Tehsil)</h3>
            <button style={styles.editBtn} onClick={() => setShowManage(!showManage)}>
              {showManage ? 'Hide' : '➕ Create new'}
            </button>
          </div>

          {showManage && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
              <div>
                <div style={styles.stepLabel}>1. Create a city under a province</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <select style={styles.select} value={newCityProvinceId} onChange={(e) => setNewCityProvinceId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Select province…</option>
                    {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input
                    style={styles.input}
                    placeholder="New city name"
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    disabled={!newCityProvinceId}
                  />
                  <button style={styles.approveBtn} disabled={!newCityProvinceId || !newCityName.trim() || creatingCity} onClick={handleCreateCity}>
                    {creatingCity ? '…' : '➕ Add city'}
                  </button>
                </div>
                {newCityProvinceId && mgmtCities.length > 0 && (
                  <div style={styles.chipRow}>
                    {mgmtCities.map(c => <span key={c.id} style={styles.chip}>{c.name}</span>)}
                  </div>
                )}
              </div>

              <div>
                <div style={styles.stepLabel}>2. Create a tehsil under a city</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <select style={styles.select} value={tehsilCityId} onChange={(e) => setTehsilCityId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Select city…</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name} ({c.province.name})</option>)}
                  </select>
                  <input
                    style={styles.input}
                    placeholder="New tehsil name"
                    value={newTehsilName}
                    onChange={(e) => setNewTehsilName(e.target.value)}
                    disabled={!tehsilCityId}
                  />
                  <button style={styles.approveBtn} disabled={!tehsilCityId || !newTehsilName.trim() || creatingTehsil} onClick={handleCreateTehsil}>
                    {creatingTehsil ? '…' : '➕ Add tehsil'}
                  </button>
                </div>
                {tehsilCityId && (
                  tehsils.length === 0 ? (
                    <p style={styles.muted}>No tehsils yet for this city.</p>
                  ) : (
                    <table style={styles.table}>
                      <thead><tr><th style={styles.th}>Tehsil</th><th style={styles.th}></th></tr></thead>
                      <tbody>
                        {tehsils.map(t => (
                          <tr key={t.id}>
                            <td style={styles.td}>{t.name}</td>
                            <td style={styles.td}>
                              <button style={styles.dangerBtn} onClick={() => handleDeactivateTehsil(t.id)}>Deactivate</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
  dangerBtn: { padding: '5px 10px', backgroundColor: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 },
  stepLabel: { fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' },
  chipRow: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' },
  chip: { padding: '3px 10px', backgroundColor: '#eef0ff', color: '#4c51bf', borderRadius: '12px', fontSize: '11px' },
};
