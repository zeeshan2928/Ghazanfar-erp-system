import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api';
import { isAdmin } from '../utils/auth';

interface Province {
  id: number;
  name: string;
}

interface CityOption {
  id: number;
  name: string;
  provinceId: number;
  province: { id: number; name: string };
}

interface LocationPickerProps {
  cityId: number | null;
  // Shown initially without a lookup round-trip when the parent already
  // knows the name (e.g. editing a customer that already has a city).
  valueLabel?: string;
  onChange: (city: CityOption | null) => void;
}

// Cities/provinces are governed reference data (src/modules/locations), not
// free text - a province filters a searchable city typeahead. If nothing
// matches what's typed, an admin can add the city immediately; anyone else
// sends a request that lands as PENDING and notifies every admin, exactly
// per the workflow the user asked for.
export function LocationPicker({ cityId, valueLabel, onChange }: LocationPickerProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provinceId, setProvinceId] = useState<number | ''>('');
  const [query, setQuery] = useState(valueLabel ?? '');
  const [results, setResults] = useState<CityOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestedMsg, setRequestedMsg] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    apiClient.listProvinces().then((p: Province[]) => setProvinces(p)).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    setQuery(valueLabel ?? '');
  }, [valueLabel, cityId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function runSearch(next: string, pid: number | '') {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.searchCities({
          search: next.trim() || undefined,
          provinceId: pid || undefined,
        });
        setResults(res ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleQueryChange(next: string) {
    setQuery(next);
    setRequestedMsg('');
    runSearch(next, provinceId);
  }

  function handleProvinceChange(next: number | '') {
    setProvinceId(next);
    runSearch(query, next);
  }

  async function handleAddOrRequest() {
    if (!provinceId || !query.trim()) return;
    setSubmitting(true);
    try {
      if (isAdmin()) {
        const city = await apiClient.createCityDirect({ name: query.trim(), provinceId });
        const withProvince = { ...city, province: provinces.find(p => p.id === provinceId)! };
        onChange(withProvince);
        setQuery(city.name);
        setOpen(false);
      } else {
        await apiClient.requestCity({ name: query.trim(), provinceId });
        setRequestedMsg(`"${query.trim()}" was submitted for admin approval. You can select it here once approved.`);
        setOpen(false);
      }
    } catch (err: any) {
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  const exactMatch = results.some(r => r.name.toLowerCase() === query.trim().toLowerCase());
  const showAddOption = query.trim().length >= 2 && !exactMatch && !loading;

  return (
    <div style={styles.row}>
      <select
        style={styles.provinceSelect}
        value={provinceId}
        onChange={(e) => handleProvinceChange(e.target.value ? Number(e.target.value) : '')}
      >
        <option value="">All provinces</option>
        {provinces.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <div ref={boxRef} style={styles.wrapper}>
        <input
          style={styles.input}
          value={query}
          placeholder="Type to search city…"
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true); }}
        />
        {loading && <div style={styles.loadingTag}>searching…</div>}
        {open && (results.length > 0 || showAddOption) && (
          <div style={styles.dropdown}>
            {results.map(c => (
              <div
                key={c.id}
                style={styles.option}
                onMouseDown={() => {
                  onChange(c);
                  setQuery(c.name);
                  setOpen(false);
                }}
              >
                <span>{c.name}</span>
                <span style={styles.optProvince}>{c.province.name}</span>
                {c.id === cityId && <span style={styles.optSelected}>✓</span>}
              </div>
            ))}
            {showAddOption && (
              <div
                style={{ ...styles.option, ...(provinceId ? styles.optAdd : styles.optAddDisabled) }}
                onMouseDown={() => { if (provinceId) handleAddOrRequest(); }}
                title={provinceId ? undefined : 'Select a province first'}
              >
                {submitting
                  ? 'Submitting…'
                  : isAdmin()
                    ? `+ Add "${query.trim()}" as a new city`
                    : `+ Request "${query.trim()}" be added`}
              </div>
            )}
          </div>
        )}
      </div>
      {requestedMsg && <div style={styles.requestedMsg}>{requestedMsg}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '260px' },
  provinceSelect: { padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  wrapper: { position: 'relative' },
  input: { width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' },
  loadingTag: { position: 'absolute', right: '8px', top: '8px', fontSize: '11px', color: '#999' },
  dropdown: { position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.12)' },
  option: { display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 10px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' },
  optProvince: { marginLeft: 'auto', color: '#999', fontSize: '11px' },
  optSelected: { color: '#16a34a' },
  optAdd: { color: '#667eea', fontWeight: 600, cursor: 'pointer' },
  optAddDisabled: { color: '#bbb', cursor: 'not-allowed' },
  requestedMsg: { fontSize: '11px', color: '#856404', background: '#fff3cd', padding: '6px 8px', borderRadius: '4px' },
};
