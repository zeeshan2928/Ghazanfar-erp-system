import { create } from 'zustand';

export interface BillItem {
  id: string;
  billNumber: string;
  amount: number;
  date: string;
  vendor: string;
  category: string;
  description: string;
}

export interface CashEntry {
  id: string;
  referenceNumber: string;
  amount: number;
  date: string;
  description: string;
}

export interface MatchCandidate {
  id: string;
  entryId: string;
  billId: string;
  confidence: number;
  reason: string;
  amountDiff: number;
  dateDiff: number;
}

export interface MatchPair {
  id: string;
  billId: string;
  entryId: string;
  confidence: number;
  matchedAt: string;
}

interface BillMatchingState {
  unmatchedBills: BillItem[];
  matchedCount: number;
  unconfirmedCount: number;
  selectedBill: BillItem | null;
  candidates: MatchCandidate[];
  matchedPairs: MatchPair[];
  isAutoMatching: boolean;
  autoMatchProgress: number;

  setUnmatchedBills: (bills: BillItem[]) => void;
  setSelectedBill: (bill: BillItem | null) => void;
  setCandidates: (candidates: MatchCandidate[]) => void;
  addMatchPair: (pair: MatchPair) => void;
  removeMatchPair: (pairId: string) => void;
  setIsAutoMatching: (isAutoMatching: boolean) => void;
  setAutoMatchProgress: (progress: number) => void;
  setMatchedCount: (count: number) => void;
  setUnconfirmedCount: (count: number) => void;
  reset: () => void;
}

export const useBillMatchingStore = create<BillMatchingState>((set) => ({
  unmatchedBills: [],
  matchedCount: 0,
  unconfirmedCount: 0,
  selectedBill: null,
  candidates: [],
  matchedPairs: [],
  isAutoMatching: false,
  autoMatchProgress: 0,

  setUnmatchedBills: (bills) => set({ unmatchedBills: bills }),
  setSelectedBill: (bill) => set({ selectedBill: bill }),
  setCandidates: (candidates) => set({ candidates }),
  addMatchPair: (pair) =>
    set((state) => ({
      matchedPairs: [...state.matchedPairs, pair],
    })),
  removeMatchPair: (pairId) =>
    set((state) => ({
      matchedPairs: state.matchedPairs.filter((p) => p.id !== pairId),
    })),
  setIsAutoMatching: (isAutoMatching) => set({ isAutoMatching }),
  setAutoMatchProgress: (progress) => set({ autoMatchProgress: progress }),
  setMatchedCount: (count) => set({ matchedCount: count }),
  setUnconfirmedCount: (count) => set({ unconfirmedCount: count }),
  reset: () =>
    set({
      unmatchedBills: [],
      matchedCount: 0,
      unconfirmedCount: 0,
      selectedBill: null,
      candidates: [],
      matchedPairs: [],
      isAutoMatching: false,
      autoMatchProgress: 0,
    }),
}));
