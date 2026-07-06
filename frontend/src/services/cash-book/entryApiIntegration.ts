import { CashBookEntry } from '../../stores/cash-book/entryStore'
import { entryOfflineStorage } from '../../utils/cash-book-offline/entryOfflineStorage'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const cashBookEntryAPI = {
  async createEntry(entry: Omit<CashBookEntry, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<CashBookEntry> {
    const token = localStorage.getItem('auth_token')

    if (!navigator.onLine) {
      const newEntry: CashBookEntry = {
        ...entry,
        id: `entry-${Date.now()}`,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      entryOfflineStorage.addPendingOp('create', newEntry)
      return newEntry
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/cash-book/entries`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(entry),
        }
      )

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      entryOfflineStorage.saveCache([data])
      return data
    } catch (error) {
      throw error
    }
  },

  async getEntries(): Promise<CashBookEntry[]> {
    const token = localStorage.getItem('auth_token')
    const cached = entryOfflineStorage.getCache()
    if (cached.length > 0) return cached

    if (!navigator.onLine) {
      return cached
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/cash-book/entries`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      entryOfflineStorage.saveCache(data)
      return data
    } catch (error) {
      return cached
    }
  },

  async linkBill(entryId: string, billId: string): Promise<void> {
    const token = localStorage.getItem('auth_token')

    if (!navigator.onLine) {
      entryOfflineStorage.addPendingOp('update', {
        id: entryId,
        linkedBillId: billId,
      } as CashBookEntry)
      return
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/cash-book/entries/${entryId}/link-bill`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ billId }),
        }
      )

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      throw error
    }
  },
}

export const useCashBookEntryAPI = () => cashBookEntryAPI
