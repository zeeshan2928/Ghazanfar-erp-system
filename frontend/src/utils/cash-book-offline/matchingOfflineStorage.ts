const UNMATCHED_KEY = 'cash-book-unmatched-bills'
const PENDING_MATCHES_KEY = 'cash-book-pending-matches'

export const matchingOfflineStorage = {
  saveUnmatchedBills(bills: any[]): void {
    localStorage.setItem(UNMATCHED_KEY, JSON.stringify({
      data: bills,
      timestamp: Date.now(),
    }))
  },

  getUnmatchedBills(): any[] {
    const data = localStorage.getItem(UNMATCHED_KEY)
    if (!data) return []

    try {
      const parsed = JSON.parse(data)
      return parsed.data || []
    } catch {
      return []
    }
  },

  addPendingMatch(billId: string, entryId: string): void {
    const pending = this.getPendingMatches()
    pending.push({
      id: `pm-${Date.now()}`,
      billId,
      entryId,
      timestamp: Date.now(),
    })
    localStorage.setItem(PENDING_MATCHES_KEY, JSON.stringify(pending))
  },

  getPendingMatches(): any[] {
    const data = localStorage.getItem(PENDING_MATCHES_KEY)
    if (!data) return []

    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  },

  removePendingMatch(id: string): void {
    const pending = this.getPendingMatches()
    const updated = pending.filter((m) => m.id !== id)
    localStorage.setItem(PENDING_MATCHES_KEY, JSON.stringify(updated))
  },

  clearAll(): void {
    localStorage.removeItem(UNMATCHED_KEY)
    localStorage.removeItem(PENDING_MATCHES_KEY)
  },
}
