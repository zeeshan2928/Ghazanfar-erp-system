import React, { useState, useEffect } from 'react';
import { useMatchingStore, MatchPair, MatchingCandidate } from '../../stores/cash-book/matchingStore';
import { useMatchingAPI } from '../../services/cash-book/matchingApiIntegration';
import './bill-matching.css';

export function BillMatchingInterface(): JSX.Element {
  const store = useMatchingStore();
  const api = useMatchingAPI();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<MatchingCandidate[]>([]);
  const [autoMatchProgress, setAutoMatchProgress] = useState(0);
  const [isAutoMatching, setIsAutoMatching] = useState(false);

  useEffect(() => {
    const loadUnmatchedBills = async () => {
      setIsLoading(true);
      try {
        const bills = await api.getUnmatchedBills();
        store.setUnmatchedBills(bills);
      } catch (error) {
        console.error('Failed to load unmatched bills:', error);
      }
      setIsLoading(false);
    };

    loadUnmatchedBills();
  }, []);

  const handleSelectBill = async (billId: number) => {
    setSelectedBill(billId);
    try {
      const billCandidates = await api.getMatchingCandidates(billId);
      setCandidates(billCandidates);
    } catch (error) {
      console.error('Failed to load candidates:', error);
      setCandidates([]);
    }
  };

  const handleMatch = async (entryId: number, reason: string) => {
    if (!selectedBill) return;

    try {
      const match = await api.matchBillToEntry(selectedBill, entryId, reason);
      if (match) {
        store.matchBill(selectedBill, entryId, 0, reason, 95);
        // Remove matched bill from list
        const updatedBills = store.unmatchedBills.filter((b) => b.id !== selectedBill);
        store.setUnmatchedBills(updatedBills);
        setSelectedBill(null);
        setCandidates([]);
      }
    } catch (error) {
      store.setError('Failed to match bill');
    }
  };

  const handleAutoMatch = async () => {
    setIsAutoMatching(true);
    setAutoMatchProgress(0);

    try {
      const totalBills = store.unmatchedBills.length;
      const results = await api.batchAutoMatch();

      // Simulate progress
      for (let i = 0; i <= results.length; i++) {
        setAutoMatchProgress((i / results.length) * 100);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Update store with matched pairs
      store.autoMatch(
        results.map((r) => ({
          billId: r.billId,
          entryId: r.entryId,
          confidence: r.confidence,
        }))
      );

      // Reload unmatched bills
      const bills = await api.getUnmatchedBills();
      store.setUnmatchedBills(bills);
    } catch (error) {
      store.setError('Auto-match failed');
    } finally {
      setIsAutoMatching(false);
      setAutoMatchProgress(0);
    }
  };

  const handleUndoMatch = async (matchId: number) => {
    try {
      await api.undoMatch(matchId);
      store.undoMatch(matchId);
      // Reload bills
      const bills = await api.getUnmatchedBills();
      store.setUnmatchedBills(bills);
    } catch (error) {
      store.setError('Failed to undo match');
    }
  };

  if (isAutoMatching) {
    return (
      <div className="bill-matching">
        <div className="bill-matching__auto-progress">
          <h3 className="bill-matching__title">Auto-Matching Bills...</h3>
          <div className="bill-matching__progress-bar">
            <div
              className="bill-matching__progress-fill"
              style={{ width: `${autoMatchProgress}%` }}
            />
          </div>
          <p className="bill-matching__progress-text">{Math.round(autoMatchProgress)}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bill-matching">
      {/* Header */}
      <div className="bill-matching__header">
        <h2 className="bill-matching__title">Bill Matching</h2>
        <button
          className="bill-matching__btn bill-matching__btn--primary"
          onClick={handleAutoMatch}
          disabled={isLoading || store.unmatchedBills.length === 0}
        >
          🤖 Auto-Match All
        </button>
      </div>

      {/* Summary */}
      <div className="bill-matching__summary">
        <div className="bill-matching__stat">
          <div className="bill-matching__stat-label">Unmatched Bills</div>
          <div className="bill-matching__stat-value">{store.unmatchedBills.length}</div>
        </div>
        <div className="bill-matching__stat">
          <div className="bill-matching__stat-label">Matched</div>
          <div className="bill-matching__stat-value">{store.matchedCount}</div>
        </div>
        <div className="bill-matching__stat">
          <div className="bill-matching__stat-label">Unconfirmed</div>
          <div className="bill-matching__stat-value">{store.unconfirmedMatches}</div>
        </div>
      </div>

      {/* Error */}
      {store.error && (
        <div className="bill-matching__error">
          ⚠️ {store.error}
        </div>
      )}

      {/* Main Content */}
      <div className="bill-matching__container">
        {/* Bills List */}
        <div className="bill-matching__panel bill-matching__panel--bills">
          <h3 className="bill-matching__panel-title">Unmatched Bills</h3>

          {isLoading ? (
            <div className="bill-matching__loading">
              <div className="bill-matching__spinner" />
              <p>Loading bills...</p>
            </div>
          ) : store.unmatchedBills.length === 0 ? (
            <div className="bill-matching__empty">
              <p>All bills matched! 🎉</p>
            </div>
          ) : (
            <div className="bill-matching__list">
              {store.unmatchedBills.map((bill) => (
                <div
                  key={bill.id}
                  className={`bill-matching__item ${
                    selectedBill === bill.id ? 'bill-matching__item--selected' : ''
                  }`}
                  onClick={() => handleSelectBill(bill.id)}
                >
                  <div className="bill-matching__item-header">
                    <span className="bill-matching__item-number">
                      {bill.bill_number}
                    </span>
                    <span className="bill-matching__item-amount">
                      Rs. {(bill.amount / 100).toLocaleString('en-PK', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="bill-matching__item-date">
                    {new Date(bill.date).toLocaleDateString()}
                  </div>
                  <div className="bill-matching__item-vendor">
                    {bill.vendor?.name || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Candidates Panel */}
        <div className="bill-matching__panel bill-matching__panel--candidates">
          <h3 className="bill-matching__panel-title">
            {selectedBill ? 'Matching Candidates' : 'Select a Bill'}
          </h3>

          {!selectedBill ? (
            <div className="bill-matching__empty">
              <p>Select a bill from the left panel</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bill-matching__empty">
              <p>No matching candidates found</p>
            </div>
          ) : (
            <div className="bill-matching__candidates">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="bill-matching__candidate"
                >
                  <div className="bill-matching__candidate-header">
                    <div className="bill-matching__candidate-info">
                      <div className="bill-matching__candidate-amount">
                        Rs. {(candidate.amount / 100).toLocaleString('en-PK', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="bill-matching__candidate-date">
                        {new Date(candidate.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      className={`bill-matching__confidence ${
                        candidate.confidence >= 90
                          ? 'bill-matching__confidence--high'
                          : candidate.confidence >= 75
                          ? 'bill-matching__confidence--medium'
                          : 'bill-matching__confidence--low'
                      }`}
                    >
                      {candidate.confidence}%
                    </div>
                  </div>

                  <div className="bill-matching__candidate-reason">
                    {candidate.reason}
                  </div>

                  <button
                    className="bill-matching__btn bill-matching__btn--match"
                    onClick={() =>
                      handleMatch(candidate.id, candidate.reason)
                    }
                  >
                    ✓ Match
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Matched Pairs */}
      {store.matchedPairs.length > 0 && (
        <div className="bill-matching__section">
          <h3 className="bill-matching__section-title">Recent Matches</h3>
          <div className="bill-matching__pairs">
            {store.matchedPairs.slice(0, 5).map((pair) => (
              <div key={pair.id} className="bill-matching__pair">
                <div className="bill-matching__pair-info">
                  <span>Bill #{pair.billId}</span>
                  <span className="bill-matching__pair-arrow">→</span>
                  <span>Entry #{pair.entryId}</span>
                </div>
                <button
                  className="bill-matching__pair-undo"
                  onClick={() => handleUndoMatch(pair.id)}
                  title="Undo match"
                >
                  ↶
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BillMatchingInterface;
