import { create } from 'zustand';

export interface AuditComment {
  id: string;
  entryId: string;
  author: string;
  content: string;
  timestamp: string;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'COMMENT_ADDED'
  | 'APPROVE'
  | 'REJECT';

export interface AuditLogEntry {
  id: string;
  entryId: string;
  action: AuditAction;
  by: string;
  timestamp: string;
  details?: Record<string, any>;
}

interface AuditStoreState {
  comments: Map<string, AuditComment[]>;
  auditLogs: AuditLogEntry[];
  filterAction: AuditAction | 'all';
  selectedEntryId: string | null;

  addComment: (entryId: string, comment: AuditComment) => void;
  getComments: (entryId: string) => AuditComment[];
  addAuditLog: (log: AuditLogEntry) => void;
  setFilterAction: (action: AuditAction | 'all') => void;
  setSelectedEntryId: (entryId: string | null) => void;
  getFilteredLogs: () => AuditLogEntry[];
  reset: () => void;
}

export const useAuditStore = create<AuditStoreState>((set, get) => ({
  comments: new Map(),
  auditLogs: [],
  filterAction: 'all',
  selectedEntryId: null,

  addComment: (entryId, comment) =>
    set((state) => {
      const newComments = new Map(state.comments);
      const entryComments = newComments.get(entryId) || [];
      newComments.set(entryId, [...entryComments, comment]);
      return { comments: newComments };
    }),

  getComments: (entryId) => get().comments.get(entryId) || [],

  addAuditLog: (log) =>
    set((state) => ({
      auditLogs: [log, ...state.auditLogs],
    })),

  setFilterAction: (action) => set({ filterAction: action }),

  setSelectedEntryId: (entryId) => set({ selectedEntryId: entryId }),

  getFilteredLogs: () => {
    const state = get();
    if (state.filterAction === 'all') {
      return state.auditLogs;
    }
    return state.auditLogs.filter((log) => log.action === state.filterAction);
  },

  reset: () =>
    set({
      comments: new Map(),
      auditLogs: [],
      filterAction: 'all',
      selectedEntryId: null,
    }),
}));
