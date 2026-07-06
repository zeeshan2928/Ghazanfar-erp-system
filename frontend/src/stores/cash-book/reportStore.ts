import { create } from 'zustand'

export interface CashBookKPIs {
  totalEntries: number
  matchedCount: number
  unmatchedCount: number
  reconciliationPercentage: number
  totalAmount: number
  discrepancyAmount: number
  oldestUnmatchedDays: number
  avgMatchTime: number
}

interface ReportStore {
  kpis: CashBookKPIs | null
  cashFlow: any[]
  discrepancies: any[]
  dateRange: { from: string; to: string }
  selectedCategory: string | null
  isLoading: boolean

  setKPIs: (kpis: CashBookKPIs) => void
  setCashFlow: (flow: any[]) => void
  setDiscrepancies: (disc: any[]) => void
  setDateRange: (from: string, to: string) => void
  setCategory: (cat: string | null) => void
  setLoading: (loading: boolean) => void
}

const today = new Date().toISOString().split('T')[0]
const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0]

export const useCashBookReportsStore = create<ReportStore>((set) => ({
  kpis: null,
  cashFlow: [],
  discrepancies: [],
  dateRange: { from: lastMonth, to: today },
  selectedCategory: null,
  isLoading: false,

  setKPIs: (kpis) => set({ kpis }),
  setCashFlow: (cashFlow) => set({ cashFlow }),
  setDiscrepancies: (discrepancies) => set({ discrepancies }),
  setDateRange: (from, to) => set({ dateRange: { from, to } }),
  setCategory: (selectedCategory) => set({ selectedCategory }),
  setLoading: (isLoading) => set({ isLoading }),
}))
