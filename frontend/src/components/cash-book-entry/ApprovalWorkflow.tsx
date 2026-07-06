import React, { useState } from 'react';
import { useCashBookEntryStore, CashBookEntry } from '../../stores/cash-book/entryStore';
import './approval-workflow.css';

interface ApprovalState {
  entryId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: string;
  comments?: string;
}

export function ApprovalWorkflow(): JSX.Element {
  const store = useCashBookEntryStore();
  const [approvals, setApprovals] = useState<Map<string, ApprovalState>>(new Map());
  const [selectedEntry, setSelectedEntry] = useState<CashBookEntry | null>(null);
  const [comment, setComment] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const pendingEntries = store.entries.filter((e) => e.status !== 'synced');

  const filteredEntries = pendingEntries.filter((entry) => {
    const approval = approvals.get(entry.id);
    if (filterStatus === 'all') return true;
    return approval?.status === filterStatus;
  });

  const handleApprove = (entry: CashBookEntry) => {
    const approval: ApprovalState = {
      entryId: entry.id,
      status: 'approved',
      approvedBy: 'Current User',
      approvalDate: new Date().toISOString(),
      comments: comment,
    };

    setApprovals((prev) => new Map(prev).set(entry.id, approval));
    store.updateEntry(entry.id, { status: 'synced' });
    setSelectedEntry(null);
    setComment('');
  };

  const handleReject = (entry: CashBookEntry) => {
    const approval: ApprovalState = {
      entryId: entry.id,
      status: 'rejected',
      approvedBy: 'Current User',
      approvalDate: new Date().toISOString(),
      comments: comment,
    };

    setApprovals((prev) => new Map(prev).set(entry.id, approval));
    setSelectedEntry(null);
    setComment('');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'approval__status--approved';
      case 'rejected':
        return 'approval__status--rejected';
      default:
        return 'approval__status--pending';
    }
  };

  return (
    <div className="approval">
      {/* Header */}
      <div className="approval__header">
        <h2 className="approval__title">Approval Workflow</h2>
        <div className="approval__summary">
          <span className="approval__summary-item">
            <span className="approval__summary-label">Pending</span>
            <span className="approval__summary-value">
              {pendingEntries.filter((e) => !approvals.has(e.id)).length}
            </span>
          </span>
          <span className="approval__summary-item">
            <span className="approval__summary-label">Approved</span>
            <span className="approval__summary-value approval__summary-value--success">
              {Array.from(approvals.values()).filter((a) => a.status === 'approved')
                .length}
            </span>
          </span>
          <span className="approval__summary-item">
            <span className="approval__summary-label">Rejected</span>
            <span className="approval__summary-value approval__summary-value--danger">
              {Array.from(approvals.values()).filter((a) => a.status === 'rejected')
                .length}
            </span>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="approval__filters">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            className={`approval__filter-btn ${
              filterStatus === status ? 'approval__filter-btn--active' : ''
            }`}
            onClick={() => setFilterStatus(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="approval__container">
        {/* Entries List */}
        <div className="approval__panel approval__panel--list">
          <h3 className="approval__panel-title">Entries for Review</h3>

          {filteredEntries.length === 0 ? (
            <div className="approval__empty">
              <p>No entries to review</p>
            </div>
          ) : (
            <div className="approval__list">
              {filteredEntries.map((entry) => {
                const approval = approvals.get(entry.id);
                return (
                  <div
                    key={entry.id}
                    className={`approval__item ${
                      selectedEntry?.id === entry.id ? 'approval__item--selected' : ''
                    }`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="approval__item-header">
                      <span className="approval__item-ref">{entry.referenceNumber}</span>
                      <span
                        className={`approval__status ${getStatusColor(approval?.status)}`}
                      >
                        {approval?.status || 'pending'}
                      </span>
                    </div>
                    <div className="approval__item-date">
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                    <div className="approval__item-amount">
                      Rs. {(entry.amount / 100).toLocaleString()}
                    </div>
                    <div className="approval__item-desc">{entry.description}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className="approval__panel approval__panel--details">
          {!selectedEntry ? (
            <div className="approval__empty">
              <p>Select an entry to review</p>
            </div>
          ) : (
            <>
              <div className="approval__detail-header">
                <h3 className="approval__detail-title">Entry Details</h3>
                <span className={`approval__status ${getStatusColor(approvals.get(selectedEntry.id)?.status)}`}>
                  {approvals.get(selectedEntry.id)?.status || 'pending'}
                </span>
              </div>

              <div className="approval__detail-group">
                <label className="approval__detail-label">Reference Number</label>
                <div className="approval__detail-value">{selectedEntry.referenceNumber}</div>
              </div>

              <div className="approval__detail-group">
                <label className="approval__detail-label">Date</label>
                <div className="approval__detail-value">
                  {new Date(selectedEntry.date).toLocaleDateString()}
                </div>
              </div>

              <div className="approval__detail-group">
                <label className="approval__detail-label">Amount</label>
                <div className="approval__detail-value">
                  Rs. {(selectedEntry.amount / 100).toLocaleString('en-PK', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="approval__detail-group">
                <label className="approval__detail-label">Category</label>
                <div className="approval__detail-value">
                  {selectedEntry.category.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="approval__detail-group">
                <label className="approval__detail-label">Description</label>
                <div className="approval__detail-value approval__detail-value--multiline">
                  {selectedEntry.description}
                </div>
              </div>

              <div className="approval__detail-group">
                <label className="approval__detail-label">
                  Approval Comments
                </label>
                <textarea
                  className="approval__textarea"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add comments about this entry..."
                  disabled={!!approvals.get(selectedEntry.id)}
                  rows={3}
                />
              </div>

              {/* Approval Info */}
              {approvals.get(selectedEntry.id) && (
                <div className="approval__info">
                  <div className="approval__info-item">
                    <span className="approval__info-label">Approved by</span>
                    <span className="approval__info-value">
                      {approvals.get(selectedEntry.id)?.approvedBy}
                    </span>
                  </div>
                  <div className="approval__info-item">
                    <span className="approval__info-label">Date</span>
                    <span className="approval__info-value">
                      {approvals.get(selectedEntry.id)?.approvalDate
                        ? new Date(approvals.get(selectedEntry.id)?.approvalDate!).toLocaleString()
                        : '-'}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!approvals.get(selectedEntry.id) && (
                <div className="approval__actions">
                  <button
                    className="approval__btn approval__btn--approve"
                    onClick={() => handleApprove(selectedEntry)}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="approval__btn approval__btn--reject"
                    onClick={() => handleReject(selectedEntry)}
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApprovalWorkflow;
