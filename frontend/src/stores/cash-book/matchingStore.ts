import { create } from 'zustand';

export interface Bill {
  id: string;
  billNumber: string;
  amount: number;
  date: string;
  supplier: string;
  reference?: string;
  status: 'pending' | 'partial' | 'unmatched';
}

export interface MatchPair {
  id: string;
  billId: string;
  entryId: string;
  matchedAmount: number;
  reason?: string;
  timestamp: string;
  confidence: number;
}

interface MatchingStore {
  unmatchedBills: Bill[];
  matchedPairs: MatchPair[];
  matchingCandidates: Record<string, any[]>;
  isLoading: boolean;
  error: string | null;

  setUnmatchedBills: (bills: Bill[]) => void;
  setMatchedPairs: (pairs: MatchPair[]) => void;
  setMatchingCandidates: (billId: string, candidates: any[]) => void;
  matchBill: (billId: string, entryId: string, reason?: string) => void;
  undoMatch: (matchId: string) => void;
  autoMatch: () => void;
  syncMatches: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBillMatchingStore = create<MatchingStore>((set) => ({
  unmatchedBills: [],
  matchedPairs: [],
  matchingCandidates: {},
  isLoading: false,
  error: null,

  setUnmatchedBills: (bills) => set({ unmatchedBills: bills }),
  setMatchedPairs: (pairs) => set({ matchedPairs: pairs }),
  setMatchingCandidates: (billId, candidates) =>
    set((state) => ({
      matchingCandidates: {
        ...state.matchingCandidates,
        [billId]: candidates,
      },
    })),

  matchBill: (billId, entryId, reason) =>
    set((state) => {
      const newMatch: MatchPair = {
        id: `match-${Date.now()}`,
        billId,
        entryId,
        matchedAmount: 0,
        reason,
        timestamp: new Date().toISOString(),
        confidence: 0,
      };
      return {
        matchedPairs: [...state.matchedPairs, newMatch],
        unmatchedBills: state.unmatchedBills.filter((b) => b.id !== billId),
      };
    }),

  undoMatch: (matchId) =>
    set((state) => ({
      matchedPairs: state.matchedPairs.filter((m) => m.id !== matchId),
    })),

  autoMatch: () => set({ isLoading: true }),

  syncMatches: () => set({}),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
