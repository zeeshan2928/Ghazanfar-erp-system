import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/api';

interface Suggestion {
  formulaId: number;
  label: string;
  family: string;
  cost: number;
  score: number;
}

interface Candidate {
  itemName: string;
  itemKey: string;
  transactionCount: number;
  totalRevenue: number;
  avgSalePrice: number;
  formulaId: number | null;
  manualCost: number | null;
  resolvedCost: number | null;
  suggestions: Suggestion[];
}

interface Formula {
  id: number;
  label: string;
  family: string;
  cost: number;
}

// Assembled Costs: the models we BUILD have no purchase price to cost against
// (they appear in the purchase file only at price 0), so their cost comes from
// a BOM formula instead - derived live from the shared parts catalog, so
// re-pricing one part re-costs every model using it. Until an item is mapped
// its profit is reported as "cost unknown", never as 100% margin.
export function AssembledCostsScreen() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [draft, setDraft] = useState<Record<string, { formulaId: number | null; manualCost: string }>>({});
  const [search, setSearch] = useState('');
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [c, f] = await Promise.all([
        apiClient.getAssembledCostCandidates(),
        apiClient.getAssemblyFormulasForCost(),
      ]);
      const rows: Candidate[] = c.candidates || [];
      setCandidates(rows);
      setFormulas(f.formulas || []);
      const d: Record<string, { formulaId: number | null; manualCost: string }> = {};
      for (const r of rows) {
        d[r.itemKey] = {
          formulaId: r.formulaId,
          manualCost: r.manualCost != null ? String(r.manualCost) : '',
        };
      }
      setDraft(d);
    } catch {
      setBanner({ kind: 'err', text: 'Failed to load assembled-cost candidates.' });
    } finally {
      setLoading(false);
    }
  }

  function setFormula(key: string, formulaId: number | null) {
    setDraft(prev => ({ ...prev, [key]: { ...prev[key], formulaId } }));
  }
  function setManual(key: string, manualCost: string) {
    setDraft(prev => ({ ...prev, [key]: { ...prev[key], manualCost } }));
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter(c => {
      const d = draft[c.itemKey];
      const mapped = d && (d.formulaId != null || d.manualCost.trim() !== '');
      if (onlyUnmapped && mapped) return false;
      if (q && !c.itemName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [candidates, draft, search, onlyUnmapped]);

  // Cost the row will actually use: a typed manual cost wins over the formula.
  function effectiveCost(c: Candidate): number | null {
    const d = draft[c.itemKey];
    if (!d) return null;
    const manual = parseFloat(d.manualCost);
    if (d.manualCost.trim() !== '' && !isNaN(manual)) return manual;
    if (d.formulaId != null) return formulas.find(f => f.id === d.formulaId)?.cost ?? null;
    return null;
  }

  const mappedCount = candidates.filter(c => effectiveCost(c) != null).length;
  const unmappedRevenue = candidates
    .filter(c => effectiveCost(c) == null)
    .reduce((s, c) => s + c.totalRevenue, 0);

  async function save() {
    setSaving(true);
    setBanner(null);
    try {
      const items = candidates.map(c => {
        const d = draft[c.itemKey];
        const manual = d && d.manualCost.trim() !== '' ? parseFloat(d.manualCost) : null;
        return {
          itemName: c.itemName,
          formulaId: d?.formulaId ?? null,
          manualCost: manual != null && !isNaN(manual) ? manual : null,
        };
      });
      await apiClient.mapAssembledCosts(items);
      setBanner({ kind: 'ok', text: `Saved. ${mappedCount} of ${candidates.length} assembled models now have a cost — their profit is computed from it.` });
      await load();
    } catch {
      setBanner({ kind: 'err', text: 'Failed to save cost mappings.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.h2}>Assembled Costs — models you build, not buy</h2>
          <p style={styles.sub}>
            These items have no purchase price to cost against (the purchase file lists them only at 0), so profit for them
            is unknowable until you say which BOM formula builds each one. Cost is then derived from your shared parts
            catalog — re-price one part and every model using it re-costs automatically. Suggestions are ranked, but
            nothing is applied until you save.
          </p>
        </div>
        <button style={styles.saveBtn} onClick={save} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save costs'}
        </button>
      </div>

      {banner && <div style={banner.kind === 'ok' ? styles.ok : styles.err}>{banner.text}</div>}

      <div style={styles.toolbar}>
        <input style={styles.search} placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        <label style={styles.checkLabel}>
          <input type="checkbox" checked={onlyUnmapped} onChange={e => setOnlyUnmapped(e.target.checked)} /> Show only unmapped
        </label>
        <span style={styles.counter}>
          {mappedCount} of {candidates.length} mapped · {Math.round(unmappedRevenue).toLocaleString()} revenue still without a cost
        </span>
      </div>

      <div style={styles.card}>
        {loading ? (
          <p>Loading…</p>
        ) : visible.length === 0 ? (
          <p>No items match. (If this list is empty, every assembled model already has a cost.)</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Item sold</th>
                <th style={styles.thR}>Avg sale</th>
                <th style={styles.thR}>Units sold</th>
                <th style={styles.thR}>Revenue</th>
                <th style={styles.th}>BOM formula that builds it</th>
                <th style={styles.thR}>Or manual cost</th>
                <th style={styles.thR}>Cost used</th>
                <th style={styles.thR}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(c => {
                const cost = effectiveCost(c);
                const margin = cost != null && c.avgSalePrice > 0
                  ? ((c.avgSalePrice - cost) / c.avgSalePrice) * 100
                  : null;
                const d = draft[c.itemKey];
                return (
                  <tr key={c.itemKey} style={cost == null ? styles.rowUnmapped : undefined}>
                    <td style={styles.td}>{c.itemName}</td>
                    <td style={styles.tdR}>{c.avgSalePrice.toLocaleString()}</td>
                    <td style={styles.tdR}>{c.transactionCount.toLocaleString()}</td>
                    <td style={styles.tdR}>{Math.round(c.totalRevenue).toLocaleString()}</td>
                    <td style={styles.td}>
                      <select
                        style={styles.select}
                        value={d?.formulaId ?? ''}
                        onChange={e => setFormula(c.itemKey, e.target.value === '' ? null : Number(e.target.value))}
                      >
                        <option value="">— not mapped —</option>
                        {c.suggestions.length > 0 && (
                          <optgroup label="Suggested">
                            {c.suggestions.map(s => (
                              <option key={`s${s.formulaId}`} value={s.formulaId}>
                                {s.label} ({Math.round(s.cost).toLocaleString()})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="All formulas">
                          {formulas.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.family === 'JUICER' ? 'Juicer' : 'Blender'} · {f.label} ({Math.round(f.cost).toLocaleString()})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </td>
                    <td style={styles.tdR}>
                      <input
                        style={styles.manual}
                        placeholder="—"
                        value={d?.manualCost ?? ''}
                        onChange={e => setManual(c.itemKey, e.target.value)}
                      />
                    </td>
                    <td style={styles.tdR}>
                      {cost != null ? <strong>{Math.round(cost).toLocaleString()}</strong> : <span style={styles.unknown}>cost unknown</span>}
                    </td>
                    <td style={styles.tdR}>
                      {margin != null ? (
                        <span style={margin < 0 ? styles.negative : undefined}>{margin.toFixed(1)}%</span>
                      ) : (
                        <span style={styles.unknown}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' },
  h2: { margin: 0 },
  sub: { margin: '6px 0 0', fontSize: '13px', color: '#555', maxWidth: '820px' },
  saveBtn: { background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '9px 16px', cursor: 'pointer', fontWeight: 700 },
  ok: { background: '#dcfce7', color: '#166534', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' },
  err: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' },
  toolbar: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' },
  search: { padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', minWidth: '220px' },
  checkLabel: { fontSize: '13px', color: '#444', display: 'flex', alignItems: 'center', gap: '6px' },
  counter: { fontSize: '13px', color: '#7c3aed', fontWeight: 600 },
  card: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '12px', color: '#555' },
  thR: { textAlign: 'right', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '12px', color: '#555' },
  td: { borderBottom: '1px solid #eee', padding: '7px 8px', fontSize: '13px' },
  tdR: { borderBottom: '1px solid #eee', padding: '7px 8px', fontSize: '13px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  rowUnmapped: { background: '#fff7ed' },
  select: { padding: '6px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '12px', maxWidth: '320px' },
  manual: { padding: '6px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '12px', width: '80px', textAlign: 'right' },
  unknown: { color: '#b45309', fontSize: '12px' },
  negative: { color: '#dc2626', fontWeight: 600 },
};
