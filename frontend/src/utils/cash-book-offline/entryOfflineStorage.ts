import { CashBookEntry } from '../../stores/cash-book/entryStore'

interface CachedEntry {
  data: CashBookEntry[]
  timestamp: number
  ttl: number
}

interface PendingOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entry: CashBookEntry
  retries: number
  timestamp: number
}

const CACHE_KEY = 'cash-book-entries-cache'
const PENDING_KEY = 'cash-book-pending-ops'
const CACHE_TTL = 60 * 60 * 1000

export const entryOfflineStorage = {
  saveCache(entries: CashBookEntry[]): void {
    const cached: CachedEntry = {
      data: entries,
      timestamp: Date.now(),
      ttl: CACHE_TTL,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
  },

  getCache(): CashBookEntry[] {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return []

    try {
      const parsed: CachedEntry = JSON.parse(cached)
      const age = Date.now() - parsed.timestamp

      if (age > parsed.ttl) {
        localStorage.removeItem(CACHE_KEY)
        return []
      }

      return parsed.data
    } catch {
      return []
    }
  },

  addPendingOp(
    type: 'create' | 'update' | 'delete',
    entry: CashBookEntry
  ): void {
    const pending = this.getPendingOps()
    pending.push({
      id: `op-${Date.now()}`,
      type,
      entry,
      retries: 0,
      timestamp: Date.now(),
    })
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  },

  getPendingOps(): PendingOperation[] {
    const pending = localStorage.getItem(PENDING_KEY)
    if (!pending) return []

    try {
      return JSON.parse(pending)
    } catch {
      return []
    }
  },

  removePendingOp(opId: string): void {
    const pending = this.getPendingOps()
    const updated = pending.filter((op) => op.id !== opId)
    localStorage.setItem(PENDING_KEY, JSON.stringify(updated))
  },

  incrementRetry(opId: string): void {
    const pending = this.getPendingOps()
    const op = pending.find((p) => p.id === opId)
    if (op) {
      op.retries += 1
    }
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  },

  clearAll(): void {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(PENDING_KEY)
  },
}
