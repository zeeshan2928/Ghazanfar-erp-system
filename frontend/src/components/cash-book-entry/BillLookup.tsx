import React, { useState, useEffect } from 'react'
import { useCashBookEntryStore } from '../../stores/cash-book/entryStore'
import './entry-form.css'

interface Bill {
  id: string
  billNumber: string
  amount: number
  date: string
  supplier: string
}

interface BillLookupProps {
  entryId: string
  entryAmount: number
  onLink: (billId: string, billAmount: number) => void
}

export const BillLookup: React.FC<BillLookupProps> = ({
  entryId,
  entryAmount,
  onLink,
}) => {
  const store = useCashBookEntryStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [bills, setBills] = useState<Bill[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setBills([])
      return
    }

    const searchBills = async () => {
      setIsSearching(true)
      try {
        const token = localStorage.getItem('auth_token')
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/bills/search?q=${encodeURIComponent(
            searchQuery
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setBills(data)
        }
      } catch (error) {}
      finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(searchBills, 500)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const handleLinkBill = async (bill: Bill) => {
    try {
      await onLink(bill.id, bill.amount)
      setSearchQuery('')
      setBills([])
    } catch (error) {
      store.setError('Failed to link bill')
    }
  }

  return (
    <div className="bill-lookup">
      <h4 className="bill-lookup__title">Link to Bill</h4>

      <div className="bill-lookup__search">
        <input
          type="text"
          placeholder="Search bill by number, supplier, date..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bill-lookup__input"
        />
      </div>

      {isSearching && <div className="bill-lookup__loading">Searching...</div>}

      <div className="bill-lookup__results">
        {bills.map((bill) => (
          <div key={bill.id} className="bill-lookup__item">
            <div className="bill-lookup__info">
              <div className="bill-lookup__number">Bill #{bill.billNumber}</div>
              <div className="bill-lookup__supplier">{bill.supplier}</div>
              <div className="bill-lookup__date">
                {new Date(bill.date).toLocaleDateString()}
              </div>
            </div>

            <div className="bill-lookup__amount">
              PKR {bill.amount.toLocaleString('en-PK')}
            </div>

            <button
              className={`bill-lookup__link-btn ${
                Math.abs(bill.amount - entryAmount) < 1
                  ? 'bill-lookup__link-btn--match'
                  : ''
              }`}
              onClick={() => handleLinkBill(bill)}
              title={
                Math.abs(bill.amount - entryAmount) < 1
                  ? 'Exact match!'
                  : `Amount differs by PKR ${Math.abs(
                      bill.amount - entryAmount
                    )}`
              }
            >
              Link
            </button>
          </div>
        ))}
      </div>

      {searchQuery && bills.length === 0 && !isSearching && (
        <div className="bill-lookup__empty">No bills found</div>
      )}
    </div>
  )
}
