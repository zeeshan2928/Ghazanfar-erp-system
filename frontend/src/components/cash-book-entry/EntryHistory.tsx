import React, { useState, useEffect } from 'react'
import { useCashBookEntryStore } from '../../stores/cash-book/entryStore'
import { useCashBookEntryAPI } from '../../services/cash-book/entryApiIntegration'

export const EntryHistory: React.FC = () => {
  const store = useCashBookEntryStore()
  const api = useCashBookEntryAPI()
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')

  useEffect(() => {
    const loadEntries = async () => {
      store.setLoading(true)
      try {
        const entries = await api.getEntries()
        store.setEntries(entries)
      } finally {
        store.setLoading(false)
      }
    }

    loadEntries()
  }, [])

  const filtered = store.entries
    .filter((e) => !filterCategory || e.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return b.createdAt - a.createdAt
      }
      return b.amount - a.amount
    })

  return (
    <div className="entry-history">
      <h3 className="entry-history__title">Entry History</h3>

      <div className="entry-history__filters">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="entry-history__filter"
        >
          <option value="">All Categories</option>
          <option value="sales">Sales</option>
          <option value="purchases">Purchases</option>
          <option value="expenses">Expenses</option>
          <option value="other">Other</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
          className="entry-history__filter"
        >
          <option value="date">Sort by Date</option>
          <option value="amount">Sort by Amount</option>
        </select>
      </div>

      <div className="entry-history__list">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className={`entry-history__item entry-history__item--${entry.status}`}
          >
            <div className="entry-history__header">
              <span className="entry-history__date">
                {new Date(entry.date).toLocaleDateString()}
              </span>
              <span
                className={`entry-history__category entry-history__category--${entry.category}`}
              >
                {entry.category}
              </span>
              <span className="entry-history__status">{entry.status}</span>
            </div>

            <div className="entry-history__amount">
              PKR {entry.amount.toLocaleString('en-PK')}
            </div>

            <div className="entry-history__description">{entry.description}</div>

            {entry.linkedBillId && (
              <div className="entry-history__linked">
                ✓ Linked to Bill {entry.linkedBillId}
              </div>
            )}
          </div>
        ))}
      </div>

      {store.isLoading && <div className="entry-history__loading">Loading...</div>}
    </div>
  )
}
