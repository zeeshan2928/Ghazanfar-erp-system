import React, { useState } from 'react';
import { CashBookEntry, useCashBookEntryStore } from '../../stores/cash-book/entryStore';
import './audit-trail.css';

interface Comment {
  id: string;
  entryId: string;
  author: string;
  content: string;
  timestamp: string;
  type: 'comment' | 'action';
}

interface AuditLog {
  id: string;
  entryId: string;
  action: string;
  by: string;
  timestamp: string;
  details?: Record<string, any>;
}

export function AuditTrail(): JSX.Element {
  const store = useCashBookEntryStore();
  const [selectedEntry, setSelectedEntry] = useState<CashBookEntry | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Map<string, Comment[]>>(new Map());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filterAction, setFilterAction] = useState('all');

  const handleAddComment = (entryId: string) => {
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      entryId,
      author: 'Current User',
      content: commentText,
      timestamp: new Date().toISOString(),
      type: 'comment',
    };

    const entryComments = comments.get(entryId) || [];
    setComments((prev) =>
      new Map(prev).set(entryId, [...entryComments, newComment])
    );

    // Log the action
    const log: AuditLog = {
      id: `log-${Date.now()}`,
      entryId,
      action: 'COMMENT_ADDED',
      by: 'Current User',
      timestamp: new Date().toISOString(),
      details: { comment: commentText },
    };
    setAuditLogs((prev) => [log, ...prev]);

    setCommentText('');
  };

  const entryComments = selectedEntry ? comments.get(selectedEntry.id) || [] : [];

  const filteredLogs =
    filterAction === 'all'
      ? auditLogs
      : auditLogs.filter((log) => log.action.includes(filterAction.toUpperCase()));

  return (
    <div className="audit">
      {/* Header */}
      <div className="audit__header">
        <h2 className="audit__title">Audit Trail & Comments</h2>
        <div className="audit__stats">
          <span className="audit__stat">
            <span className="audit__stat-label">Total Comments</span>
            <span className="audit__stat-value">
              {Array.from(comments.values()).reduce((sum, arr) => sum + arr.length, 0)}
            </span>
          </span>
          <span className="audit__stat">
            <span className="audit__stat-label">Audit Events</span>
            <span className="audit__stat-value">{auditLogs.length}</span>
          </span>
        </div>
      </div>

      <div className="audit__container">
        {/* Entries List */}
        <div className="audit__panel audit__panel--entries">
          <h3 className="audit__panel-title">Entries</h3>

          {store.entries.length === 0 ? (
            <div className="audit__empty">
              <p>No entries</p>
            </div>
          ) : (
            <div className="audit__entries-list">
              {store.entries.map((entry) => {
                const entryCommentCount = (comments.get(entry.id) || []).length;
                return (
                  <div
                    key={entry.id}
                    className={`audit__entry-item ${
                      selectedEntry?.id === entry.id
                        ? 'audit__entry-item--selected'
                        : ''
                    }`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="audit__entry-header">
                      <span className="audit__entry-ref">{entry.referenceNumber}</span>
                      {entryCommentCount > 0 && (
                        <span className="audit__comment-badge">
                          💬 {entryCommentCount}
                        </span>
                      )}
                    </div>
                    <div className="audit__entry-date">
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                    <div className="audit__entry-amount">
                      Rs. {(entry.amount / 100).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Comments & Activity */}
        <div className="audit__panel audit__panel--activity">
          {!selectedEntry ? (
            <div className="audit__empty">
              <p>Select an entry to view comments and audit trail</p>
            </div>
          ) : (
            <>
              <div className="audit__entry-details">
                <h3 className="audit__entry-details-title">
                  {selectedEntry.referenceNumber}
                </h3>
                <p className="audit__entry-details-info">
                  {selectedEntry.description}
                </p>
              </div>

              {/* Comments Section */}
              <div className="audit__section">
                <h4 className="audit__section-title">Comments</h4>

                <div className="audit__comments">
                  {entryComments.length === 0 ? (
                    <div className="audit__section-empty">
                      <p>No comments yet</p>
                    </div>
                  ) : (
                    entryComments.map((comment) => (
                      <div key={comment.id} className="audit__comment">
                        <div className="audit__comment-header">
                          <span className="audit__comment-author">
                            {comment.author}
                          </span>
                          <span className="audit__comment-time">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="audit__comment-content">
                          {comment.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Form */}
                <div className="audit__comment-form">
                  <textarea
                    className="audit__comment-input"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                  />
                  <button
                    className="audit__btn audit__btn--primary"
                    onClick={() =>
                      handleAddComment(selectedEntry.id)
                    }
                    disabled={!commentText.trim()}
                  >
                    💬 Add Comment
                  </button>
                </div>
              </div>

              {/* Audit Log */}
              <div className="audit__section">
                <div className="audit__section-header">
                  <h4 className="audit__section-title">Audit Log</h4>
                  <select
                    className="audit__filter-select"
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                  >
                    <option value="all">All Actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="comment">Comment</option>
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                  </select>
                </div>

                <div className="audit__log-entries">
                  {filteredLogs.length === 0 ? (
                    <div className="audit__section-empty">
                      <p>No audit events</p>
                    </div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div key={log.id} className="audit__log-entry">
                        <div className="audit__log-time">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                        <div className="audit__log-action">
                          <span className="audit__log-icon">
                            {log.action.includes('COMMENT') && '💬'}
                            {log.action.includes('CREATE') && '➕'}
                            {log.action.includes('UPDATE') && '✏️'}
                            {log.action.includes('APPROVE') && '✓'}
                            {log.action.includes('REJECT') && '✕'}
                          </span>
                          <span className="audit__log-text">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="audit__log-by">{log.by}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditTrail;
