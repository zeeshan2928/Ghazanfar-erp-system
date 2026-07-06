import { create } from 'zustand';

export interface BankStatement {
  id: string;
  date: string;
  description: string;
  amount: number;
  referenceNumber: string;
}

export interface BankMatch {
  id: string;
  bankStatementId: string;
  entryId: string;
  matchedAt: string;
  confidence: number;
}

export interface UnmatchedBankEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  referenceNumber: string;
  days: number;
}

interface BankReconciliationState {
  bankStatements: BankStatement[];
  matches: BankMatch[];
  unmatchedEntries: UnmatchedBankEntry[];
  reconciliationRate: number;
  totalStatements: number;
  totalMatched: number;
  isProcessing: boolean;
  error: string | null;

  setBankStatements: (statements: BankStatement[]) => void;
  setMatches: (matches: BankMatch[]) => void;
  setUnmatchedEntries: (entries: UnmatchedBankEntry[]) => void;
  setReconciliationRate: (rate: number) => void;
  setTotalStatements: (count: number) => void;
  setTotalMatched: (count: number) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  addMatch: (match: BankMatch) => void;
  removeMatch: (matchId: string) => void;
  reset: () => void;
}

export const useBankReconciliationStore = create<BankReconciliationState>((set) => ({
  bankStatements: [],
  matches: [],
  unmatchedEntries: [],
  reconciliationRate: 0,
  totalStatements: 0,
  totalMatched: 0,
  isProcessing: false,
  error: null,

  setBankStatements: (statements) => set({ bankStatements: statements }),
  setMatches: (matches) => set({ matches }),
  setUnmatchedEntries: (entries) => set({ unmatchedEntries: entries }),
  setReconciliationRate: (rate) => set({ reconciliationRate: rate }),
  setTotalStatements: (count) => set({ totalStatements: count }),
  setTotalMatched: (count) => set({ totalMatched: count }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setError: (error) => set({ error }),
  addMatch: (match) =>
    set((state) => ({
      matches: [...state.matches, match],
    })),
  removeMatch: (matchId) =>
    set((state) => ({
      matches: state.matches.filter((m) => m.id !== matchId),
    })),
  reset: () =>
    set({
      bankStatements: [],
      matches: [],
      unmatchedEntries: [],
      reconciliationRate: 0,
      totalStatements: 0,
      totalMatched: 0,
      isProcessing: false,
      error: null,
    }),
}));
