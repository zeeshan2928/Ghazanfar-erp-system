import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFormulaStore, AssemblyFamily } from '../../stores/assembly-formula/formulaStore';
import { apiClient } from '../../services/api';
import './assembly-formulas.css';
import { matchesTokens } from '../../utils/tokenSearch';

type FamilyFilter = 'ALL' | AssemblyFamily;

export function AssemblyFormulasScreen() {
  const store = useFormulaStore();
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'warn' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inline edit of the model's name. The labels came off the source spreadsheets
  // ("1764 PC+1760 PC+2225 (7025CC)") - they name the FILE, not the product.
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  // The rail is drag-resizable so the parts ledger - the thing you actually work
  // in - can be given the room. Persisted: a width you must re-drag every
  // morning is worse than a fixed one.
  const [railWidth, setRailWidth] = useState<number>(
    () => Number(localStorage.getItem('afx_rail_width')) || 300,
  );
  useEffect(() => { localStorage.setItem('afx_rail_width', String(railWidth)); }, [railWidth]);

  function startRailResize(e: React.MouseEvent) {
    e.preventDefault();
    const rootLeft = (e.currentTarget as HTMLElement).closest('.afx-root')!.getBoundingClientRect().left;
    const onMove = (ev: MouseEvent) => setRailWidth(Math.min(560, Math.max(200, ev.clientX - rootLeft - 16)));
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Local-first: show whatever's cached instantly, then refresh from server
  // if we have no unsynced local edits.
  useEffect(() => {
    store.loadLocal();
    const local = useFormulaStore.getState();
    if (local.formulas.length === 0 && local.dirtyPartIds.length === 0) {
      store.loadFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computed = store.computedFormulas();

  const visibleFormulas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return computed
      .filter(f => familyFilter === 'ALL' || f.family === familyFilter)
      .filter(f => matchesTokens(q, f.label, f.productCodes.join(' ')))
      .sort((a, b) => a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed, familyFilter, search]);

  const selected = computed.find(f => f.id === selectedId) || null;

  // Switching model discards any half-typed edit rather than carrying it across
  // to the wrong product.
  useEffect(() => {
    setEditingName(false);
    setNameDraft(selected?.label ?? '');
    setDescDraft(selected?.description ?? '');
  }, [selectedId, selected?.label, selected?.description]);

  async function saveName() {
    const label = nameDraft.trim();
    setEditingName(false);
    if (!selected || !label || label === selected.label) {
      setNameDraft(selected?.label ?? '');
      return;
    }
    setSavingMeta(true);
    const res = await store.updateFormulaMeta(selected.id, { label });
    setSavingMeta(false);
    if (!res.ok) {
      setBanner({ kind: 'warn', text: res.error || 'Could not rename the model.' });
      setNameDraft(selected.label); // put the old name back rather than lie
    }
  }

  async function saveDescription() {
    if (!selected || descDraft === (selected.description ?? '')) return;
    setSavingMeta(true);
    const res = await store.updateFormulaMeta(selected.id, { description: descDraft });
    setSavingMeta(false);
    if (!res.ok) setBanner({ kind: 'warn', text: res.error || 'Could not save the note.' });
  }

  // How many OTHER formulas share a given part - so editing a price makes its
  // ripple visible ("used in N models").
  const partUsageCount = useMemo(() => {
    const map = new Map<number | string, number>();
    for (const f of computed) {
      for (const l of f.lines) map.set(l.partId, (map.get(l.partId) || 0) + 1);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed]);

  async function handleSync() {
    setBusy(true);
    const res = await store.syncToServer();
    setBanner({ kind: res.failed === 0 ? 'info' : 'warn', text: res.message });
    setBusy(false);
  }

  async function handleLoadFromServer() {
    const res = await store.loadFromServer();
    if (res.blockedByDirty) {
      const ok = window.confirm(
        'You have unsynced local price changes. Loading from the server will discard them. Continue?',
      );
      if (ok) {
        await store.loadFromServer({ force: true });
        setBanner({ kind: 'info', text: 'Reloaded from server (local changes discarded).' });
      }
    } else if (res.ok) {
      setBanner({ kind: 'info', text: 'Loaded latest data from server.' });
    } else {
      setBanner({ kind: 'warn', text: 'Could not reach the server (you can keep working offline).' });
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiClient.importAssemblyFormulas(formData);
      await store.loadFromServer({ force: true });
      setBanner({
        kind: 'info',
        text: `Imported ${result.formulasProcessed} formula(s), ${result.partsCreated} new part(s), ${result.partsWithPriceConflict} flagged for price review.`,
      });
    } catch {
      setBanner({ kind: 'warn', text: 'Import failed - check the file format.' });
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const dirtyCount = store.dirtyPartIds.length;

  return (
    <div className="afx-root">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />

      <div className="afx-topbar">
        <div>
          <h2 className="afx-title">Assembly Cost Workbench</h2>
          <p className="afx-subtitle">
            Bill-of-materials for each model. Change any part price and every model that uses it recalculates.
            {store.lastSyncedAt && ` · Last server sync: ${new Date(store.lastSyncedAt).toLocaleString()}`}
          </p>
        </div>
        <div className="afx-actions">
          <div className="afx-family-toggle">
            {(['ALL', 'JUICER', 'BLENDER'] as FamilyFilter[]).map(f => (
              <button key={f} className={familyFilter === f ? 'active' : ''} onClick={() => setFamilyFilter(f)}>
                {f === 'ALL' ? 'All' : f === 'JUICER' ? 'Juicers' : 'Blenders'}
              </button>
            ))}
          </div>
          <button className="afx-btn" disabled={busy} onClick={() => fileInputRef.current?.click()}>Import Excel</button>
          <button className="afx-btn" disabled={busy} onClick={handleLoadFromServer}>Load from Server</button>
          <button
            className={`afx-btn ${dirtyCount > 0 ? 'afx-btn-dirty' : ''}`}
            disabled={busy || dirtyCount === 0}
            onClick={handleSync}
          >
            {dirtyCount > 0 ? `Sync ${dirtyCount} change${dirtyCount > 1 ? 's' : ''} →` : 'Synced'}
          </button>
        </div>
      </div>

      {banner && <div className={`afx-banner ${banner.kind === 'warn' ? 'afx-banner-warn' : 'afx-banner-info'}`}>{banner.text}</div>}

      <div className="afx-rail" style={{ width: railWidth }}>
        <input className="afx-search" placeholder="Search models or codes…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="afx-rail-list">
          {visibleFormulas.length === 0 && <div className="afx-empty">No models.</div>}
          {visibleFormulas.map(f => (
            <button
              key={f.id}
              className={`afx-rail-item ${f.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(f.id)}
            >
              <span className="afx-rail-label">{f.label}</span>
              <span className="afx-rail-meta">
                <span className="afx-fam-chip">{f.family}</span>
                <span className="afx-rail-total">{f.totalCost.toLocaleString()}</span>
              </span>
            </button>
          ))}
        </div>
        {/* Drag to give the parts ledger more (or less) of the screen. */}
        <div className="afx-rail-resize" onMouseDown={startRailResize} role="separator" aria-orientation="vertical" title="Drag to resize" />
      </div>

      <div className="afx-main">
        {!selected ? (
          <div className="afx-empty">Select a model from the left to see its cost build-up.</div>
        ) : (
          <>
            <div className="afx-formula-head">
              {editingName ? (
                <input
                  className="afx-title-input"
                  autoFocus
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') { setNameDraft(selected.label); setEditingName(false); }
                  }}
                />
              ) : (
                <h3
                  className="afx-formula-title afx-editable"
                  onClick={() => setEditingName(true)}
                  title="Click to rename this model"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') setEditingName(true); }}
                >
                  {selected.label}
                  <span className="afx-edit-pencil">✎</span>
                </h3>
              )}

              <div className="afx-head-meta">
                {selected.productCodes.length > 0 && (
                  <div className="afx-code-chips">
                    {selected.productCodes.map(c => <span key={c} className="afx-code-chip">#{c}</span>)}
                  </div>
                )}
                {savingMeta && <span className="afx-saving">saving…</span>}
              </div>

              {/* Notes about this model. Drag its corner to make it as big as it
                  needs to be - and no bigger, because the parts ledger below is
                  what the screen is really for. */}
              <textarea
                className="afx-desc"
                placeholder="Notes about this model — what it is, which variant, what to watch for…"
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                onBlur={saveDescription}
              />
            </div>

            <div className="afx-col-head">
              <span>Component</span><span>Qty</span><span>Unit cost</span><span>Line total</span>
            </div>

            <div className="afx-ledger">
              {selected.lines.map(l => {
                const usage = partUsageCount.get(l.partId) || 1;
                return (
                  <div className="afx-line-row" key={l.partId}>
                    <span className={`afx-line-name ${l.hadPriceConflict ? 'conflict' : ''}`}>
                      {l.name}
                      {l.hadPriceConflict && (
                        <span className="afx-conflict-badge" title="This part had different prices across your source files - confirm the correct current price.">review</span>
                      )}
                      {usage > 1 && <span className="afx-conflict-badge" style={{ color: '#9ecbe0', borderColor: 'rgba(78,155,196,0.5)' }} title={`Used in ${usage} models - editing ripples to all of them.`}>×{usage}</span>}
                    </span>
                    <span className="afx-line-qty">{l.quantity}</span>
                    <input
                      className="afx-cost-input"
                      type="number"
                      value={l.unitCost}
                      min={0}
                      onChange={e => store.updatePartCost(l.partId, parseFloat(e.target.value) || 0)}
                    />
                    <span className="afx-line-total">{l.lineTotal.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>

            <div className="afx-total">
              <span className="afx-total-label">Total assembled cost</span>
              <span className="afx-total-value">{selected.totalCost.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
