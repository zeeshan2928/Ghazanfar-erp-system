// Local-first storage for the Assembly Formula (BOM) tool. Unlike the
// cash-book offline cache (which is an *expiring* mirror of server truth),
// here localStorage is the PRIMARY, always-available store so the tool works
// fully offline on the laptop - so there is deliberately NO TTL. Server sync
// is a separate, explicit user action (see formulaStore).

export interface StoredPart {
  id: number | string; // string = locally-created, not yet on server (future use)
  family: 'JUICER' | 'BLENDER';
  name: string;
  unitCost: number;
  hadPriceConflict: boolean;
  conflictNote?: string | null;
}

export interface StoredFormulaLine {
  partId: number | string;
  name: string;
  quantity: number;
}

export interface StoredFormula {
  id: number | string;
  family: 'JUICER' | 'BLENDER';
  label: string;
  productCodes: string[];
  sourceFile: string | null;
  lineParts: StoredFormulaLine[]; // references parts by id; total is derived from part prices
}

const PARTS_KEY = 'assembly-formulas-parts';
const FORMULAS_KEY = 'assembly-formulas-data';
const DIRTY_PARTS_KEY = 'assembly-formulas-dirty-parts';
const LAST_SYNC_KEY = 'assembly-formulas-last-sync';

export const formulaOfflineStorage = {
  saveParts(parts: StoredPart[]): void {
    localStorage.setItem(PARTS_KEY, JSON.stringify(parts));
  },
  getParts(): StoredPart[] {
    try {
      return JSON.parse(localStorage.getItem(PARTS_KEY) || '[]');
    } catch {
      return [];
    }
  },

  saveFormulas(formulas: StoredFormula[]): void {
    localStorage.setItem(FORMULAS_KEY, JSON.stringify(formulas));
  },
  getFormulas(): StoredFormula[] {
    try {
      return JSON.parse(localStorage.getItem(FORMULAS_KEY) || '[]');
    } catch {
      return [];
    }
  },

  // Dirty = part ids whose price was edited locally since the last successful
  // sync. Simpler than the cash-book PendingOperation queue: sync is an
  // explicit click, so there's no retry counter to track.
  getDirtyPartIds(): (number | string)[] {
    try {
      return JSON.parse(localStorage.getItem(DIRTY_PARTS_KEY) || '[]');
    } catch {
      return [];
    }
  },
  markPartDirty(partId: number | string): void {
    const dirty = new Set(this.getDirtyPartIds());
    dirty.add(partId);
    localStorage.setItem(DIRTY_PARTS_KEY, JSON.stringify([...dirty]));
  },
  clearDirty(): void {
    localStorage.setItem(DIRTY_PARTS_KEY, JSON.stringify([]));
  },

  setLastSync(iso: string): void {
    localStorage.setItem(LAST_SYNC_KEY, iso);
  },
  getLastSync(): string | null {
    return localStorage.getItem(LAST_SYNC_KEY);
  },

  clearAll(): void {
    localStorage.removeItem(PARTS_KEY);
    localStorage.removeItem(FORMULAS_KEY);
    localStorage.removeItem(DIRTY_PARTS_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
  },
};
