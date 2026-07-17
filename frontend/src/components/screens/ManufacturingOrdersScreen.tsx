import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/api';

type Status = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface MoListRow {
  id: number;
  orderNumber: string;
  finishedProductName: string;
  finishedProductCode: string;
  warehouseName: string;
  quantityPlanned: number;
  quantityProduced: number;
  status: Status;
  createdAt: string;
}

interface MoLine {
  id: number;
  slotName: string;
  componentProductId: number;
  componentName: string;
  componentCode: string;
  isService: boolean;
  quantityRequired: number;
  quantityConsumed: number | null;
  unitCostSnapshot: number | null;
  componentBatch: string | null;
}

interface MoView {
  id: number;
  orderNumber: string;
  bomName: string;
  bomVersion: number;
  finishedProductName: string;
  finishedProductCode: string;
  warehouseId: number;
  warehouseName: string;
  quantityPlanned: number;
  quantityProduced: number;
  quantityRejected: number;
  rejectReason: string | null;
  status: Status;
  unitCostSnapshot: number | null;
  remarks: string | null;
  createdAt: string;
  completedAt: string | null;
  lines: MoLine[];
}

interface BomOption {
  id: number;
  productId: number;
  productName: string;
  productCode: string;
  name: string;
  version: number;
  isActive: boolean;
}

interface WarehouseOption {
  id: number;
  name: string;
}

export function ManufacturingOrdersScreen() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [reporting, setReporting] = useState(false);

  if (reporting) {
    return <MoCostReport onBack={() => setReporting(false)} />;
  }
  if (selectedId !== null) {
    return <MoDetail orderId={selectedId} onBack={() => setSelectedId(null)} />;
  }
  if (creating) {
    return (
      <MoCreate
        onDone={(id) => { setCreating(false); setSelectedId(id); }}
        onCancel={() => setCreating(false)}
      />
    );
  }
  return <MoList onOpen={setSelectedId} onCreate={() => setCreating(true)} onReport={() => setReporting(true)} />;
}

// ============================================================================
// LIST — single effect keyed on its own inputs. Deliberately not the
// PurchaseOrdersScreen two-effect pattern (that one double-fetches on mount).
// ============================================================================

function MoList({ onOpen, onCreate, onReport }: { onOpen: (id: number) => void; onCreate: () => void; onReport: () => void }) {
  const [rows, setRows] = useState<MoListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status | ''>('');
  const [skip, setSkip] = useState(0);
  const take = 20;

  useEffect(() => {
    fetchRows();
  }, [search, status, skip]);

  async function fetchRows() {
    setLoading(true);
    try {
      const res = await apiClient.searchManufacturingOrders({
        search: search || undefined,
        status: status || undefined,
        skip,
        take,
      });
      setRows(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>🏭 Manufacturing Orders</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={styles.secondaryBtn} onClick={onReport}>📊 Cost Report</button>
          <button style={styles.primaryBtn} onClick={onCreate}>+ New Build</button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <input
          style={styles.searchInput}
          placeholder="Search by order number or product…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
        />
        <select style={styles.select} value={status} onChange={(e) => { setStatus(e.target.value as Status | ''); setSkip(0); }}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={styles.noResults}>No manufacturing orders found</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Batch #</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Warehouse</th>
                  <th style={styles.th}>Planned</th>
                  <th style={styles.th}>Produced</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={styles.rowClickable} onClick={() => onOpen(r.id)}>
                    <td style={styles.td}>{r.orderNumber}</td>
                    <td style={styles.td}>{r.finishedProductCode} - {r.finishedProductName}</td>
                    <td style={styles.td}>{r.warehouseName}</td>
                    <td style={styles.td}>{r.quantityPlanned}</td>
                    <td style={styles.td}>{r.quantityProduced}</td>
                    <td style={styles.td}><span style={getStatusStyle(r.status)}>{r.status}</span></td>
                    <td style={styles.td}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.pagination}>
            <div style={styles.info}>Showing {skip + 1} to {Math.min(skip + take, total)} of {total}</div>
            <div style={styles.buttons}>
              <button onClick={() => setSkip(Math.max(0, skip - take))} disabled={skip === 0} style={{ ...styles.btn, ...(skip === 0 ? styles.disabled : {}) }}>← Previous</button>
              <button onClick={() => setSkip(skip + take)} disabled={skip + take >= total} style={{ ...styles.btn, ...(skip + take >= total ? styles.disabled : {}) }}>Next →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// CREATE — pick a recipe (searchBoms), quantity, warehouse
// ============================================================================

function MoCreate({ onDone, onCancel }: { onDone: (id: number) => void; onCancel: () => void }) {
  const [bomQuery, setBomQuery] = useState('');
  const [bomResults, setBomResults] = useState<BomOption[]>([]);
  const [bomOpen, setBomOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState<BomOption | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiClient.getWarehouses().then((list) => setWarehouses(list ?? []));
  }, []);

  // Fetch active recipes for the dropdown. An empty query lists them all (up to
  // 50) so the menu opens with options the moment the field is focused - no
  // need to type first.
  async function loadBoms(query: string) {
    const res = await apiClient.searchBoms({ search: query.trim() || undefined, skip: 0, take: 50 });
    setBomResults((res.data ?? []).filter((b: BomOption) => b.isActive));
    setBomOpen(true);
  }

  function handleBomQueryChange(next: string) {
    setBomQuery(next);
    setSelectedBom(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { loadBoms(next); }, 250);
  }

  async function handleSubmit() {
    setError(null);
    if (!selectedBom) { setError('Pick a recipe first.'); return; }
    if (!warehouseId) { setError('Pick a warehouse.'); return; }
    if (!quantity || quantity < 1) { setError('Quantity must be at least 1.'); return; }

    setSaving(true);
    try {
      const order = await apiClient.createManufacturingOrder({
        bomId: selectedBom.id,
        quantityPlanned: quantity,
        warehouseId: Number(warehouseId),
        remarks: remarks || undefined,
      });
      onDone(order.id);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>🏭 New Manufacturing Order</h2>
        <button style={styles.secondaryBtn} onClick={onCancel}>← Back</button>
      </div>

      <div style={styles.form}>
        <label style={styles.label}>Recipe</label>
        <div style={{ position: 'relative' }}>
          <input
            style={styles.input}
            placeholder="Click to see recipes, or type to filter…"
            value={bomQuery}
            onChange={(e) => handleBomQueryChange(e.target.value)}
            onFocus={() => loadBoms(bomQuery)}
          />
          {bomOpen && bomResults.length > 0 && (
            <div style={styles.dropdown}>
              {bomResults.map((b) => (
                <div
                  key={b.id}
                  style={styles.option}
                  onMouseDown={() => {
                    setSelectedBom(b);
                    setBomQuery(`${b.name} (${b.productCode} - ${b.productName})`);
                    setBomOpen(false);
                  }}
                >
                  <strong>{b.name}</strong> — {b.productCode} {b.productName} <span style={{ color: '#999' }}>v{b.version}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <label style={styles.label}>Quantity to Build</label>
        <input
          style={styles.input}
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
        />

        <label style={styles.label}>Warehouse</label>
        <select style={styles.input} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Select warehouse…</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <label style={styles.label}>Remarks (optional)</label>
        <textarea style={{ ...styles.input, minHeight: '60px' }} value={remarks} onChange={(e) => setRemarks(e.target.value)} />

        {error && <div style={styles.errorBox}>{error}</div>}

        <button style={styles.primaryBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Creating…' : 'Create Order (plan only — nothing moves yet)'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// DETAIL — availability check on Start, complete form with per-line overrides
// ============================================================================

function MoDetail({ orderId, onBack }: { orderId: number; onBack: () => void }) {
  const [order, setOrder] = useState<MoView | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [quantityProduced, setQuantityProduced] = useState<number>(0);
  const [quantityRejected, setQuantityRejected] = useState<number>(0);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [consumption, setConsumption] = useState<Record<number, number>>({});
  const [variance, setVariance] = useState<any | null>(null);
  const [trace, setTrace] = useState<any | null>(null);
  // componentProductId -> its received batches; lineId -> the selected batch.
  const [batchOptions, setBatchOptions] = useState<Record<number, any[]>>({});
  const [batchByLine, setBatchByLine] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  async function fetchOrder() {
    setLoading(true);
    try {
      const o = await apiClient.getManufacturingOrder(orderId);
      setOrder(o);
      setQuantityProduced(o.quantityPlanned);
      const defaults: Record<number, number> = {};
      for (const line of o.lines) defaults[line.id] = line.quantityRequired;
      setConsumption(defaults);
      // Planned-vs-actual and traceability are only meaningful once built.
      if (o.status === 'COMPLETED') {
        try { setVariance(await apiClient.getManufacturingOrderVariance(orderId)); } catch { setVariance(null); }
        try { setTrace(await apiClient.getManufacturingOrderTrace(orderId)); } catch { setTrace(null); }
      } else {
        setVariance(null);
        setTrace(null);
      }

      // For an in-progress order, load each real component's received batches so
      // the completion form can offer a "batch used" picker defaulted to latest.
      if (o.status === 'IN_PROGRESS') {
        const opts: Record<number, any[]> = {};
        const defaults: Record<number, string> = {};
        await Promise.all(o.lines.filter((l: MoLine) => !l.isService).map(async (l: MoLine) => {
          try {
            const batches = await apiClient.getComponentBatches(l.componentProductId, o.warehouseId);
            opts[l.componentProductId] = batches;
            if (batches[0]) defaults[l.id] = batches[0].batchNumber; // latest
          } catch { /* leave empty */ }
        }));
        setBatchOptions(opts);
        setBatchByLine(defaults);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setActionError(null);
    setBusy(true);
    try {
      await apiClient.startManufacturingOrder(orderId);
      await fetchOrder();
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? 'Failed to start production');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this manufacturing order? Nothing was moved yet, so this is safe.')) return;
    setActionError(null);
    setBusy(true);
    try {
      await apiClient.cancelManufacturingOrder(orderId);
      await fetchOrder();
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? 'Failed to cancel order');
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!order) return;
    setActionError(null);
    setBusy(true);
    try {
      const lineConsumption = order.lines.map((l) => ({ lineId: l.id, quantityConsumed: consumption[l.id] ?? l.quantityRequired }));
      const lineBatches = order.lines
        .filter((l) => !l.isService && batchByLine[l.id])
        .map((l) => ({ lineId: l.id, componentBatch: batchByLine[l.id] }));
      await apiClient.completeManufacturingOrder(orderId, {
        quantityProduced,
        quantityRejected,
        rejectReason: rejectReason || undefined,
        lineConsumption,
        lineBatches,
      });
      setCompleting(false);
      await fetchOrder();
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? 'Failed to complete production');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !order) return <div style={styles.container}><p style={styles.loading}>Loading…</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>🏭 {order.orderNumber}</h2>
        <button style={styles.secondaryBtn} onClick={onBack}>← Back to list</button>
      </div>

      <div style={styles.detailGrid}>
        <div><strong>Status</strong><div><span style={getStatusStyle(order.status)}>{order.status}</span></div></div>
        <div><strong>Recipe</strong><div>{order.bomName} (v{order.bomVersion})</div></div>
        <div><strong>Finished Product</strong><div>{order.finishedProductCode} - {order.finishedProductName}</div></div>
        <div><strong>Warehouse</strong><div>{order.warehouseName}</div></div>
        <div><strong>Planned / Produced</strong><div>{order.quantityPlanned} / {order.quantityProduced}</div></div>
        {order.status === 'COMPLETED' && order.quantityRejected > 0 && (
          <div><strong>Rejected (QC)</strong><div style={{ color: '#b91c1c' }}>{order.quantityRejected}{order.rejectReason ? ` — ${order.rejectReason}` : ''}</div></div>
        )}
        <div><strong>Batch Cost (frozen)</strong><div>{order.unitCostSnapshot != null ? `Rs ${order.unitCostSnapshot.toLocaleString()}` : '—'}</div></div>
        <div><strong>Created</strong><div>{new Date(order.createdAt).toLocaleString()}</div></div>
        <div><strong>Completed</strong><div>{order.completedAt ? new Date(order.completedAt).toLocaleString() : '—'}</div></div>
      </div>

      {order.remarks && <p style={styles.remarks}>Remarks: {order.remarks}</p>}

      <h3 style={styles.subheading}>Components</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Slot</th>
              <th style={styles.th}>Component</th>
              <th style={styles.th}>Required</th>
              <th style={styles.th}>Consumed</th>
              <th style={styles.th}>Batch used</th>
              <th style={styles.th}>Unit Cost</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => {
              const isCompleting = completing && order.status === 'IN_PROGRESS';
              const opts = batchOptions[l.componentProductId] ?? [];
              return (
              <tr key={l.id}>
                <td style={styles.td}>{l.slotName}{l.isService && <span style={styles.serviceTag}>service</span>}</td>
                <td style={styles.td}>{l.componentCode} - {l.componentName}</td>
                <td style={styles.td}>{l.quantityRequired}</td>
                <td style={styles.td}>
                  {isCompleting ? (
                    <input
                      style={styles.smallInput}
                      type="number"
                      min={0}
                      step="0.01"
                      value={consumption[l.id] ?? l.quantityRequired}
                      onChange={(e) => setConsumption({ ...consumption, [l.id]: parseFloat(e.target.value) || 0 })}
                    />
                  ) : (
                    l.quantityConsumed ?? '—'
                  )}
                </td>
                <td style={styles.td}>
                  {l.isService ? (
                    <span style={{ color: '#999' }}>—</span>
                  ) : isCompleting ? (
                    opts.length ? (
                      <select
                        style={styles.smallSelect}
                        value={batchByLine[l.id] ?? ''}
                        onChange={(e) => setBatchByLine({ ...batchByLine, [l.id]: e.target.value })}
                      >
                        <option value="">(none)</option>
                        {opts.map((b: any) => (
                          <option key={b.batchNumber} value={b.batchNumber}>{b.batchNumber} · {new Date(b.receivedDate).toLocaleDateString()}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ color: '#999', fontSize: '11px' }}>no received batches</span>
                    )
                  ) : (
                    l.componentBatch ?? '—'
                  )}
                </td>
                <td style={styles.td}>{l.unitCostSnapshot != null ? `Rs ${l.unitCostSnapshot.toLocaleString()}` : '—'}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {order.status === 'COMPLETED' && variance && <VariancePanel v={variance} />}
      {order.status === 'COMPLETED' && trace && <TraceabilityPanel t={trace} />}

      {actionError && <div style={styles.errorBox}>{actionError}</div>}

      <div style={styles.actionsBar}>
        {order.status === 'DRAFT' && (
          <>
            <button style={styles.primaryBtn} onClick={handleStart} disabled={busy}>
              {busy ? 'Checking stock…' : 'Start Production (checks material availability)'}
            </button>
            <button style={styles.dangerBtn} onClick={handleCancel} disabled={busy}>Cancel Order</button>
          </>
        )}
        {order.status === 'IN_PROGRESS' && !completing && (
          <>
            <button style={styles.primaryBtn} onClick={() => setCompleting(true)} disabled={busy}>Complete Production</button>
            <button style={styles.dangerBtn} onClick={handleCancel} disabled={busy}>Cancel Order</button>
          </>
        )}
        {order.status === 'IN_PROGRESS' && completing && (
          <div style={styles.completeForm}>
            <label style={styles.label}>Quantity produced (passed QC)</label>
            <input
              style={styles.input}
              type="number"
              min={0}
              value={quantityProduced}
              onChange={(e) => setQuantityProduced(parseInt(e.target.value, 10) || 0)}
            />
            <label style={styles.label}>Rejected (failed QC)</label>
            <input
              style={styles.input}
              type="number"
              min={0}
              value={quantityRejected}
              onChange={(e) => setQuantityRejected(parseInt(e.target.value, 10) || 0)}
            />
            {quantityRejected > 0 && (
              <>
                <label style={styles.label}>Reason for rejection</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="e.g. motor noise, cosmetic damage…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </>
            )}
            <p style={{ fontSize: '12px', color: '#666' }}>Rejected units aren't added to stock (their parts were still used). Adjust "Consumed" per component above only if usage differed from the plan — the difference is your scrap.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={styles.primaryBtn} onClick={handleComplete} disabled={busy}>{busy ? 'Completing…' : 'Confirm — move stock now'}</button>
              <button style={styles.secondaryBtn} onClick={() => setCompleting(false)} disabled={busy}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// VARIANCE PANEL — planned vs actual for a completed batch, split into the
// price move (component prices changed since planning) and usage/scrap.
// ============================================================================

function money(n: number): string {
  const s = `Rs ${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return n < 0 ? `(${s})` : s;
}
function varianceColor(n: number): React.CSSProperties {
  // A positive variance = cost OVER plan (bad, red); negative = under (good, green).
  if (n > 0.001) return { color: '#b91c1c' };
  if (n < -0.001) return { color: '#166534' };
  return { color: '#555' };
}

function VariancePanel({ v }: { v: any }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={styles.subheading}>Cost & Variance (planned vs actual)</h3>
      {!v.captured && (
        <p style={{ fontSize: '12px', color: '#856404', background: '#fff3cd', padding: '8px 10px', borderRadius: '4px' }}>
          This order was created before planned costs were captured, so the price variance can't be computed for it. Newer orders will show it.
        </p>
      )}
      <div style={styles.varianceCards}>
        <div style={styles.vCard}><div style={styles.vLabel}>Planned</div><div style={styles.vBig}>{money(v.plannedTotal)}</div></div>
        <div style={styles.vCard}><div style={styles.vLabel}>Actual</div><div style={styles.vBig}>{money(v.actualTotal)}</div></div>
        <div style={styles.vCard}><div style={styles.vLabel}>Price variance</div><div style={{ ...styles.vBig, ...varianceColor(v.priceVariance) }}>{money(v.priceVariance)}</div></div>
        <div style={styles.vCard}><div style={styles.vLabel}>Usage / scrap variance</div><div style={{ ...styles.vBig, ...varianceColor(v.usageVariance) }}>{money(v.usageVariance)}</div></div>
        <div style={styles.vCard}><div style={styles.vLabel}>Total variance</div><div style={{ ...styles.vBig, ...varianceColor(v.totalVariance) }}>{money(v.totalVariance)}</div></div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Component</th>
              <th style={styles.th}>Req / Used</th>
              <th style={styles.th}>Planned unit</th>
              <th style={styles.th}>Actual unit</th>
              <th style={styles.th}>Price var.</th>
              <th style={styles.th}>Usage var.</th>
              <th style={styles.th}>Line var.</th>
            </tr>
          </thead>
          <tbody>
            {v.lines.map((l: any, i: number) => (
              <tr key={i}>
                <td style={styles.td}>{l.componentCode} - {l.componentName}</td>
                <td style={styles.td}>{l.quantityRequired} / {l.quantityConsumed}</td>
                <td style={styles.td}>{money(l.plannedUnitCost)}</td>
                <td style={styles.td}>{money(l.actualUnitCost)}</td>
                <td style={{ ...styles.td, ...varianceColor(l.priceVariance) }}>{money(l.priceVariance)}</td>
                <td style={{ ...styles.td, ...varianceColor(l.usageVariance) }}>{money(l.usageVariance)}</td>
                <td style={{ ...styles.td, ...varianceColor(l.lineVariance) }}>{money(l.lineVariance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// COST REPORT — true unit cost + margin per manufactured product across all
// completed builds. Cost/margin columns arrive already stripped from the
// server for users without financial visibility.
// ============================================================================

function MoCostReport({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'cost' | 'quality'>('cost');
  const [rows, setRows] = useState<any[]>([]);
  const [yieldRows, setYieldRows] = useState<any[]>([]);
  const [vendorRows, setVendorRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cost, ys, vd] = await Promise.all([
          apiClient.getManufacturingProductCostSummary(),
          apiClient.getManufacturingYieldScrap(),
          apiClient.getManufacturingVendorDefects(),
        ]);
        setRows(cost); setYieldRows(ys); setVendorRows(vd);
      } finally { setLoading(false); }
    })();
  }, []);

  const canSeeCost = rows.some(r => r.avgUnitCost != null) || yieldRows.some(r => r.componentScrapCost != null);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>📊 Manufacturing Reports</h2>
        <button style={styles.secondaryBtn} onClick={onBack}>← Back to orders</button>
      </div>

      <div style={styles.tabs}>
        <button style={{ ...styles.tabBtn, ...(tab === 'cost' ? styles.tabBtnActive : {}) }} onClick={() => setTab('cost')}>Cost & Margin</button>
        <button style={{ ...styles.tabBtn, ...(tab === 'quality' ? styles.tabBtnActive : {}) }} onClick={() => setTab('quality')}>Yield & Quality</button>
      </div>

      {loading ? <p style={styles.loading}>Loading…</p> : (
        !canSeeCost && <p style={{ fontSize: '12px', color: '#666' }}>Cost/margin figures are hidden for your account; operational counts are shown.</p>
      )}

      {!loading && tab === 'cost' && (
        rows.length === 0 ? <p style={styles.noResults}>No completed manufacturing orders yet — build something first.</p> : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Builds</th>
                  <th style={styles.th}>Units produced</th>
                  {canSeeCost && <th style={styles.th}>Avg unit cost</th>}
                  {canSeeCost && <th style={styles.th}>Total cost</th>}
                  {canSeeCost && <th style={styles.th}>Selling price</th>}
                  {canSeeCost && <th style={styles.th}>Margin</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.finishedProductId}>
                    <td style={styles.td}>{r.productCode} - {r.productName}</td>
                    <td style={styles.td}>{r.orders}</td>
                    <td style={styles.td}>{r.unitsProduced}</td>
                    {canSeeCost && <td style={styles.td}>{r.avgUnitCost != null ? money(r.avgUnitCost) : '—'}</td>}
                    {canSeeCost && <td style={styles.td}>{r.totalActualCost != null ? money(r.totalActualCost) : '—'}</td>}
                    {canSeeCost && <td style={styles.td}>{r.sellingPrice != null ? money(r.sellingPrice) : '—'}</td>}
                    {canSeeCost && <td style={styles.td}>{r.margin != null ? <span style={varianceColor(-r.margin)}>{money(r.margin)}{r.marginPercent != null ? ` (${r.marginPercent.toFixed(0)}%)` : ''}</span> : '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {!loading && tab === 'quality' && (
        <>
          <h3 style={styles.subheading}>Yield & Scrap (per product)</h3>
          {yieldRows.length === 0 ? <p style={styles.noResults}>Nothing built yet.</p> : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Planned</th>
                    <th style={styles.th}>Produced</th>
                    <th style={styles.th}>Rejected</th>
                    <th style={styles.th}>Yield</th>
                    {canSeeCost && <th style={styles.th}>Scrap cost</th>}
                  </tr>
                </thead>
                <tbody>
                  {yieldRows.map((r) => (
                    <tr key={r.finishedProductId}>
                      <td style={styles.td}>{r.productCode} - {r.productName}</td>
                      <td style={styles.td}>{r.totalPlanned}</td>
                      <td style={styles.td}>{r.totalProduced}</td>
                      <td style={{ ...styles.td, ...(r.totalRejected > 0 ? { color: '#b91c1c' } : {}) }}>{r.totalRejected}</td>
                      <td style={{ ...styles.td, ...(r.yieldPercent < 90 ? { color: '#b91c1c' } : { color: '#166534' }) }}>{r.yieldPercent.toFixed(0)}%</td>
                      {canSeeCost && <td style={styles.td}>{r.componentScrapCost != null ? money(r.componentScrapCost) : '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 style={styles.subheading}>Vendor Defect Scorecard</h3>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '-4px' }}>Which vendors' components get scrapped most (from builds where the batch was recorded).</p>
          {vendorRows.length === 0 ? <p style={styles.noResults}>No component scrap traced to a vendor yet.</p> : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Vendor</th>
                    <th style={styles.th}>Scrapped qty</th>
                    <th style={styles.th}>Received qty</th>
                    <th style={styles.th}>Scrap rate</th>
                    {canSeeCost && <th style={styles.th}>Scrap cost</th>}
                  </tr>
                </thead>
                <tbody>
                  {vendorRows.map((r) => (
                    <tr key={r.vendorId}>
                      <td style={styles.td}>{r.vendorName}</td>
                      <td style={styles.td}>{r.scrappedQuantity}</td>
                      <td style={styles.td}>{r.receivedQuantity}</td>
                      <td style={{ ...styles.td, ...(r.scrapRatePercent > 2 ? { color: '#b91c1c' } : {}) }}>{r.scrapRatePercent.toFixed(1)}%</td>
                      {canSeeCost && <td style={styles.td}>{r.scrapCost != null ? money(r.scrapCost) : '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// TRACEABILITY — this build's finished batch + the vendor batch every component
// came from, plus a "where used" lookup (which builds consumed a given batch).
// ============================================================================

function TraceabilityPanel({ t }: { t: any }) {
  const [lookup, setLookup] = useState('');
  const [used, setUsed] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function runLookup(batch: string) {
    if (!batch) return;
    setBusy(true);
    try { setUsed(await apiClient.whereBatchUsed(batch)); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={styles.subheading}>Traceability</h3>
      <p style={{ fontSize: '13px', marginBottom: '8px' }}>Finished batch: <strong>{t.finishedBatch}</strong> · {t.quantityProduced} unit(s) of {t.finishedProductName}</p>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Component</th>
              <th style={styles.th}>Batch used</th>
              <th style={styles.th}>Received</th>
              <th style={styles.th}>From PO / Vendor</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {t.lines.map((l: any, i: number) => (
              <tr key={i}>
                <td style={styles.td}>{l.componentCode} - {l.componentName}</td>
                <td style={styles.td}>{l.componentBatch ?? <span style={{ color: '#999' }}>—</span>}</td>
                <td style={styles.td}>{l.receivedDate ? new Date(l.receivedDate).toLocaleDateString() : '—'}</td>
                <td style={styles.td}>{l.poNumber ? `${l.poNumber} · ${l.vendorName}` : '—'}</td>
                <td style={styles.td}>
                  {l.componentBatch && (
                    <button style={styles.linkBtn} onClick={() => { setLookup(l.componentBatch); runLookup(l.componentBatch); }}>where used →</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={styles.searchInput} placeholder="Look up a batch (RCPT-…) — which builds used it?" value={lookup} onChange={(e) => setLookup(e.target.value)} />
        <button style={styles.secondaryBtn} onClick={() => runLookup(lookup.trim())} disabled={busy}>{busy ? 'Searching…' : 'Find builds'}</button>
      </div>
      {used && (
        used.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>No builds consumed that batch.</p>
        ) : (
          <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '13px' }}>
            {used.map((u: any, i: number) => (
              <li key={i}>{u.finishedBatch} — {u.finishedProductName} (used as {u.componentName}{u.quantityConsumed != null ? `, ${u.quantityConsumed} qty` : ''}{u.completedAt ? `, ${new Date(u.completedAt).toLocaleDateString()}` : ''})</li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function getStatusStyle(status: Status): React.CSSProperties {
  const base: React.CSSProperties = { padding: '4px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 500 };
  if (status === 'COMPLETED') return { ...base, backgroundColor: '#d4edda', color: '#155724' };
  if (status === 'IN_PROGRESS') return { ...base, backgroundColor: '#fff3cd', color: '#856404' };
  if (status === 'CANCELLED') return { ...base, backgroundColor: '#f8d7da', color: '#721c24' };
  return { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  toolbar: { display: 'flex', gap: '10px', marginBottom: '14px' },
  searchInput: { flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  select: { padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  noResults: { textAlign: 'center', padding: '40px', color: '#999' },
  tableWrapper: { overflowX: 'auto', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' },
  th: { padding: '12px', backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left', fontSize: '12px', fontWeight: 600 },
  td: { padding: '10px 12px', fontSize: '13px', borderBottom: '1px solid #eee' },
  rowClickable: { cursor: 'pointer' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #eee' },
  info: { fontSize: '12px', color: '#666' },
  buttons: { display: 'flex', gap: '8px' },
  btn: { padding: '8px 16px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  disabled: { backgroundColor: '#ccc', cursor: 'not-allowed' },
  primaryBtn: { padding: '10px 18px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
  secondaryBtn: { padding: '10px 18px', backgroundColor: '#e2e3e5', color: '#383d41', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  dangerBtn: { padding: '10px 18px', backgroundColor: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  form: { display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '480px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#555', marginTop: '10px' },
  input: { padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  smallInput: { width: '80px', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' },
  smallSelect: { padding: '4px 6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', maxWidth: '200px' },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', padding: 0 },
  dropdown: { position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.12)' },
  option: { padding: '8px 10px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' },
  errorBox: { padding: '10px 14px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '13px', margin: '10px 0' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #eee', fontSize: '13px' },
  remarks: { fontSize: '13px', color: '#666', fontStyle: 'italic', marginBottom: '12px' },
  subheading: { fontSize: '15px', marginTop: '20px', marginBottom: '8px' },
  serviceTag: { marginLeft: '6px', fontSize: '10px', padding: '2px 6px', borderRadius: '3px', backgroundColor: '#e2e3e5', color: '#555' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #eee' },
  tabBtn: { padding: '10px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontSize: '14px', color: '#666', marginBottom: '-2px' },
  tabBtnActive: { color: '#2563eb', borderBottom: '2px solid #2563eb', fontWeight: 600 },
  varianceCards: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' },
  vCard: { flex: '1 1 120px', minWidth: '120px', padding: '12px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '6px' },
  vLabel: { fontSize: '11px', color: '#666', marginBottom: '4px' },
  vBig: { fontSize: '16px', fontWeight: 700 },
  actionsBar: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' },
  completeForm: { display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '320px', padding: '14px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #eee' },
};
