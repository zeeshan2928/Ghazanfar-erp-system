import { create } from 'zustand'

export interface CashBookEntry {
  id: string
  date: string
  amount: number
  description: string
  category: 'sales' | 'purchases' | 'expenses' | 'other'
  paymentMethod: 'cash' | 'cheque' | 'transfer' | 'card'
  referenceNumber: string
  linkedBillId?: string
  linkedBillAmount?: number
  status: 'pending' | 'linked' | 'synced'
  createdAt: number
  updatedAt: number
}

interface EntryStore {
  entries: CashBookEntry[]
  selectedEntry: CashBookEntry | null
  isLoading: boolean
  error: string | null
  pendingEntries: CashBookEntry[]

  addEntry: (entry: Omit<CashBookEntry, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void
  selectEntry: (entry: CashBookEntry) => void
  updateEntry: (id: string, updates: Partial<CashBookEntry>) => void
  deleteEntry: (id: string) => void
  linkBill: (entryId: string, billId: string, billAmount: number) => void
  setEntries: (entries: CashBookEntry[]) => void
  addPendingEntry: (entry: CashBookEntry) => void
  removePendingEntry: (id: string) => void
  syncPending: (syncedEntries: CashBookEntry[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useCashBookEntryStore = create<EntryStore>((set) => ({
  entries: [],
  selectedEntry: null,
  isLoading: false,
  error: null,
  pendingEntries: [],

  addEntry: (entry) =>
    set((state) => {
      const newEntry: CashBookEntry = {
        ...entry,
        id: `entry-${Date.now()}`,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      return {
        entries: [...state.entries, newEntry],
        pendingEntries: [...state.pendingEntries, newEntry],
      }
    }),

  selectEntry: (entry) => set({ selectedEntry: entry }),

  updateEntry: (id, updates) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
      ),
    })),

  deleteEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
      pendingEntries: state.pendingEntries.filter((e) => e.id !== id),
    })),

  linkBill: (entryId, billId, billAmount) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              linkedBillId: billId,
              linkedBillAmount: billAmount,
              status: 'linked',
              updatedAt: Date.now(),
            }
          : e
      ),
    })),

  setEntries: (entries) => set({ entries }),

  addPendingEntry: (entry) =>
    set((state) => ({
      pendingEntries: [...state.pendingEntries, entry],
    })),

  removePendingEntry: (id) =>
    set((state) => ({
      pendingEntries: state.pendingEntries.filter((e) => e.id !== id),
    })),

  syncPending: (syncedEntries) =>
    set((state) => {
      const syncedIds = new Set(syncedEntries.map((e) => e.id))
      return {
        entries: state.entries.map((e) =>
          syncedIds.has(e.id) ? { ...e, status: 'synced' } : e
        ),
        pendingEntries: state.pendingEntries.filter(
          (e) => !syncedIds.has(e.id)
        ),
      }
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))
