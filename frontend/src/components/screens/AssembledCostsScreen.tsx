import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../services/api';
import { useGridArrowNav } from '../../utils/keyboardNav';

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

// A searchable formula picker. A native <select> cannot be typed into, and with
// 31 formulas the user was left scrolling a long list on every row.
//
// The popup is position:fixed rather than absolute on purpose: the table sits in
// a horizontally scrolling card, and an absolutely positioned menu would be
// clipped by that scroll container. Being fixed, it escapes the clip - at the
// cost of having to be re-placed whenever anything scrolls or resizes.
function FormulaPicker({
  valueId,
  suggestions,
  formulas,
  onPick,
}: {
  valueId: number | null;
  suggestions: Suggestion[];
  formulas: Formula[];
  onPick: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hover, setHover] = useState<string | null>(null);
  // Which option the arrow keys are currently standing on. Kept separate from
  // hover so mouse and keyboard can each highlight without fighting.
  const [active, setActive] = useState(0);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const selected = valueId != null ? formulas.find(f => f.id === valueId) : undefined;

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(r.width, 340);
      // Keep it on screen: flip above the field if there is no room below.
      const below = window.innerHeight - r.bottom;
      const height = 330;
      const top = below < height && r.top > height ? r.top - height - 4 : r.bottom + 4;
      const left = Math.min(r.left, window.innerWidth - width - 12);
      setPos({ top, left, width });
    };
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const needle = q.trim().toLowerCase();
  const matches = (label: string, family: string) =>
    !needle || label.toLowerCase().includes(needle) || family.toLowerCase().includes(needle);

  const sugg = suggestions.filter(s => matches(s.label, s.family));
  const suggIds = new Set(sugg.map(s => s.formulaId));
  const rest = formulas.filter(f => matches(f.label, f.family) && !suggIds.has(f.id));

  // One flat list, in the order they appear on screen - the arrow keys must walk
  // exactly what the eye sees, group headings and all being skipped.
  const options: { key: string; id: number | null }[] = [
    { key: 'none', id: null },
    ...sugg.map(s => ({ key: `s${s.formulaId}`, id: s.formulaId })),
    ...rest.map(f => ({ key: `f${f.id}`, id: f.id })),
  ];

  // Typing re-filters the list, so whatever was highlighted is meaningless now.
  useEffect(() => {
    setActive(0);
  }, [q, open]);

  // Keep the highlighted option scrolled into view as the arrows walk past the
  // bottom of the list.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-opt="${options[active]?.key}"]`);
    el?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  function pick(id: number | null) {
    onPick(id);
    setOpen(false);
    setQ('');
  }

  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(a => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = options[active];
      if (o) pick(o.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      anchorRef.current?.focus();
    }
  }

  const item = (key: string, onClick: () => void, children: React.ReactNode) => {
    const idx = options.findIndex(o => o.key === key);
    const isActive = idx === active;
    return (
      <button
        key={key}
        data-opt={key}
        type="button"
        role="option"
        aria-selected={isActive}
        // -1: the search box keeps the focus and drives the list, so Tab must
        // not have to walk through 31 options to get out of the popup.
        tabIndex={-1}
        style={{ ...styles.popItem, ...(hover === key || isActive ? styles.popItemHover : {}) }}
        onMouseEnter={() => setHover(key)}
        onMouseLeave={() => setHover(h => (h === key ? null : h))}
        onClick={onClick}
      >
        {children}
      </button>
    );
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        style={styles.pickerBtn}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        // Down-arrow opens the list, the way a native <select> does.
        onKeyDown={e => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        title={selected ? selected.label : 'Pick a BOM formula'}
      >
        <span style={selected ? styles.pickerValue : styles.pickerPlaceholder}>
          {selected ? `${selected.label} (${fmt(selected.cost)})` : '— or pick a BOM formula —'}
        </span>
        <span style={styles.caret}>▾</span>
      </button>

      {open && pos && (
        <div
          ref={popRef}
          // Tells the table's Up/Down grid navigation to keep its hands off:
          // inside this popup the arrows belong to the option list.
          data-kbd-owns-arrows="true"
          style={{ ...styles.pop, top: pos.top, left: pos.left, width: pos.width }}
        >
          <input
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls="formula-listbox"
            aria-activedescendant={options[active]?.key}
            style={styles.popSearch}
            placeholder="Search… ↑↓ to move, Enter to pick, Esc to close"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />
          <div ref={listRef} id="formula-listbox" role="listbox" style={styles.popList}>
            {item('none', () => pick(null), <span style={styles.pickerPlaceholder}>— not mapped —</span>)}

            {sugg.length > 0 && <div style={styles.popGroup}>Suggested for this product</div>}
            {sugg.map(s =>
              item(`s${s.formulaId}`, () => pick(s.formulaId), (
                <>
                  {s.label} <span style={styles.popCost}>({fmt(s.cost)})</span>
                </>
              )),
            )}

            {rest.length > 0 && <div style={styles.popGroup}>All formulas</div>}
            {rest.map(f =>
              item(`f${f.id}`, () => pick(f.id), (
                <>
                  <span style={styles.popFam}>{f.family === 'JUICER' ? 'Juicer' : 'Blender'}</span> {f.label}{' '}
                  <span style={styles.popCost}>({fmt(f.cost)})</span>
                </>
              )),
            )}

            {sugg.length === 0 && rest.length === 0 && (
              <div style={styles.popEmpty}>No formula matches “{q}”.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

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

  // Up/Down walks a whole column: from one row's cost field straight to the
  // next row's, so 101 costs can be entered without touching the mouse.
  const gridRef = useRef<HTMLDivElement>(null);
  useGridArrowNav(gridRef);

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

      <div ref={gridRef} style={styles.card}>
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
                      <FormulaPicker
                        valueId={d?.formulaId ?? null}
                        suggestions={c.suggestions}
                        formulas={formulas}
                        onPick={id => setFormula(c.itemKey, id)}
                      />
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
  manual: { padding: '6px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '12px', width: '90px', textAlign: 'right' },

  // --- searchable formula picker ---
  pickerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    width: '230px',
    marginTop: '4px',
    padding: '6px 8px',
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '5px',
    fontSize: '11px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  pickerValue: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#111' },
  pickerPlaceholder: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#888' },
  caret: { color: '#888', fontSize: '10px', flexShrink: 0 },
  pop: {
    position: 'fixed',
    zIndex: 3000,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '330px',
    padding: '8px',
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
  },
  popSearch: {
    padding: '7px 9px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box',
  },
  popList: { overflowY: 'auto', marginTop: '6px' },
  popItem: {
    display: 'block',
    width: '100%',
    padding: '6px 8px',
    background: 'none',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  popItemHover: { background: '#eef2ff' },
  popGroup: { padding: '8px 8px 3px', fontSize: '10px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.4px' },
  popCost: { color: '#7c3aed', fontWeight: 600 },
  popFam: { color: '#999' },
  popEmpty: { padding: '10px 8px', fontSize: '12px', color: '#888' },
  useBtn: { marginLeft: '6px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 7px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 },
  confHigh: { marginLeft: '6px', background: '#dcfce7', color: '#166534', borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 },
  confMed: { marginLeft: '6px', background: '#fef9c3', color: '#854d0e', borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 },
  confLow: { marginLeft: '6px', background: '#fee2e2', color: '#991b1b', borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 },
  dash: { color: '#bbb' },
  negative: { color: '#dc2626', fontWeight: 600 },
};
