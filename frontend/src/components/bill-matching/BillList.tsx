import React, { useState, useMemo } from 'react';
import { Bill } from '../../stores/cash-book/matchingStore';
import './matching.css';

interface BillListProps {
  bills: Bill[];
  onSelectBill: (billId: string) => void;
  selectedBillId?: string;
  isLoading?: boolean;
}

type SortField = 'date' | 'amount' | 'billNumber';
type SortOrder = 'asc' | 'desc';

const BillList: React.FC<BillListProps> = ({ bills, onSelectBill, selectedBillId, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const filteredAndSorted = useMemo(() => {
    let filtered = bills.filter((bill) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        bill.billNumber.toLowerCase().includes(searchLower) ||
        bill.supplier.toLowerCase().includes(searchLower) ||
        bill.reference?.toLowerCase().includes(searchLower)
      );
    });

    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'date':
          compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          compareValue = a.amount - b.amount;
          break;
        case 'billNumber':
          compareValue = a.billNumber.localeCompare(b.billNumber);
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [bills, searchTerm, sortField, sortOrder]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'matching__status-badge--pending';
      case 'partial':
        return 'matching__status-badge--partial';
      case 'unmatched':
        return 'matching__status-badge--unmatched';
      default:
        return '';
    }
  };

  return (
    <div className="matching__bill-list">
      {/* Search & Sort Controls */}
      <div className="matching__controls">
        <div className="matching__search-box">
          <input
            type="text"
            className="matching__search-input"
            placeholder="Search by bill #, supplier, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="matching__sort-controls">
          <button
            className={`matching__sort-btn ${sortField === 'date' ? 'matching__sort-btn--active' : ''}`}
            onClick={() => handleSortChange('date')}
            disabled={isLoading}
          >
            Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`matching__sort-btn ${sortField === 'amount' ? 'matching__sort-btn--active' : ''}`}
            onClick={() => handleSortChange('amount')}
            disabled={isLoading}
          >
            Amount {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`matching__sort-btn ${sortField === 'billNumber' ? 'matching__sort-btn--active' : ''}`}
            onClick={() => handleSortChange('billNumber')}
            disabled={isLoading}
          >
            Bill # {sortField === 'billNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Bills List */}
      {filteredAndSorted.length === 0 ? (
        <div className="matching__empty">
          <p>{searchTerm ? 'No bills match your search' : 'No unmatched bills'}</p>
        </div>
      ) : (
        <div className="matching__bills-container">
          <div className="matching__bills-header">
            <div className="matching__bills-col matching__bills-col--bill">Bill #</div>
            <div className="matching__bills-col matching__bills-col--supplier">Supplier</div>
            <div className="matching__bills-col matching__bills-col--date">Date</div>
            <div className="matching__bills-col matching__bills-col--amount">Amount</div>
            <div className="matching__bills-col matching__bills-col--status">Status</div>
          </div>

          {filteredAndSorted.map((bill) => (
            <div
              key={bill.id}
              className={`matching__bill-row ${selectedBillId === bill.id ? 'matching__bill-row--selected' : ''}`}
              onClick={() => onSelectBill(bill.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectBill(bill.id);
                }
              }}
            >
              <div className="matching__bills-col matching__bills-col--bill">
                <span className="matching__bill-number">{bill.billNumber}</span>
                {bill.reference && <span className="matching__bill-ref">({bill.reference})</span>}
              </div>
              <div className="matching__bills-col matching__bills-col--supplier">{bill.supplier}</div>
              <div className="matching__bills-col matching__bills-col--date">{formatDate(bill.date)}</div>
              <div className="matching__bills-col matching__bills-col--amount">
                <span className="matching__amount">{formatCurrency(bill.amount)}</span>
              </div>
              <div className="matching__bills-col matching__bills-col--status">
                <span className={`matching__status-badge ${getStatusBadgeClass(bill.status)}`}>
                  {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Result Count */}
      <div className="matching__result-count">
        Showing {filteredAndSorted.length} of {bills.length} bills
      </div>
    </div>
  );
};

export default BillList;
