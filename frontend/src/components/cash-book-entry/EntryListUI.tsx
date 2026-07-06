import React, { useState, useEffect } from 'react';
import { CashBookEntry, useCashBookEntryStore } from '../../stores/cash-book/entryStore';
import { useCashBookEntryAPI } from '../../services/cash-book/entryApiIntegration';
import { EntryForm } from './EntryForm';
import './entry-list.css';

type FilterStatus = 'all' | 'pending' | 'linked' | 'synced';

interface EntryFilters {
  status: FilterStatus;
  category: string;
  dateFrom: string;
  dateTo: string;
}

export function EntryListUI(): JSX.Element {
  const store = useCashBookEntryStore();
  const api = useCashBookEntryAPI();
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashBookEntry | null>(null);
  const [filters, setFilters] = useState<EntryFilters>({
    status: 'all',
    category: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    const loadEntries = async () => {
      setIsLoading(true);
      const entries = await api.getEntries();
      store.setEntries(entries);
      setIsLoading(false);
    };

    loadEntries();
  }, []);

  const filteredEntries = store.entries.filter((entry) => {
    if (filters.status !== 'all' && entry.status !== filters.status) return false;
    if (filters.category && entry.category !== filters.category) return false;
    if (filters.dateFrom && new Date(entry.date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(entry.date) > new Date(filters.dateTo)) return false;
    return true;
  });

  const handleEdit = (entry: CashBookEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      store.deleteEntry(entryId);
    }
  };

  const handleSuccess = (entry: CashBookEntry) => {
    if (editingEntry) {
      store.updateEntry(editingEntry.id, entry);
      setEditingEntry(null);
    } else {
      store.addEntry(entry);
    }
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className="entry-list">
        <div className="entry-list__header">
          <h2 className="entry-list__title">
            {editingEntry ? 'Edit Entry' : 'New Entry'}
          </h2>
          <button
            className="entry-list__close-btn"
            onClick={() => {
              setShowForm(false);
              setEditingEntry(null);
            }}
          >
            ✕
          </button>
        </div>
        <EntryForm
          initialEntry={editingEntry}
          onSuccess={handleSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingEntry(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="entry-list">
      {/* Header */}
      <div className="entry-list__header">
        <h2 className="entry-list__title">Cash Book Entries</h2>
        <button
          className="entry-list__btn entry-list__btn--primary"
          onClick={() => setShowForm(true)}
          disabled={isLoading}
        >
          ➕ New Entry
        </button>
      </div>

      {/* Offline Banner */}
      {!api.isOnline && (
        <div className="entry-list__banner entry-list__banner--offline">
          📱 Offline mode - {store.pendingEntries.length} entries pending sync
        </div>
      )}

      {/* Filters */}
      <div className="entry-list__filters">
        <div className="entry-list__filter-group">
          <label className="entry-list__filter-label">Status</label>
          <select
            className="entry-list__filter-select"
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value as FilterStatus })
            }
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="linked">Linked</option>
            <option value="synced">Synced</option>
          </select>
        </div>

        <div className="entry-list__filter-group">
          <label className="entry-list__filter-label">Category</label>
          <select
            className="entry-list__filter-select"
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value })
            }
          >
            <option value="">All Categories</option>
            <option value="SALES_RECEIPT">Sales Receipt</option>
            <option value="PURCHASE_PAYMENT">Purchase Payment</option>
            <option value="OPERATING_EXPENSE">Operating Expense</option>
            <option value="LOAN_PAYMENT">Loan Payment</option>
            <option value="LOAN_RECEIVED">Loan Received</option>
            <option value="EQUIPMENT">Equipment</option>
          </select>
        </div>

        <div className="entry-list__filter-group">
          <label className="entry-list__filter-label">From Date</label>
          <input
            type="date"
            className="entry-list__filter-input"
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters({ ...filters, dateFrom: e.target.value })
            }
          />
        </div>

        <div className="entry-list__filter-group">
          <label className="entry-list__filter-label">To Date</label>
          <input
            type="date"
            className="entry-list__filter-input"
            value={filters.dateTo}
            onChange={(e) =>
              setFilters({ ...filters, dateTo: e.target.value })
            }
          />
        </div>

        <button
          className="entry-list__btn entry-list__btn--secondary"
          onClick={() =>
            setFilters({
              status: 'all',
              category: '',
              dateFrom: '',
              dateTo: '',
            })
          }
        >
          Reset
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="entry-list__loading">
          <div className="entry-list__spinner" />
          <p>Loading entries...</p>
        </div>
      )}

      {/* Entry Table */}
      {!isLoading && (
        <>
          <div className="entry-list__count">
            {filteredEntries.length} entries
          </div>

          {filteredEntries.length === 0 ? (
            <div className="entry-list__empty">
              <p>No entries found</p>
              <button
                className="entry-list__btn entry-list__btn--primary"
                onClick={() => setShowForm(true)}
              >
                Create First Entry
              </button>
            </div>
          ) : (
            <div className="entry-list__table-wrapper">
              <table className="entry-list__table">
                <thead className="entry-list__thead">
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="entry-list__tbody">
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="entry-list__row"
                      onClick={() => store.selectEntry(entry)}
                    >
                      <td className="entry-list__cell">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="entry-list__cell entry-list__cell--mono">
                        {entry.referenceNumber}
                      </td>
                      <td className="entry-list__cell entry-list__cell--description">
                        {entry.description}
                      </td>
                      <td className="entry-list__cell entry-list__cell--amount">
                        Rs. {(entry.amount / 100).toLocaleString('en-PK', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="entry-list__cell">
                        <span className="entry-list__badge">
                          {entry.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="entry-list__cell">
                        <span
                          className={`entry-list__status entry-list__status--${entry.status}`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="entry-list__cell entry-list__cell--actions">
                        <button
                          className="entry-list__action-btn entry-list__action-btn--edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(entry);
                          }}
                          title="Edit entry"
                        >
                          ✎
                        </button>
                        <button
                          className="entry-list__action-btn entry-list__action-btn--delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry.id);
                          }}
                          title="Delete entry"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EntryListUI;
