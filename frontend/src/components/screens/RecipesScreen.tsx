import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/api';
import { ProductPicker } from '../ProductPicker';

type Tab = 'recipes' | 'review' | 'migrate';

interface BomLineView {
  id: number;
  slotName: string;
  componentProductId: number;
  componentName: string;
  componentCode: string;
  quantity: number;
  unitCost: number;
  lineCost: number;
  alternates: { productId: number; name: string; code: string }[];
}

interface BomView {
  id: number;
  productId: number;
  productName: string;
  productCode: string;
  name: string;
  version: number;
  outputQuantity: number;
  isActive: boolean;
  notes: string | null;
  lines: BomLineView[];
  totalCost: number;
  costPerUnit: number;
  updatedAt: string;
}

interface BomListRow {
  id: number;
  productId: number;
  productName: string;
  productCode: string;
  name: string;
  version: number;
  isActive: boolean;
  updatedAt: string;
}

export function RecipesScreen() {
  const [tab, setTab] = useState<Tab>('recipes');
  return (
    <div style={styles.container}>
      <h2>🧪 Recipes (BOM)</h2>
      <div style={styles.tabs}>
        <TabButton active={tab === 'recipes'} onClick={() => setTab('recipes')} label="Recipes" />
        <TabButton active={tab === 'review'} onClick={() => setTab('review')} label="Classification Review" />
        <TabButton active={tab === 'migrate'} onClick={() => setTab('migrate')} label="Migrate Legacy Formulas" />
      </div>
      {tab === 'recipes' && <RecipesTab />}
      {tab === 'review' && <ReviewTab />}
      {tab === 'migrate' && <MigrateTab onGoToRecipes={() => setTab('recipes')} />}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button style={{ ...styles.tabBtn, ...(active ? styles.tabBtnActive : {}) }} onClick={onClick}>
      {label}
    </button>
  );
}

// ============================================================================
// TAB 1: RECIPES — list, detail/edit, create, and CSV import
// ============================================================================

function RecipesTab() {
  const [rows, setRows] = useState<BomListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single effect, keyed on the values it depends on - the sanctioned list
  // screen template (PurchaseOrdersScreen) has TWO effects that both fire on
  // mount and double-fetch every load; deliberately not copying that here.
  useEffect(() => {
    fetchRows();
  }, [search]);

  async function fetchRows() {
    setLoading(true);
    try {
      const res = await apiClient.searchBoms({ search: search || undefined, skip: 0, take: 50 });
      setRows(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(v: string) {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  if (selectedId !== null) {
    return <RecipeDetail bomId={selectedId} onBack={() => { setSelectedId(null); fetchRows(); }} />;
  }
  if (creating) {
    return <RecipeCreate onDone={(id) => { setCreating(false); setSelectedId(id); }} onCancel={() => setCreating(false)} />;
  }

  return (
    <div>
      <div style={styles.toolbar}>
        <input
          style={styles.searchInput}
          placeholder="Search recipes by name or product…"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
        />
        <button style={styles.btnPrimary} onClick={() => setCreating(true)}>+ New Recipe</button>
        <button style={styles.btn} onClick={() => setShowImport(s => !s)}>{showImport ? 'Hide' : ''} 📁 Import CSV</button>
      </div>

      {showImport && <RecipeImportPanel onDone={fetchRows} />}

      {loading ? (
        <p style={styles.loading}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={styles.noResults}>No recipes yet. Create one, import a CSV, or migrate a legacy formula.</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Recipe</th>
                <th style={styles.th}>Version</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={styles.clickableRow} onClick={() => setSelectedId(r.id)}>
                  <td style={styles.td}>{r.productCode} - {r.productName}</td>
                  <td style={styles.td}>{r.name}</td>
                  <td style={styles.td}>v{r.version}</td>
                  <td style={styles.td}>
                    <span style={r.isActive ? styles.badgeActive : styles.badgeInactive}>{r.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style={styles.td}>{new Date(r.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={styles.info}>{rows.length} of {total} recipes</div>
        </div>
      )}
    </div>
  );
}

function RecipeImportPanel({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      setPreview(await apiClient.analyzeBomImport(fd));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.commitBomImport(fd);
      setResult(res);
      onDone();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setResult(null); }}
        />
        <button style={styles.btn} onClick={() => fileRef.current?.click()}>📁 Choose File</button>
        {file && <span style={styles.fileName}>{file.name}</span>}
        {file && !preview && (
          <button style={styles.btnPrimary} onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? 'Checking…' : 'Preview →'}
          </button>
        )}
      </div>
      <div style={styles.note}>
        Columns: <strong>Product | Recipe | Slot | Component | Qty</strong>. Blank Product/Recipe cells carry
        forward from the row above, so a multi-part recipe is one row per component.
        Unknown product/component codes are never auto-created - that recipe is skipped and reported instead.
      </div>

      {preview && !result && (
        <div>
          <p><strong>{preview.validRecipes.length}</strong> of <strong>{preview.recipesFound}</strong> recipe(s) ready to import.</p>
          {preview.validRecipes.map((r: any) => (
            <div key={r.recipeName} style={styles.previewRecipe}>
              ✓ <strong>{r.recipeName}</strong> → {r.productName} ({r.lineCount} lines: {r.slots.join(', ')})
            </div>
          ))}
          {preview.errors.length > 0 && (
            <div style={styles.warn}>
              {preview.errors.map((e: any, i: number) => <div key={i}>Row {e.rowNumber}: {e.reason}</div>)}
            </div>
          )}
          <button style={styles.btnPrimary} onClick={handleImport} disabled={importing || preview.validRecipes.length === 0}>
            {importing ? 'Importing…' : `Confirm & Import ${preview.validRecipes.length} recipe(s)`}
          </button>
        </div>
      )}

      {result && (
        <div style={styles.summary}>
          <div>✅ Created: {result.created.length}</div>
          <div>⚠️ Skipped: {result.skipped.length}</div>
          {result.skipped.map((s: any, i: number) => <div key={i} style={styles.warn}>{s.recipeName}: {s.reason}</div>)}
        </div>
      )}
    </div>
  );
}

function RecipeCreate({ onDone, onCancel }: { onDone: (bomId: number) => void; onCancel: () => void }) {
  const [outputProduct, setOutputProduct] = useState<{ id: number; name: string; code: string } | null>(null);
  const [name, setName] = useState('');
  const [lines, setLines] = useState<{ slotName: string; componentProductId: number | null; componentLabel?: string; quantity: string }[]>([
    { slotName: '', componentProductId: null, quantity: '1' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateLine(idx: number, patch: Partial<(typeof lines)[0]>) {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    if (!outputProduct || !name.trim()) { setError('Pick the product this recipe makes, and give it a name.'); return; }
    const cleanLines = lines.filter(l => l.slotName.trim() && l.componentProductId);
    if (cleanLines.length === 0) { setError('Add at least one component.'); return; }

    setSaving(true);
    setError('');
    try {
      const bom = await apiClient.createBom({
        productId: outputProduct.id,
        name: name.trim(),
        lines: cleanLines.map(l => ({ slotName: l.slotName.trim(), componentProductId: l.componentProductId, quantity: Number(l.quantity) || 1 })),
      });
      onDone(bom.id);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not create the recipe.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.card}>
      <button style={styles.btnGhost} onClick={onCancel}>← Back</button>
      <h3>New Recipe</h3>
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.formRow}>
        <label style={styles.label}>This recipe makes:</label>
        <ProductPicker value={outputProduct?.id ?? null} onChange={setOutputProduct} placeholder="Search the product this recipe builds…" />
      </div>
      <div style={styles.formRow}>
        <label style={styles.label}>Recipe name:</label>
        <input style={styles.textInput} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Panasonic 3-in-1 Juicer" />
      </div>

      <h4>Components</h4>
      {lines.map((line, idx) => (
        <div key={idx} style={styles.lineRow}>
          <input
            style={styles.slotInput}
            placeholder="Slot (e.g. Motor)"
            value={line.slotName}
            onChange={e => updateLine(idx, { slotName: e.target.value })}
          />
          <ProductPicker
            value={line.componentProductId}
            valueLabel={line.componentLabel}
            onChange={p => updateLine(idx, { componentProductId: p.id, componentLabel: `${p.code} - ${p.name}` })}
            placeholder="Search component…"
          />
          <input
            style={styles.qtyInput}
            type="number"
            step="0.0001"
            value={line.quantity}
            onChange={e => updateLine(idx, { quantity: e.target.value })}
          />
          <button style={styles.btnDanger} onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))}>✕</button>
        </div>
      ))}
      <button style={styles.btn} onClick={() => setLines(prev => [...prev, { slotName: '', componentProductId: null, quantity: '1' }])}>
        + Add component
      </button>

      <div style={{ marginTop: '16px' }}>
        <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Create Recipe'}</button>
      </div>
    </div>
  );
}

function RecipeDetail({ bomId, onBack }: { bomId: number; onBack: () => void }) {
  const [bom, setBom] = useState<BomView | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [lines, setLines] = useState<{ slotName: string; componentProductId: number | null; componentLabel?: string; quantity: string }[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [whereUsed, setWhereUsed] = useState<any[] | null>(null);

  useEffect(() => { load(); }, [bomId]);

  async function load() {
    setLoading(true);
    try {
      const data = await apiClient.getBom(bomId);
      setBom(data);
      setLines(data.lines.map((l: BomLineView) => ({
        slotName: l.slotName,
        componentProductId: l.componentProductId,
        componentLabel: `${l.componentCode} - ${l.componentName}`,
        quantity: String(l.quantity),
      })));
    } finally {
      setLoading(false);
    }
  }

  async function handleShowWhereUsed(productId: number) {
    const res = await apiClient.getBomWhereUsed(productId);
    setWhereUsed(res);
  }

  function updateLine(idx: number, patch: Partial<(typeof lines)[0]>) {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function handleSaveEdit() {
    const cleanLines = lines.filter(l => l.slotName.trim() && l.componentProductId);
    if (cleanLines.length === 0) { setError('A recipe needs at least one component.'); return; }
    setSaving(true);
    setError('');
    try {
      await apiClient.updateBom(bomId, {
        lines: cleanLines.map(l => ({ slotName: l.slotName.trim(), componentProductId: l.componentProductId, quantity: Number(l.quantity) || 1 })),
      });
      setEditing(false);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleNewVersion() {
    if (!confirm('Create a new version? Past batches keep using the current version and its cost - this starts a fresh copy you can edit.')) return;
    await apiClient.createBomNewVersion(bomId);
    onBack();
  }

  async function handleDeactivate() {
    if (!confirm('Deactivate this recipe? It stays in history but stops being buildable.')) return;
    await apiClient.deactivateBom(bomId);
    onBack();
  }

  if (loading || !bom) return <p style={styles.loading}>Loading…</p>;

  return (
    <div style={styles.card}>
      <button style={styles.btnGhost} onClick={onBack}>← Back to list</button>
      <h3>{bom.name} <span style={styles.versionTag}>v{bom.version}</span> {!bom.isActive && <span style={styles.badgeInactive}>Inactive</span>}</h3>
      <p style={styles.subtle}>Makes: {bom.productCode} - {bom.productName} (× {bom.outputQuantity})</p>
      {error && <div style={styles.error}>{error}</div>}

      {!editing ? (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Slot</th>
                <th style={styles.th}>Component</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Unit Cost</th>
                <th style={styles.th}>Line Cost</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {bom.lines.map(l => (
                <tr key={l.id}>
                  <td style={styles.td}>{l.slotName}</td>
                  <td style={styles.td}>{l.componentCode} - {l.componentName}
                    {l.alternates.length > 0 && (
                      <div style={styles.altNote}>alt: {l.alternates.map(a => a.name).join(', ')}</div>
                    )}
                  </td>
                  <td style={styles.td}>{l.quantity}</td>
                  <td style={styles.td}>Rs {l.unitCost.toLocaleString()}</td>
                  <td style={styles.td}>Rs {l.lineCost.toLocaleString()}</td>
                  <td style={styles.td}>
                    <button style={styles.btnGhostSmall} onClick={() => handleShowWhereUsed(l.componentProductId)}>where else?</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={styles.totalCost}>Total cost: Rs {bom.totalCost.toLocaleString()} (Rs {bom.costPerUnit.toLocaleString()} per unit)</p>

          {whereUsed && (
            <div style={styles.card}>
              <strong>Also used in:</strong>
              {whereUsed.length === 0 ? <p>Nowhere else.</p> : whereUsed.map((w, i) => (
                <div key={i}>{w.productName} — slot "{w.slotName}" ({w.role})</div>
              ))}
              <button style={styles.btnGhost} onClick={() => setWhereUsed(null)}>close</button>
            </div>
          )}

          <div style={styles.row}>
            <button style={styles.btn} onClick={() => setEditing(true)}>Edit</button>
            <button style={styles.btn} onClick={handleNewVersion}>New Version</button>
            {bom.isActive && <button style={styles.btnDanger} onClick={handleDeactivate}>Deactivate</button>}
          </div>
        </>
      ) : (
        <>
          {lines.map((line, idx) => (
            <div key={idx} style={styles.lineRow}>
              <input style={styles.slotInput} value={line.slotName} onChange={e => updateLine(idx, { slotName: e.target.value })} />
              <ProductPicker
                value={line.componentProductId}
                valueLabel={line.componentLabel}
                onChange={p => updateLine(idx, { componentProductId: p.id, componentLabel: `${p.code} - ${p.name}` })}
              />
              <input style={styles.qtyInput} type="number" step="0.0001" value={line.quantity} onChange={e => updateLine(idx, { quantity: e.target.value })} />
              <button style={styles.btnDanger} onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))}>✕</button>
            </div>
          ))}
          <button style={styles.btn} onClick={() => setLines(prev => [...prev, { slotName: '', componentProductId: null, quantity: '1' }])}>+ Add component</button>
          <div style={{ marginTop: '12px' }}>
            <button style={styles.btnPrimary} onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            <button style={styles.btnGhost} onClick={() => { setEditing(false); load(); }}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// TAB 2: CLASSIFICATION REVIEW
// ============================================================================

interface ReviewItem {
  productId: number;
  code: string;
  name: string;
  category: string | null;
  costPrice: number;
  suggestedKind: 'PART' | 'PRODUCT';
  bulkConfirmable: boolean;
}

function ReviewTab() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setItems(await apiClient.getClassificationReviewQueue());
    } finally {
      setLoading(false);
    }
  }

  const bulkList = items.filter(i => i.bulkConfirmable);
  const individualList = items.filter(i => !i.bulkConfirmable);

  function toggle(id: number) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleBulkConfirm() {
    if (checked.size === 0) return;
    await apiClient.bulkConfirmParts(Array.from(checked));
    setChecked(new Set());
    load();
  }

  async function handleIndividualConfirm(productId: number, kind: 'PART' | 'PRODUCT') {
    await apiClient.confirmClassification(productId, kind);
    setItems(prev => prev.filter(i => i.productId !== productId));
  }

  if (loading) return <p style={styles.loading}>Loading…</p>;

  return (
    <div>
      <div style={styles.card}>
        <h3>Suggested Parts ({bulkList.length})</h3>
        <p style={styles.subtle}>The system is confident these are components (high stock, never sold, part-like name). Tick the ones that are right, then bulk-confirm.</p>
        {bulkList.length === 0 ? <p>None pending.</p> : (
          <>
            {bulkList.map(item => (
              <label key={item.productId} style={styles.checkRow}>
                <input type="checkbox" checked={checked.has(item.productId)} onChange={() => toggle(item.productId)} />
                {item.code} - {item.name} {item.category && <span style={styles.subtle}>({item.category})</span>}
              </label>
            ))}
            <div style={{ marginTop: '10px' }}>
              <button style={styles.btn} onClick={() => setChecked(new Set(bulkList.map(i => i.productId)))}>Select all</button>
              <button style={styles.btnPrimary} onClick={handleBulkConfirm} disabled={checked.size === 0}>
                Confirm {checked.size} as Part(s)
              </button>
            </div>
          </>
        )}
      </div>

      <div style={styles.card}>
        <h3>Needs Your Judgment ({individualList.length})</h3>
        <p style={styles.subtle}>Genuinely ambiguous - purchased but never sold. Could be a slow-selling appliance or an unlabeled part.</p>
        {individualList.length === 0 ? <p>None pending.</p> : individualList.map(item => (
          <div key={item.productId} style={styles.reviewRow}>
            <span>{item.code} - {item.name} {item.category && <span style={styles.subtle}>({item.category})</span>}</span>
            <span>
              <button style={styles.btnGhostSmall} onClick={() => handleIndividualConfirm(item.productId, 'PART')}>It's a Part</button>
              <button style={styles.btnGhostSmall} onClick={() => handleIndividualConfirm(item.productId, 'PRODUCT')}>It's a Product</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TAB 3: MIGRATE LEGACY FORMULAS
// ============================================================================

function MigrateTab({ onGoToRecipes }: { onGoToRecipes: () => void }) {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // A failed fetch and "there is genuinely nothing left to migrate" must
  // never look the same - they used to both render as an empty `pending`
  // array, so a broken request quietly celebrated "All migrated" instead of
  // reporting the failure.
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPending(await apiClient.listPendingFormulaMigrations());
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load pending formula migrations');
    } finally {
      setLoading(false);
    }
  }

  const [report, setReport] = useState<any[] | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  async function handleRunAll() {
    if (!window.confirm(
      'Migrate ALL legacy formulas using best-guess matches?\n\n' +
      '• Each formula is attached to its top-matching product.\n' +
      '• Any component part with no exact product match gets a NEW raw-material product created for it.\n' +
      '• Nothing is deleted; you can review and fix every recipe afterward.',
    )) return;
    setRunningAll(true);
    setError(null);
    try {
      const result = await apiClient.runAllFormulaMigrations();
      setReport(result);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Bulk migration failed');
    } finally {
      setRunningAll(false);
    }
  }

  if (loading) return <p style={styles.loading}>Loading…</p>;
  if (error) return (
    <div>
      <p style={styles.noResults}>⚠️ Could not load pending migrations: {error}</p>
      <button style={styles.tabBtn} onClick={load}>Retry</button>
    </div>
  );

  return (
    <div>
      {report && <MigrationReport report={report} onGoToRecipes={onGoToRecipes} onDismiss={() => setReport(null)} />}

      {pending.length === 0 ? (
        <p style={styles.noResults}>All legacy formulas have been migrated. 🎉</p>
      ) : (
        <>
          <div style={styles.toolbar}>
            <span style={styles.subtle}>{pending.length} legacy formula(s) not yet migrated. Migrate one at a time to confirm each, or migrate them all with best-guess matches and review after.</span>
            <button style={styles.btnPrimary} onClick={handleRunAll} disabled={runningAll}>
              {runningAll ? 'Migrating all…' : `Migrate all ${pending.length} (best guess — review after)`}
            </button>
          </div>
          {pending.map(f => (
            <FormulaMigrationCard
              key={f.formulaId}
              formula={f}
              expanded={expandedId === f.formulaId}
              onToggle={() => setExpandedId(expandedId === f.formulaId ? null : f.formulaId)}
              onMigrated={() => { setExpandedId(null); load(); }}
            />
          ))}
        </>
      )}
    </div>
  );
}

function MigrationReport({ report, onGoToRecipes, onDismiss }: { report: any[]; onGoToRecipes: () => void; onDismiss: () => void }) {
  const migrated = report.filter(r => r.bomId);
  const skipped = report.filter(r => !r.bomId);
  const totalCreated = migrated.reduce((n, r) => n + (r.partsCreated?.length ?? 0), 0);
  return (
    <div style={styles.note}>
      <strong>Migration finished:</strong> {migrated.length} recipe(s) created{totalCreated > 0 ? `, ${totalCreated} new raw-material product(s) added for unmatched parts` : ''}
      {skipped.length > 0 && <div style={{ marginTop: '6px' }}>⚠️ {skipped.length} skipped — need a manual output-product choice:</div>}
      {skipped.length > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
          {skipped.map(r => <li key={r.formulaId} style={{ fontSize: '12px' }}>{r.label} — {r.skippedReason}</li>)}
        </ul>
      )}
      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
        <button style={styles.btnPrimary} onClick={onGoToRecipes}>See the recipes →</button>
        <button style={styles.btn} onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}

function FormulaMigrationCard({ formula, expanded, onToggle, onMigrated }: { formula: any; expanded: boolean; onToggle: () => void; onMigrated: () => void }) {
  const [outputProduct, setOutputProduct] = useState<{ id: number; name: string; code: string } | null>(
    formula.outputCandidates[0] ? { id: formula.outputCandidates[0].productId, code: formula.outputCandidates[0].code, name: formula.outputCandidates[0].name } : null,
  );
  // Assisted mode: a line needs an entry here ONLY if the user overrides its
  // default. Default = the exact-match product (suggestedComponent) or, if
  // none, a new raw-material product the server creates on migrate. So the
  // user usually just confirms the output and clicks Migrate.
  const [overrides, setOverrides] = useState<Record<number, { id: number; name: string; code: string }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const willCreateCount = formula.lines.filter((l: any) => !l.suggestedComponent && !overrides[l.formulaLineId]).length;

  async function handleMigrate() {
    if (!outputProduct) { setError('Pick which product this formula makes.'); return; }
    setSaving(true);
    setError('');
    try {
      await apiClient.migrateFormula(formula.formulaId, {
        assisted: true,
        outputProductId: outputProduct.id,
        overrides: Object.entries(overrides).map(([formulaLineId, p]) => ({
          formulaLineId: Number(formulaLineId),
          componentProductId: p.id,
        })),
      });
      onMigrated();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Migration failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.row} onClick={onToggle}>
        <strong style={{ cursor: 'pointer' }}>{formula.label}</strong>
        <span style={styles.subtle}>[{formula.family}] · {formula.lines.length} components{willCreateCount > 0 ? ` · ${willCreateCount} new part product(s) will be created` : ''}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '12px' }}>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.formRow}>
            <label style={styles.label}>This formula makes:</label>
            <ProductPicker
              value={outputProduct?.id ?? null}
              valueLabel={outputProduct ? `${outputProduct.code} - ${outputProduct.name}` : undefined}
              onChange={setOutputProduct}
            />
            {formula.outputCandidates.length > 0 && (
              <span style={styles.subtle}>suggestions: {formula.outputCandidates.slice(0, 3).map((c: any) => c.name).join(', ')}</span>
            )}
          </div>

          <table style={styles.table}>
            <thead>
              <tr><th style={styles.th}>Part</th><th style={styles.th}>Qty</th><th style={styles.th}>Maps to</th></tr>
            </thead>
            <tbody>
              {formula.lines.map((line: any) => {
                const override = overrides[line.formulaLineId];
                const current = override
                  ? { id: override.id, code: override.code, name: override.name }
                  : line.suggestedComponent
                    ? { id: line.suggestedComponent.productId, code: line.suggestedComponent.code, name: line.suggestedComponent.name }
                    : null;
                return (
                  <tr key={line.formulaLineId}>
                    <td style={styles.td}>{line.partName}</td>
                    <td style={styles.td}>{line.quantity}</td>
                    <td style={styles.td}>
                      {current === null && (
                        <div style={styles.willCreate}>➕ new raw-material product "{line.partName}" (Rs {line.unitCost}) — or pick an existing one:</div>
                      )}
                      <ProductPicker
                        value={current?.id ?? null}
                        valueLabel={current ? `${current.code} - ${current.name}` : undefined}
                        onChange={p => setOverrides(prev => ({ ...prev, [line.formulaLineId]: p }))}
                        placeholder={line.candidates.length ? `or search (suggested: ${line.candidates[0].name})` : 'or search to pick an existing product…'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button style={styles.btnPrimary} onClick={handleMigrate} disabled={saving}>
            {saving ? 'Migrating…' : 'Migrate this recipe'}
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #eee' },
  tabBtn: { padding: '10px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontSize: '14px', color: '#666', marginBottom: '-2px' },
  tabBtnActive: { color: '#2563eb', borderBottom: '2px solid #2563eb', fontWeight: 600 },
  toolbar: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' },
  searchInput: { padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', minWidth: '260px' },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  noResults: { textAlign: 'center', padding: '40px', color: '#999' },
  tableWrapper: { overflowX: 'auto', border: '1px solid #ddd', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' },
  th: { padding: '10px 12px', backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left', fontSize: '12px', fontWeight: 600 },
  td: { padding: '8px 12px', fontSize: '13px', borderBottom: '1px solid #eee' },
  clickableRow: { cursor: 'pointer' },
  info: { padding: '10px 12px', fontSize: '12px', color: '#666' },
  badgeActive: { padding: '3px 8px', borderRadius: '3px', fontSize: '11px', backgroundColor: '#d4edda', color: '#155724' },
  badgeInactive: { padding: '3px 8px', borderRadius: '3px', fontSize: '11px', backgroundColor: '#e2e3e5', color: '#383d41' },
  card: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  row: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  btn: { background: '#f3f4f6', color: '#111', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  btnPrimary: { background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  btnGhost: { background: 'transparent', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '6px', padding: '7px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', marginBottom: '10px' },
  btnGhostSmall: { background: 'transparent', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px', marginLeft: '6px' },
  btnDanger: { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '13px' },
  fileName: { fontSize: '13px', color: '#444' },
  note: { background: '#eff6ff', color: '#1e3a8a', padding: '10px', borderRadius: '6px', margin: '12px 0', fontSize: '13px' },
  warn: { background: '#fff3cd', color: '#856404', padding: '8px 10px', borderRadius: '6px', margin: '8px 0', fontSize: '13px' },
  error: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', margin: '10px 0', fontSize: '13px' },
  summary: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' },
  previewRecipe: { padding: '6px 0', fontSize: '13px', color: '#166534' },
  formRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' },
  label: { fontSize: '13px', fontWeight: 600, minWidth: '140px' },
  textInput: { padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', minWidth: '260px' },
  lineRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' },
  slotInput: { padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '140px' },
  willCreate: { fontSize: '11px', color: '#166534', marginBottom: '4px' },
  qtyInput: { padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '80px' },
  versionTag: { fontSize: '12px', color: '#666', fontWeight: 400 },
  subtle: { color: '#666', fontSize: '12px' },
  altNote: { fontSize: '11px', color: '#888' },
  totalCost: { fontSize: '15px', fontWeight: 600, marginTop: '10px' },
  checkRow: { display: 'block', padding: '6px 0', fontSize: '13px' },
  reviewRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' },
};
