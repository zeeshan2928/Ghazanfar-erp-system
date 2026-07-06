import { create } from 'zustand';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalEntry {
  id: string;
  referenceNumber: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  status: ApprovalStatus;
}

export interface ApprovalState {
  entryId: string;
  status: ApprovalStatus;
  comments: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

interface ApprovalStoreState {
  entries: ApprovalEntry[];
  approvalStates: Map<string, ApprovalState>;
  filterStatus: ApprovalStatus | 'all';
  selectedEntry: ApprovalEntry | null;
  isSubmitting: boolean;
  error: string | null;

  setEntries: (entries: ApprovalEntry[]) => void;
  setFilterStatus: (status: ApprovalStatus | 'all') => void;
  setSelectedEntry: (entry: ApprovalEntry | null) => void;
  updateApprovalState: (entryId: string, state: ApprovalState) => void;
  getApprovalState: (entryId: string) => ApprovalState | undefined;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useApprovalStore = create<ApprovalStoreState>((set, get) => ({
  entries: [],
  approvalStates: new Map(),
  filterStatus: 'all',
  selectedEntry: null,
  isSubmitting: false,
  error: null,

  setEntries: (entries) => set({ entries }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setSelectedEntry: (entry) => set({ selectedEntry: entry }),
  updateApprovalState: (entryId, state) =>
    set((s) => {
      const newMap = new Map(s.approvalStates);
      newMap.set(entryId, state);
      return { approvalStates: newMap };
    }),
  getApprovalState: (entryId) => get().approvalStates.get(entryId),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      entries: [],
      approvalStates: new Map(),
      filterStatus: 'all',
      selectedEntry: null,
      isSubmitting: false,
      error: null,
    }),
}));
