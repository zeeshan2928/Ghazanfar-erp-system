const KPIS_KEY = 'cash-book-kpis-cache'
const CASHFLOW_KEY = 'cash-book-cashflow-cache'
const DISC_KEY = 'cash-book-discrepancies-cache'

export const reportOfflineStorage = {
  saveKPIs(kpis: any): void {
    localStorage.setItem(
      KPIS_KEY,
      JSON.stringify({ data: kpis, timestamp: Date.now() })
    )
  },

  getKPIs(): any {
    const data = localStorage.getItem(KPIS_KEY)
    if (!data) return null

    try {
      const parsed = JSON.parse(data)
      const age = Date.now() - parsed.timestamp
      if (age > 30 * 60 * 1000) return null
      return parsed.data
    } catch {
      return null
    }
  },

  saveCashFlow(flow: any[]): void {
    localStorage.setItem(
      CASHFLOW_KEY,
      JSON.stringify({ data: flow, timestamp: Date.now() })
    )
  },

  getCashFlow(): any[] {
    const data = localStorage.getItem(CASHFLOW_KEY)
    if (!data) return []

    try {
      const parsed = JSON.parse(data)
      const age = Date.now() - parsed.timestamp
      if (age > 60 * 60 * 1000) return []
      return parsed.data
    } catch {
      return []
    }
  },

  saveDiscrepancies(disc: any[]): void {
    localStorage.setItem(
      DISC_KEY,
      JSON.stringify({ data: disc, timestamp: Date.now() })
    )
  },

  getDiscrepancies(): any[] {
    const data = localStorage.getItem(DISC_KEY)
    if (!data) return []

    try {
      return JSON.parse(data).data || []
    } catch {
      return []
    }
  },

  clearAll(): void {
    localStorage.removeItem(KPIS_KEY)
    localStorage.removeItem(CASHFLOW_KEY)
    localStorage.removeItem(DISC_KEY)
  },
}
