import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../services/api';
import { useGridArrowNav } from '../../utils/keyboardNav';

interface Candidate {
  itemName: string;
  transactionCount: number;
  totalRevenue: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  suggestedKind: 'PART' | 'SALE';
  confirmedKind: 'PART' | 'SALE' | null;
}

// Parts Review: items the tool believes are vendor-supplied components (not
// genuine sales) are pre-ticked; the user confirms/adjusts, and confirmed
// PARTS are excluded from sales/salesman/profit and reported separately with
// their value subtracted. Pre-flagging is by BOM component names (not price).
export function PartsReviewScreen() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [showOnlyParts, setShowOnlyParts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [newItem, setNewItem] = useState('');
  // Up/Down walks the PART checkboxes straight down the column.
  const gridRef = useRef<HTMLDivElement>(null);
  useGridArrowNav(gridRef);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await apiClient.getSalesPartsCandidates();
      const rows: Candidate[] = res.candidates || [];
      setCandidates(rows);
      // Pre-tick: confirmed PART, or (if never classified) suggested PART.
      const initial = new Set<string>();
      for (const c of rows) {
        const effective = c.confirmedKind ?? c.suggestedKind;
        if (effective === 'PART') initial.add(c.itemName);
      }
      setChecked(initial);
    } catch {
      setBanner({ kind: 'err', text: 'Failed to load candidates.' });
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter(c => {
      if (showOnlyParts && c.suggestedKind !== 'PART' && !checked.has(c.itemName)) return false;
      if (q && !c.itemName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [candidates, search, showOnlyParts, checked]);

  function toggle(name: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Add an arbitrary item name to exclude - even one not in the current data
  // (e.g. a product to keep out of future imports). It appears as a ticked
  // row and is persisted on Save, then auto-excludes any matching record now
  // and in future uploads.
  function addCustomItem() {
    const name = newItem.trim();
    if (!name) return;
    if (!candidates.some(c => c.itemName === name)) {
      setCandidates(prev => [
        { itemName: name, transactionCount: 0, totalRevenue: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, suggestedKind: 'PART', confirmedKind: null },
        ...prev,
      ]);
    }
    setChecked(prev => new Set(prev).add(name));
    setNewItem('');
    setSearch('');
  }

  async function save() {
    setSaving(true);
    setBanner(null);
    try {
      // Send an explicit decision for every candidate we showed a suggestion
      // for, so un-ticking a pre-flagged item is persisted as SALE.
      const relevant = candidates.filter(c => c.suggestedKind === 'PART' || c.confirmedKind !== null || checked.has(c.itemName));
      const items = relevant.map(c => ({ itemName: c.itemName, kind: (checked.has(c.itemName) ? 'PART' : 'SALE') as 'PART' | 'SALE' }));
      const res = await apiClient.classifySalesParts(items);
      setBanner({ kind: 'ok', text: `Saved. ${checked.size} item(s) marked as PARTS and excluded from genuine sales.` });
      await load();
      void res;
    } catch {
      setBanner({ kind: 'err', text: 'Failed to save classifications.' });
    } finally {
      setSaving(false);
    }
  }

  const excludedValue = candidates.filter(c => checked.has(c.itemName)).reduce((s, c) => s + c.totalRevenue, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.h2}>Parts Review — components supplied to vendors</h2>
          <p style={styles.sub}>
            Ticked items are treated as PARTS (not genuine sales): excluded from salesman/customer/profit and shown in the parts report, their value subtracted from total sales. Pre-flagged by matching your assembly BOM part names — untick anything that's actually a real product.
          </p>
        </div>
        <div style={styles.controls}>
          <button style={styles.saveBtn} onClick={save} disabled={saving || loading}>{saving ? 'Saving…' : 'Save classification'}</button>
        </div>
      </div>

      {banner && <div style={banner.kind === 'ok' ? styles.ok : styles.err}>{banner.text}</div>}

      <div style={styles.toolbar}>
        <input style={styles.search} placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        <label style={styles.checkLabel}>
          <input type="checkbox" checked={showOnlyParts} onChange={e => setShowOnlyParts(e.target.checked)} /> Show only suggested/marked parts
        </label>
        <span style={styles.counter}>{checked.size} marked as PART · excluded value ≈ {Math.round(excludedValue).toLocaleString()}</span>
      </div>

      <div style={styles.addRow}>
        <span style={{ fontSize: '13px', color: '#444' }}>Add a product to always exclude (now &amp; future imports):</span>
        <input
          style={styles.search}
          placeholder="exact item name…"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addCustomItem(); }}
        />
        <button style={styles.addBtn} onClick={addCustomItem} disabled={!newItem.trim()}>+ Add to exclusions</button>
        <span style={{ fontSize: '12px', color: '#888' }}>then click Save classification</span>
      </div>

      <div ref={gridRef} style={styles.card}>
        {loading ? <p>Loading…</p> : visible.length === 0 ? <p>No items match.</p> : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Part?</th>
                <th style={styles.th}>Item</th>
                <th style={styles.thR}>Avg price</th>
                <th style={styles.thR}>Price range</th>
                <th style={styles.thR}>Txns</th>
                <th style={styles.thR}>Total value</th>
                <th style={styles.th}>Suggestion</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(c => (
                <tr key={c.itemName} style={checked.has(c.itemName) ? styles.rowPart : undefined}>
                  <td style={styles.td}>
                    <input type="checkbox" checked={checked.has(c.itemName)} onChange={() => toggle(c.itemName)} />
                  </td>
                  <td style={styles.td}>{c.itemName}</td>
                  <td style={styles.tdR}>{c.avgPrice.toLocaleString()}</td>
                  <td style={styles.tdR}>{c.minPrice.toLocaleString()}–{c.maxPrice.toLocaleString()}</td>
                  <td style={styles.tdR}>{c.transactionCount.toLocaleString()}</td>
                  <td style={styles.tdR}>{Math.round(c.totalRevenue).toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={c.suggestedKind === 'PART' ? styles.pillPart : styles.pillSale}>{c.suggestedKind}</span>
                    {c.confirmedKind && <span style={styles.confirmed}>✓ saved {c.confirmedKind}</span>}
                  </td>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' },
  h2: { margin: 0 },
  sub: { margin: '6px 0 0', fontSize: '13px', color: '#555', maxWidth: '760px' },
  controls: { display: 'flex', gap: '10px' },
  saveBtn: { background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '9px 16px', cursor: 'pointer', fontWeight: 700 },
  ok: { background: '#dcfce7', color: '#166534', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' },
  err: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' },
  toolbar: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' },
  addRow: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px', padding: '10px 12px', background: '#f9fafb', border: '1px solid #eee', borderRadius: '6px' },
  addBtn: { background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
  search: { padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', minWidth: '220px' },
  checkLabel: { fontSize: '13px', color: '#444', display: 'flex', alignItems: 'center', gap: '6px' },
  counter: { fontSize: '13px', color: '#7c3aed', fontWeight: 600 },
  card: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '12px', color: '#555' },
  thR: { textAlign: 'right', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '12px', color: '#555' },
  td: { borderBottom: '1px solid #eee', padding: '7px 8px', fontSize: '13px' },
  tdR: { borderBottom: '1px solid #eee', padding: '7px 8px', fontSize: '13px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  rowPart: { background: '#fff7ed' },
  pillPart: { background: '#ffedd5', color: '#9a3412', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 },
  pillSale: { background: '#eef2ff', color: '#3730a3', borderRadius: '999px', padding: '2px 8px', fontSize: '11px' },
  confirmed: { marginLeft: '8px', fontSize: '11px', color: '#16a34a' },
};
