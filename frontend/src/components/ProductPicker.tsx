import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api';
import { FilterOperator, DataType } from '../types/filters';

interface ProductOption {
  id: number;
  name: string;
  code: string;
}

interface ProductPickerProps {
  value: number | null;
  // "code - name" to show initially without a lookup round-trip - the parent
  // already has this from whatever loaded the surrounding screen.
  valueLabel?: string;
  onChange: (product: ProductOption) => void;
  placeholder?: string;
}

// A server-side, debounced typeahead - NOT the searchProducts({take:500})
// dump copy-pasted into six other screens, which silently truncates past 500
// products and re-fetches on every mount. This queries on demand, 20 at a
// time, only once the user has typed something.
export function ProductPicker({ value, valueLabel, onChange, placeholder }: ProductPickerProps) {
  const [query, setQuery] = useState(valueLabel ?? '');
  const [results, setResults] = useState<ProductOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(valueLabel ?? '');
  }, [valueLabel, value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleQueryChange(next: string) {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.searchProducts({
          primaryFilter: { field: 'name', operator: FilterOperator.IS_LIKE, value: next, dataType: DataType.TEXT },
          skip: 0,
          take: 20,
        });
        setResults(res.data ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  return (
    <div ref={boxRef} style={styles.wrapper}>
      <input
        style={styles.input}
        value={query}
        placeholder={placeholder ?? 'Type to search products…'}
        onChange={e => handleQueryChange(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true); }}
      />
      {loading && <div style={styles.loadingTag}>searching…</div>}
      {open && results.length > 0 && (
        <div style={styles.dropdown}>
          {results.map(p => (
            <div
              key={p.id}
              style={styles.option}
              onMouseDown={() => {
                onChange(p);
                setQuery(`${p.code} - ${p.name}`);
                setOpen(false);
              }}
            >
              <span style={styles.optCode}>{p.code}</span>
              <span>{p.name}</span>
              {p.id === value && <span style={styles.optSelected}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative', minWidth: '220px' },
  input: { width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' },
  loadingTag: { position: 'absolute', right: '8px', top: '8px', fontSize: '11px', color: '#999' },
  dropdown: { position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.12)' },
  option: { display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 10px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' },
  optCode: { color: '#666', fontSize: '11px', minWidth: '80px' },
  optSelected: { marginLeft: 'auto', color: '#16a34a' },
};
