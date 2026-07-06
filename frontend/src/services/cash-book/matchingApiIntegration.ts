const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const matchingAPI = {
  async getUnmatchedBills() {
    const token = localStorage.getItem('auth_token')
    try {
      const res = await fetch(`${API_BASE}/api/cash-book/bills/unmatched`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.ok ? res.json() : []
    } catch {
      return []
    }
  },

  async getMatchingCandidates(billId: string) {
    const token = localStorage.getItem('auth_token')
    try {
      const res = await fetch(`${API_BASE}/api/cash-book/matches/candidates/${billId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.ok ? res.json() : []
    } catch {
      return []
    }
  },

  async matchBillToEntry(billId: string, entryId: string, reason?: string) {
    const token = localStorage.getItem('auth_token')
    try {
      const res = await fetch(`${API_BASE}/api/cash-book/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ billId, entryId, reason }),
      })
      return res.ok ? res.json() : null
    } catch {
      return null
    }
  },

  async undoMatch(matchId: string) {
    const token = localStorage.getItem('auth_token')
    try {
      await fetch(`${API_BASE}/api/cash-book/matches/${matchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {}
  },

  async batchAutoMatch() {
    const token = localStorage.getItem('auth_token')
    try {
      const res = await fetch(`${API_BASE}/api/cash-book/matches/batch-auto`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.ok ? res.json() : []
    } catch {
      return []
    }
  },
}

export const useBillMatchingAPI = () => matchingAPI
