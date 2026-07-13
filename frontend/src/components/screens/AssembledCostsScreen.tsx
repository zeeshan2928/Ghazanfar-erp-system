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
  category: string | null;
  brand: string | null;
  transactionCount: number;
  unitsSold: number;
  totalRevenue: number;
  avgSalePrice: number;
  formulaId: number | null;
  manualCost: number | null;
  resolvedCost: number | null;
  bomCost: number | null;
  bomLabel: string | null;
  peerCost: number | null;
  peerNote: string | null;
  assessedCost: number | null;
  assessedBasis: 'BOM' | 'CATEGORY_BRAND_PEER' | 'CATEGORY_PEER' | null;
  assessedNote: string | null;
  assessedConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  estimatedProfit: number | null;
  estimatedMarginPercent: number | null;
  suggestions: Suggestion[];
}

interface Formula {
  id: number;
  label: string;
  family: string;
  cost: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString();

// Cost Verification: every product we sell but have no purchase price for -
// either we assemble it (it appears in the purchase file only at 0) or it is
// simply missing from the purchase file. Profit for these is unknowable until a
// cost is set, so each gets an ASSESSED cost from two independent estimates,
// shown side by side, for the user to verify or overrule. Nothing is applied
// until they save: an assessment is evidence, not a decision.
export function AssembledCostsScreen() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [total, setTotal] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  // itemKey -> what the user typed / picked
  const [draft, setDraft] = useState<Record<string, { formulaId: number | null; manualCost: string }>>({});
  const [search, setSearch] = useState('');
  const [onlyUnverified, setOnlyUnverified] = useState(false);
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
        apiClient.getAssembledCostCandidates(200),
        apiClient.getAssemblyFormulasForCost(),
      ]);
      const rows: Candidate[] = c.candidates || [];
      setCandidates(rows);
      setTotal(c.totalCandidates || rows.length);
      setVerifiedCount(c.verifiedCount || 0);
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
      setBanner({ kind: 'err', text: 'Failed to load cost-verification list.' });
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

  // Copy our assessed number into the user's field. They still have to save it -
  // the point is to save typing, not to decide on their behalf.
  function useAssessed(c: Candidate) {
    if (c.assessedCost == null) return;
    if (c.assessedBasis === 'BOM') {
      const f = c.suggestions.find(s => s.label === c.bomLabel);
      if (f) {
        setDraft(prev => ({ ...prev, [c.itemKey]: { formulaId: f.formulaId, manualCost: '' } }));
        return;
      }
    }
    setDraft(prev => ({ ...prev, [c.itemKey]: { formulaId: null, manualCost: String(c.assessedCost) } }));
  }

  function useAllAssessed() {
    for (const c of visible) if (verifiedCost(c) == null) useAssessed(c);
  }

  // The cost the user has actually committed to for this row (typed cost wins
  // over a picked formula). Distinct from anything we assessed.
  function verifiedCost(c: Candidate): number | null {
    const d = draft[c.itemKey];
    if (!d) return null;
    const manual = parseFloat(d.manualCost);
    if (d.manualCost.trim() !== '' && !isNaN(manual)) return manual;
    if (d.formulaId != null) return formulas.find(f => f.id === d.formulaId)?.cost ?? null;
    return null;
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter(c => {
      if (onlyUnverified && verifiedCost(c) != null) return false;
      if (q && !c.itemName.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, draft, search, onlyUnverified, formulas]);

  const nowVerified = candidates.filter(c => verifiedCost(c) != null).length;
  const stillMissing = candidates
    .filter(c => verifiedCost(c) == null)
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
      setBanner({ kind: 'ok', text: `Saved. ${nowVerified} of ${total} products now have a verified cost — their profit is now computed from it.` });
      await load();
    } catch {
      setBanner({ kind: 'err', text: 'Failed to save costs.' });
    } finally {
      setSaving(false);
    }
  }

  const confStyle = (c: Candidate['assessedConfidence']) =>
    c === 'HIGH' ? styles.confHigh : c === 'MEDIUM' ? styles.confMed : styles.confLow;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.h2}>Cost Verification — products with no cost price</h2>
          <p style={styles.sub}>
            These {total} products have no purchase price anywhere in your purchase file — either you assemble them (they
            appear only at 0) or they are missing from it. Their profit is unknowable until a cost is set, so each one below
            carries a cost <strong>we assessed</strong> from two independent estimates — what the BOM parts add up to, and
            what comparable products in the same category actually earn. Where they agree, the number is solid; where they
            differ, that gap is the thing to look at. <strong>Nothing is applied until you save.</strong>
          </p>
        </div>
        <button style={styles.saveBtn} onClick={save} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save verified costs'}
        </button>
      </div>

      {banner && <div style={banner.kind === 'ok' ? styles.ok : styles.err}>{banner.text}</div>}

      <div style={styles.toolbar}>
        <input style={styles.search} placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        <label style={styles.checkLabel}>
          <input type="checkbox" checked={onlyUnverified} onChange={e => setOnlyUnverified(e.target.checked)} /> Show only unverified
        </label>
        <button style={styles.bulkBtn} onClick={useAllAssessed} disabled={loading}>
          Fill all shown with the assessed cost
        </button>
        <span style={styles.counter}>
          {nowVerified} of {total} verified · {fmt(stillMissing)} revenue still without a cost
        </span>
      </div>

      <div style={styles.card}>
        {loading ? (
          <p>Loading…</p>
        ) : visible.length === 0 ? (
          <p>Nothing to verify here.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Product (most profitable first)</th>
                <th style={styles.thR}>Avg sale</th>
                <th style={styles.thR}>Units</th>
                <th style={styles.thR}>Revenue</th>
                <th style={styles.thR} title="What the BOM parts add up to">BOM cost</th>
                <th style={styles.thR} title="Implied by what comparable products in the same category earn">Peer cost</th>
                <th style={styles.th}>Our assessed cost</th>
                <th style={styles.th}>Your verified cost</th>
                <th style={styles.thR}>Est. profit</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c, i) => {
                const d = draft[c.itemKey];
                const mine = verifiedCost(c);
                const shown = mine ?? c.assessedCost;
                const profit = shown != null ? c.totalRevenue - shown * c.unitsSold : null;
                const margin = profit != null && c.totalRevenue > 0 ? (profit / c.totalRevenue) * 100 : null;
                return (
                  <tr key={c.itemKey} style={mine != null ? styles.rowVerified : undefined}>
                    <td style={styles.tdMuted}>{i + 1}</td>
                    <td style={styles.td}>
                      <div>{c.itemName}</div>
                      <div style={styles.meta}>{c.category}{c.brand ? ` · ${c.brand}` : ''}</div>
                    </td>
                    <td style={styles.tdR}>{fmt(c.avgSalePrice)}</td>
                    <td style={styles.tdR}>{fmt(c.unitsSold)}</td>
                    <td style={styles.tdR}>{fmt(c.totalRevenue)}</td>
                    <td style={styles.tdR}>
                      {c.bomCost != null ? (
                        <span title={c.bomLabel || ''}>{fmt(c.bomCost)}</span>
                      ) : (
                        <span style={styles.dash}>—</span>
                      )}
                    </td>
                    <td style={styles.tdR}>
                      {c.peerCost != null ? (
                        <span title={c.peerNote || ''}>{fmt(c.peerCost)}</span>
                      ) : (
                        <span style={styles.dash}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {c.assessedCost != null ? (
                        <div>
                          <div>
                            <strong>{fmt(c.assessedCost)}</strong>
                            <span style={confStyle(c.assessedConfidence)}>{c.assessedConfidence}</span>
                            <button style={styles.useBtn} onClick={() => useAssessed(c)}>use</button>
                          </div>
                          <div style={styles.meta} title={c.assessedNote || ''}>{c.assessedNote}</div>
                        </div>
                      ) : (
                        <span style={styles.dash}>could not assess</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <input
                        style={styles.manual}
                        placeholder="type cost"
                        value={d?.manualCost ?? ''}
                        onChange={e => setManual(c.itemKey, e.target.value)}
                      />
                      <select
                        style={styles.select}
                        value={d?.formulaId ?? ''}
                        onChange={e => setFormula(c.itemKey, e.target.value === '' ? null : Number(e.target.value))}
                      >
                        <option value="">— or pick a BOM formula —</option>
                        {c.suggestions.length > 0 && (
                          <optgroup label="Suggested for this product">
                            {c.suggestions.map(s => (
                              <option key={`s${s.formulaId}`} value={s.formulaId}>
                                {s.label} ({fmt(s.cost)})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="All formulas">
                          {formulas.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.family === 'JUICER' ? 'Juicer' : 'Blender'} · {f.label} ({fmt(f.cost)})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </td>
                    <td style={styles.tdR}>
                      {profit != null ? (
                        <>
                          <div style={profit < 0 ? styles.negative : undefined}>{fmt(profit)}</div>
                          {/* A product whose returns cancel its sales has zero net revenue,
                              so it has a profit but no meaningful margin. */}
                          {margin != null && <div style={styles.meta}>{margin.toFixed(1)}%</div>}
                        </>
                      ) : (
                        <span style={styles.dash}>—</span>
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
  sub: { margin: '6px 0 0', fontSize: '13px', color: '#555', maxWidth: '900px', lineHeight: 1.5 },
  saveBtn: { background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '9px 16px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' },
  ok: { background: '#dcfce7', color: '#166534', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' },
  err: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' },
  toolbar: { display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' },
  search: { padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', minWidth: '200px' },
  checkLabel: { fontSize: '13px', color: '#444', display: 'flex', alignItems: 'center', gap: '6px' },
  bulkBtn: { background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '7px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
  counter: { fontSize: '13px', color: '#7c3aed', fontWeight: 600 },
  card: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '12px', color: '#555', whiteSpace: 'nowrap' },
  thR: { textAlign: 'right', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '12px', color: '#555', whiteSpace: 'nowrap' },
  td: { borderBottom: '1px solid #eee', padding: '7px 8px', fontSize: '13px', verticalAlign: 'top' },
  tdR: { borderBottom: '1px solid #eee', padding: '7px 8px', fontSize: '13px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' },
  tdMuted: { borderBottom: '1px solid #eee', padding: '7px 8px', fontSize: '12px', color: '#aaa', verticalAlign: 'top' },
  meta: { fontSize: '11px', color: '#888', marginTop: '2px', maxWidth: '260px' },
  rowVerified: { background: '#f0fdf4' },
  select: { padding: '5px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '11px', maxWidth: '230px', marginTop: '4px', display: 'block' },
  manual: { padding: '6px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '12px', width: '90px', textAlign: 'right' },
  useBtn: { marginLeft: '6px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 7px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 },
  confHigh: { marginLeft: '6px', background: '#dcfce7', color: '#166534', borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 },
  confMed: { marginLeft: '6px', background: '#fef9c3', color: '#854d0e', borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 },
  confLow: { marginLeft: '6px', background: '#fee2e2', color: '#991b1b', borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 },
  dash: { color: '#bbb' },
  negative: { color: '#dc2626', fontWeight: 600 },
};
