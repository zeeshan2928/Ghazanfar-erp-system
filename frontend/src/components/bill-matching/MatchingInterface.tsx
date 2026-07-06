import React, { useState, useEffect } from 'react';
import { Bill, MatchPair } from '../../stores/cash-book/matchingStore';
import { MatchingCandidate } from '../../utils/matchingAlgorithm';
import './matching.css';

interface MatchingInterfaceProps {
  selectedBill: Bill | undefined;
  candidates: MatchingCandidate[];
  isLoading: boolean;
  onMatch: (entryId: number, amount: number, reason: string, confidence: number) => void;
  onUndo?: (matchId: number) => void;
  recentMatches?: MatchPair[];
}

const MatchingInterface: React.FC<MatchingInterfaceProps> = ({
  selectedBill,
  candidates,
  isLoading,
  onMatch,
  onUndo,
  recentMatches = [],
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<MatchingCandidate | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [matchingReason, setMatchingReason] = useState('');

  useEffect(() => {
    setSelectedCandidate(null);
    setCustomAmount('');
    setMatchingReason('');
  }, [selectedBill]);

  if (!selectedBill) {
    return (
      <div className="matching__interface matching__interface--empty">
        <div className="matching__empty-state">
          <p>Select a bill from the list to view matching candidates</p>
        </div>
      </div>
    );
  }

  const handleMatch = () => {
    if (!selectedCandidate) return;

    const amount = customAmount ? parseFloat(customAmount) : selectedCandidate.amount;
    const reason = matchingReason || selectedCandidate.reason;

    onMatch(selectedCandidate.entryId, amount, reason, selectedCandidate.confidence);

    setSelectedCandidate(null);
    setCustomAmount('');
    setMatchingReason('');
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'matching__confidence--high';
    if (confidence >= 70) return 'matching__confidence--medium';
    return 'matching__confidence--low';
  };

  const amountDifference = selectedCandidate ? Math.abs(selectedBill.amount - selectedCandidate.amount) : 0;
  const percentDifference = selectedCandidate ? (amountDifference / selectedBill.amount) * 100 : 0;

  return (
    <div className="matching__interface">
      {/* Left Side: Selected Bill */}
      <div className="matching__panel matching__panel--bill">
        <h3 className="matching__panel-title">Selected Bill</h3>

        <div className="matching__bill-details">
          <div className="matching__detail-row">
            <label className="matching__detail-label">Bill Number:</label>
            <span className="matching__detail-value">{selectedBill.billNumber}</span>
          </div>

          <div className="matching__detail-row">
            <label className="matching__detail-label">Supplier:</label>
            <span className="matching__detail-value">{selectedBill.supplier}</span>
          </div>

          <div className="matching__detail-row">
            <label className="matching__detail-label">Date:</label>
            <span className="matching__detail-value">{formatDate(selectedBill.date)}</span>
          </div>

          <div className="matching__detail-row">
            <label className="matching__detail-label">Amount:</label>
            <span className="matching__detail-value matching__amount">{formatCurrency(selectedBill.amount)}</span>
          </div>

          {selectedBill.reference && (
            <div className="matching__detail-row">
              <label className="matching__detail-label">Reference:</label>
              <span className="matching__detail-value">{selectedBill.reference}</span>
            </div>
          )}

          <div className="matching__detail-row">
            <label className="matching__detail-label">Status:</label>
            <span className={`matching__status-badge matching__status-badge--${selectedBill.status}`}>
              {selectedBill.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Right Side: Candidates */}
      <div className="matching__panel matching__panel--candidates">
        <h3 className="matching__panel-title">Matching Candidates</h3>

        {candidates.length === 0 ? (
          <div className="matching__empty-state">
            <p>No matching candidates found</p>
          </div>
        ) : (
          <div className="matching__candidates-list">
            {candidates.map((candidate) => (
              <div
                key={candidate.entryId}
                className={`matching__candidate-item ${selectedCandidate?.entryId === candidate.entryId ? 'matching__candidate-item--selected' : ''}`}
                onClick={() => setSelectedCandidate(candidate)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedCandidate(candidate);
                  }
                }}
              >
                <div className="matching__candidate-header">
                  <div className="matching__candidate-info">
                    <span className="matching__entry-id">Entry #{candidate.entryId}</span>
                    <span className={`matching__confidence ${getConfidenceColor(candidate.confidence)}`}>
                      {candidate.confidence}%
                    </span>
                  </div>
                  <div className="matching__candidate-amount">{formatCurrency(candidate.amount)}</div>
                </div>

                <div className="matching__candidate-details">
                  <div className="matching__candidate-detail">
                    <span className="matching__label">Date:</span>
                    <span className="matching__value">{formatDate(candidate.date)}</span>
                  </div>
                  <div className="matching__candidate-detail">
                    <span className="matching__label">Description:</span>
                    <span className="matching__value">{candidate.description}</span>
                  </div>
                  <div className="matching__candidate-detail">
                    <span className="matching__label">Reason:</span>
                    <span className="matching__value">{candidate.reason}</span>
                  </div>

                  {amountDifference > 0 && selectedCandidate?.entryId === candidate.entryId && (
                    <div className="matching__amount-diff">
                      <span className="matching__label">Difference:</span>
                      <span className={`matching__value ${amountDifference > 0 ? 'matching__diff--warning' : ''}`}>
                        {formatCurrency(amountDifference)} ({percentDifference.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Match Action Panel */}
        {selectedCandidate && (
          <div className="matching__action-panel">
            <div className="matching__form-group">
              <label htmlFor="match-amount" className="matching__label">
                Match Amount (optional)
              </label>
              <input
                id="match-amount"
                type="number"
                className="matching__input"
                placeholder={formatCurrency(selectedCandidate.amount)}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                step="0.01"
                disabled={isLoading}
              />
            </div>

            <div className="matching__form-group">
              <label htmlFor="match-reason" className="matching__label">
                Matching Reason (optional)
              </label>
              <input
                id="match-reason"
                type="text"
                className="matching__input"
                placeholder={selectedCandidate.reason}
                value={matchingReason}
                onChange={(e) => setMatchingReason(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              className="matching__button matching__button--primary"
              onClick={handleMatch}
              disabled={isLoading || !selectedCandidate}
              aria-busy={isLoading}
            >
              {isLoading ? 'Matching...' : 'Confirm Match'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchingInterface;
