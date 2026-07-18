import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../services/api';
import { matchesTokens } from '../../utils/tokenSearch';
import { useGridArrowNav } from '../../utils/keyboardNav';

interface Component {
  id: number;
  name: string;
  code: string;
  productType: string;
  currentCost: number;
  changeCount: number;
}
interface HistoryRow {
  id: number;
  costPrice: number;
  effectiveFrom: string;
  note: string | null;
  changedBy: string | null;
  isCurrent: boolean;
}

const fmt = (n: number) => Math.round(n).toLocaleString();
const day = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

// Cost History: the timeline of what each component (part) cost, and from when.
// Recording a price change here preserves the old cost instead of overwriting
// it - so "what did this cost before 1 March?" is always answerable, and a
// recipe's cost on a past date stops drifting with today's prices. Purely a
// record alongside the live cost; it changes nothing the recipe/manufacturing
// engines already do.
export function CostHistoryScreen() {
  const [components, setComponents] = useState<Component[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Component | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Two distinct actions, deliberately separate: a price CHANGED from a date
  // (keeps the old value), vs the number was WRONG (fixes it, keeps no lie).
  const [mode, setMode] = useState<'change' | 'correct'>('change');
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  useGridArrowNav(gridRef);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await apiClient.getCostComponents();
      setComponents(res.components || []);
    } catch {
      setBanner({ kind: 'err', text: 'Failed to load components.' });
    } finally {
      setLoading(false);
    }
  }

  async function openComponent(c: Component) {
    setSelected(c);
    setLoadingHistory(true);
    setMode('change');
    setAmount('');
    setNote('');
    setEffectiveFrom(today());
    try {
      const res = await apiClient.getProductCostHistory(c.id);
      setHistory(res.history || []);
    } catch {
      setBanner({ kind: 'err', text: 'Failed to load the cost timeline.' });
    } finally {
      setLoadingHistory(false);
    }
  }

  const visible = useMemo(
    () => components.filter(c => matchesTokens(search, c.code, c.name)),
    [components, search],
  );

  async function save() {
    if (!selected) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value < 0) {
      setBanner({ kind: 'err', text: 'Enter a valid cost.' });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      const res =
        mode === 'change'
          ? await apiClient.changeProductCost(selected.id, { costPrice: value, effectiveFrom, note: note || undefined })
          : await apiClient.correctProductCost(selected.id, { costPrice: value, note: note || undefined });
      setHistory(res.history || []);
      setAmount('');
      setNote('');
      setBanner({
        kind: 'ok',
        text: mode === 'change'
          ? `Recorded: ${fmt(value)} effective ${effectiveFrom}. The earlier cost is preserved.`
          : `Corrected the latest entry to ${fmt(value)} (no new dated row added).`,
      });
      // reflect the new current cost + change count in the left list
      await load();
      setSelected(s => (s ? { ...s, currentCost: value } : s));
    } catch (e: any) {
      setBanner({ kind: 'err', text: e?.response?.data?.message || 'Could not save.' });
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entryId: number) {
    if (!selected) return;
    if (!window.confirm('Remove this cost entry? The timeline will re-point to the surrounding entries.')) return;
    try {
      const res = await apiClient.deleteProductCostEntry(selected.id, entryId);
      setHistory(res.history || []);
      await load();
      setBanner({ kind: 'ok', text: 'Entry removed.' });
    } catch (e: any) {
      setBanner({ kind: 'err', text: e?.response?.data?.message || 'Could not remove it.' });
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <h2 style={styles.h2}>Cost History — what each part cost, and from when</h2>
        <p style={styles.sub}>
          Record a part's price change with the date it took effect, and the earlier cost is kept — so you always know what
          it cost before. The live cost that recipes and manufacturing use is unchanged; this only adds the history alongside.
        </p>
      </div>

      {banner && <div style={banner.kind === 'ok' ? styles.ok : styles.err}>{banner.text}</div>}

      <div style={styles.cols}>
        {/* Left: the components whose cost feeds a build */}
        <div style={styles.leftCol}>
          <input style={styles.search} placeholder="Search parts…" value={search} onChange={e => setSearch(e.target.value)} />
          <div ref={gridRef} style={styles.listCard}>
            {loading ? (
              <p style={styles.muted}>Loading…</p>
            ) : visible.length === 0 ? (
              <p style={styles.muted}>No parts match.</p>
            ) : (
              <table style={styles.table}>
                <tbody>
                  {visible.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => openComponent(c)}
                      style={{ ...styles.row, ...(selected?.id === c.id ? styles.rowActive : {}) }}
                    >
                      <td style={styles.td}>
                        <div style={styles.partName}>{c.name}</div>
                        <div style={styles.partMeta}>#{c.code}{c.changeCount > 1 ? ` · ${c.changeCount - 1} change(s)` : ''}</div>
                      </td>
                      <td style={styles.tdR}>{fmt(c.currentCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: the selected part's timeline + the two edit actions */}
        <div style={styles.rightCol}>
          {!selected ? (
            <div style={styles.emptyRight}>Select a part on the left to see and edit its cost timeline.</div>
          ) : (
            <>
              <div style={styles.detailHead}>
                <div>
                  <h3 style={styles.detailTitle}>{selected.name}</h3>
                  <div style={styles.partMeta}>#{selected.code} · current cost <strong>{fmt(selected.currentCost)}</strong></div>
                </div>
              </div>

              {/* The editor */}
              <div style={styles.editor}>
                <div style={styles.modeToggle}>
                  <button
                    style={{ ...styles.modeBtn, ...(mode === 'change' ? styles.modeBtnActive : {}) }}
                    onClick={() => setMode('change')}
                  >
                    Price changed
                  </button>
                  <button
                    style={{ ...styles.modeBtn, ...(mode === 'correct' ? styles.modeBtnActive : {}) }}
                    onClick={() => setMode('correct')}
                  >
                    Fix a mistake
                  </button>
                </div>
                <p style={styles.modeHint}>
                  {mode === 'change'
                    ? 'The vendor changed the price. This keeps the old cost and starts the new one from the date you give.'
                    : 'The current number was simply wrong. This fixes it in place — no new dated entry, because there was never a real change.'}
                </p>
                <div style={styles.editRow}>
                  <label style={styles.field}>
                    <span style={styles.label}>New cost</span>
                    <input style={styles.input} type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 900" />
                  </label>
                  {mode === 'change' && (
                    <label style={styles.field}>
                      <span style={styles.label}>Effective from</span>
                      <input style={styles.input} type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
                    </label>
                  )}
                  <label style={{ ...styles.field, flex: 1 }}>
                    <span style={styles.label}>Note {mode === 'change' ? '(why)' : '(optional)'}</span>
                    <input style={styles.input} value={note} onChange={e => setNote(e.target.value)} placeholder={mode === 'change' ? 'vendor raised it 7%' : 'was mistyped'} />
                  </label>
                  <button style={styles.saveBtn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>

              {/* The timeline */}
              <div style={styles.timelineCard}>
                {loadingHistory ? (
                  <p style={styles.muted}>Loading…</p>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Effective from</th>
                        <th style={styles.thR}>Cost</th>
                        <th style={styles.th}>Note</th>
                        <th style={styles.th}>By</th>
                        <th style={styles.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(h => (
                        <tr key={h.id} style={h.isCurrent ? styles.currentRow : undefined}>
                          <td style={styles.td}>
                            {day(h.effectiveFrom)}
                            {h.isCurrent && <span style={styles.currentPill}>current</span>}
                          </td>
                          <td style={styles.tdR}><strong>{fmt(h.costPrice)}</strong></td>
                          <td style={styles.tdNote}>{h.note || '—'}</td>
                          <td style={styles.tdMuted}>{h.changedBy || '—'}</td>
                          <td style={styles.tdR}>
                            {history.length > 1 && (
                              <button style={styles.delBtn} title="Remove this entry" onClick={() => removeEntry(h.id)}>✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { padding: '4px' },
  head: { marginBottom: '12px' },
  h2: { margin: 0 },
  sub: { margin: '6px 0 0', fontSize: '13px', color: '#555', maxWidth: '860px', lineHeight: 1.5 },
  ok: { background: '#dcfce7', color: '#166534', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' },
  err: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' },
  cols: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px', alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '8px' },
  search: { padding: '9px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px' },
  listCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' },
  rightCol: { minWidth: 0 },
  emptyRight: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#888' },
  table: { width: '100%', borderCollapse: 'collapse' },
  row: { cursor: 'pointer', borderBottom: '1px solid #f0f0f0' },
  rowActive: { background: '#eef2ff' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '12px', color: '#555' },
  thR: { textAlign: 'right', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '12px', color: '#555' },
  td: { padding: '8px', fontSize: '13px', verticalAlign: 'top' },
  tdR: { padding: '8px', fontSize: '13px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' },
  tdNote: { padding: '8px', fontSize: '12px', color: '#444', verticalAlign: 'top' },
  tdMuted: { padding: '8px', fontSize: '11px', color: '#999', verticalAlign: 'top' },
  partName: { fontSize: '13px', fontWeight: 600 },
  partMeta: { fontSize: '11px', color: '#888', marginTop: '2px' },
  detailHead: { marginBottom: '12px' },
  detailTitle: { margin: 0, fontSize: '18px' },
  editor: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '14px', marginBottom: '14px' },
  modeToggle: { display: 'inline-flex', border: '1px solid #ddd', borderRadius: '7px', overflow: 'hidden' },
  modeBtn: { padding: '7px 14px', background: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#555' },
  modeBtnActive: { background: '#7c3aed', color: 'white', fontWeight: 600 },
  modeHint: { fontSize: '12px', color: '#666', margin: '8px 0 10px', lineHeight: 1.5 },
  editRow: { display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '11px', color: '#777', fontWeight: 600 },
  input: { padding: '8px 10px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px' },
  saveBtn: { background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '9px 18px', cursor: 'pointer', fontWeight: 700 },
  timelineCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 12px', overflowX: 'auto' },
  currentRow: { background: '#f0fdf4' },
  currentPill: { marginLeft: '8px', background: '#dcfce7', color: '#166534', borderRadius: '999px', padding: '1px 8px', fontSize: '10px', fontWeight: 700 },
  delBtn: { background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '13px' },
  muted: { color: '#888', padding: '12px', fontSize: '13px' },
};
