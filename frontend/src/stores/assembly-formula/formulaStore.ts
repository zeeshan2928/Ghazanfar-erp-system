import { create } from 'zustand';
import { apiClient } from '../../services/api';
import {
  formulaOfflineStorage,
  StoredPart,
  StoredFormula,
} from '../../utils/assembly-formula-offline/formulaOfflineStorage';

export type AssemblyFamily = 'JUICER' | 'BLENDER';

// A formula with its total DERIVED from the current part prices held in this
// store - so editing any part's price instantly recomputes every formula
// that uses it (the "change one thing, totals update" behavior), entirely
// client-side, no network round-trip.
export interface ComputedFormula extends StoredFormula {
  totalCost: number;
  lines: { partId: number | string; name: string; unitCost: number; quantity: number; lineTotal: number; hadPriceConflict: boolean }[];
}

interface FormulaStore {
  parts: StoredPart[];
  formulas: StoredFormula[];
  dirtyPartIds: (number | string)[];
  lastSyncedAt: string | null;
  loading: boolean;
  error: string | null;

  loadLocal: () => void;
  loadFromServer: (opts?: { force?: boolean }) => Promise<{ ok: boolean; blockedByDirty?: boolean }>;
  updatePartCost: (partId: number | string, unitCost: number) => void;
  syncToServer: () => Promise<{ synced: number; failed: number; message: string }>;
  computedFormulas: () => ComputedFormula[];
  partById: (id: number | string) => StoredPart | undefined;
}

function computeFormula(formula: StoredFormula, partMap: Map<number | string, StoredPart>): ComputedFormula {
  const lines = formula.lineParts.map(lp => {
    const part = partMap.get(lp.partId);
    const unitCost = part ? part.unitCost : 0;
    return {
      partId: lp.partId,
      name: part ? part.name : lp.name,
      unitCost,
      quantity: lp.quantity,
      lineTotal: unitCost * lp.quantity,
      hadPriceConflict: part ? part.hadPriceConflict : false,
    };
  });
  return { ...formula, lines, totalCost: lines.reduce((s, l) => s + l.lineTotal, 0) };
}

export const useFormulaStore = create<FormulaStore>((set, get) => ({
  parts: [],
  formulas: [],
  dirtyPartIds: [],
  lastSyncedAt: null,
  loading: false,
  error: null,

  loadLocal: () => {
    set({
      parts: formulaOfflineStorage.getParts(),
      formulas: formulaOfflineStorage.getFormulas(),
      dirtyPartIds: formulaOfflineStorage.getDirtyPartIds(),
      lastSyncedAt: formulaOfflineStorage.getLastSync(),
    });
  },

  loadFromServer: async (opts) => {
    // Guard against silently discarding unsynced local edits.
    if (!opts?.force && get().dirtyPartIds.length > 0) {
      return { ok: false, blockedByDirty: true };
    }
    set({ loading: true, error: null });
    try {
      const [serverFormulas, serverParts] = await Promise.all([
        apiClient.getAssemblyFormulas(),
        apiClient.getAssemblyParts(),
      ]);
      const parts: StoredPart[] = serverParts.map((p: any) => ({
        id: p.id,
        family: p.family,
        name: p.name,
        unitCost: p.unitCost,
        hadPriceConflict: p.hadPriceConflict,
        conflictNote: p.conflictNote,
      }));
      const formulas: StoredFormula[] = serverFormulas.map((f: any) => ({
        id: f.id,
        family: f.family,
        label: f.label,
        productCodes: f.productCodes,
        sourceFile: f.sourceFile,
        lineParts: f.lines.map((l: any) => ({ partId: l.partId, name: l.name, quantity: l.quantity })),
      }));
      const now = new Date().toISOString();
      formulaOfflineStorage.saveParts(parts);
      formulaOfflineStorage.saveFormulas(formulas);
      formulaOfflineStorage.clearDirty();
      formulaOfflineStorage.setLastSync(now);
      set({ parts, formulas, dirtyPartIds: [], lastSyncedAt: now, loading: false });
      return { ok: true };
    } catch (e: any) {
      set({ loading: false, error: 'Failed to load from server' });
      return { ok: false };
    }
  },

  // Local-only edit: updates the part price + recomputes everything on next
  // render, marks the part dirty, persists to localStorage. NO network call -
  // this is what makes the tool instantly usable offline.
  updatePartCost: (partId, unitCost) => {
    const parts = get().parts.map(p =>
      p.id === partId ? { ...p, unitCost, hadPriceConflict: false, conflictNote: null } : p,
    );
    formulaOfflineStorage.saveParts(parts);
    formulaOfflineStorage.markPartDirty(partId);
    set({ parts, dirtyPartIds: formulaOfflineStorage.getDirtyPartIds() });
  },

  syncToServer: async () => {
    const { dirtyPartIds, parts } = get();
    let synced = 0;
    let failed = 0;
    for (const partId of dirtyPartIds) {
      if (typeof partId !== 'number') continue; // locally-created parts unsupported in v1
      const part = parts.find(p => p.id === partId);
      if (!part) continue;
      try {
        await apiClient.updateAssemblyPartCost(partId, part.unitCost);
        synced++;
      } catch {
        failed++;
      }
    }
    if (failed === 0) {
      const now = new Date().toISOString();
      formulaOfflineStorage.clearDirty();
      formulaOfflineStorage.setLastSync(now);
      set({ dirtyPartIds: [], lastSyncedAt: now });
    }
    return {
      synced,
      failed,
      message:
        failed === 0
          ? `Synced ${synced} price change(s) to the server.`
          : `Synced ${synced}, but ${failed} failed - still marked unsynced, try again.`,
    };
  },

  computedFormulas: () => {
    const partMap = new Map(get().parts.map(p => [p.id, p]));
    return get().formulas.map(f => computeFormula(f, partMap));
  },

  partById: id => get().parts.find(p => p.id === id),
}));
