import React, { useMemo } from 'react';
import { MatchPair, Bill } from '../../stores/cash-book/matchingStore';
import './matching.css';

interface MatchingDashboardProps {
  bills: Bill[];
  pairs: MatchPair[];
  isLoading: boolean;
  onAutoMatch: () => void;
  onRefresh: () => void;
}

interface KPIMetrics {
  totalBills: number;
  matchedCount: number;
  unmatchedCount: number;
  percentMatched: number;
  totalAmount: number;
  totalMatched: number;
  discrepancy: number;
}

const MatchingDashboard: React.FC<MatchingDashboardProps> = ({ bills, pairs, isLoading, onAutoMatch, onRefresh }) => {
  const metrics = useMemo((): KPIMetrics => {
    const totalBills = bills.length + pairs.length;
    const matchedCount = pairs.filter((p) => p.confidence >= 90).length;
    const unmatchedCount = bills.length;
    const percentMatched = totalBills > 0 ? (matchedCount / totalBills) * 100 : 0;

    const totalAmount = (bills.concat() as any[]).reduce((sum, bill) => sum + (bill.amount || 0), 0) +
                        pairs.reduce((sum, pair) => sum + (pair.matchedAmount || 0), 0);

    const totalMatched = pairs.reduce((sum, pair) => sum + (pair.matchedAmount || 0), 0);
    const discrepancy = totalAmount - totalMatched;

    return {
      totalBills,
      matchedCount,
      unmatchedCount,
      percentMatched,
      totalAmount,
      totalMatched,
      discrepancy,
    };
  }, [bills, pairs]);

  const recentMatches = useMemo(() => {
    return pairs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [pairs]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'matching__badge--high';
    if (confidence >= 70) return 'matching__badge--medium';
    return 'matching__badge--low';
  };

  return (
    <div className="matching__dashboard">
      {/* Header */}
      <div className="matching__header">
        <h2 className="matching__title">Bill Matching Overview</h2>
        <div className="matching__actions">
          <button
            className="matching__button matching__button--primary"
            onClick={onAutoMatch}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Processing...' : 'Auto Match All'}
          </button>
          <button
            className="matching__button matching__button--secondary"
            onClick={onRefresh}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="matching__grid">
        {/* Total Bills */}
        <div className="matching__card matching__card--primary">
          <div className="matching__card-label">Total Bills</div>
          <div className="matching__card-value">{metrics.totalBills}</div>
          <div className="matching__card-meta">Across all statuses</div>
        </div>

        {/* Matched Count */}
        <div className="matching__card matching__card--success">
          <div className="matching__card-label">Matched (High Confidence)</div>
          <div className="matching__card-value">{metrics.matchedCount}</div>
          <div className="matching__card-meta">≥90% confidence</div>
        </div>

        {/* Unmatched Count */}
        <div className="matching__card matching__card--warning">
          <div className="matching__card-label">Unmatched</div>
          <div className="matching__card-value">{metrics.unmatchedCount}</div>
          <div className="matching__card-meta">Needs attention</div>
        </div>

        {/* Percent Matched */}
        <div className="matching__card matching__card--info">
          <div className="matching__card-label">Match Rate</div>
          <div className="matching__card-value">{metrics.percentMatched.toFixed(1)}%</div>
          <div className="matching__card-meta">Of total bills</div>
        </div>

        {/* Total Amount */}
        <div className="matching__card matching__card--primary">
          <div className="matching__card-label">Total Amount</div>
          <div className="matching__card-value">{formatCurrency(metrics.totalAmount)}</div>
          <div className="matching__card-meta">All bills value</div>
        </div>

        {/* Total Matched */}
        <div className="matching__card matching__card--success">
          <div className="matching__card-label">Amount Matched</div>
          <div className="matching__card-value">{formatCurrency(metrics.totalMatched)}</div>
          <div className="matching__card-meta">Confirmed value</div>
        </div>

        {/* Discrepancy */}
        <div className={`matching__card ${metrics.discrepancy > 0 ? 'matching__card--warning' : 'matching__card--success'}`}>
          <div className="matching__card-label">Discrepancy</div>
          <div className="matching__card-value">{formatCurrency(Math.abs(metrics.discrepancy))}</div>
          <div className="matching__card-meta">{metrics.discrepancy > 0 ? 'Unmatched amount' : 'No discrepancy'}</div>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="matching__section">
        <h3 className="matching__subtitle">Latest Matches</h3>

        {recentMatches.length === 0 ? (
          <div className="matching__empty">
            <p>No matches yet. Create a match to see it here.</p>
          </div>
        ) : (
          <div className="matching__matches-list">
            {recentMatches.map((match) => (
              <div key={match.id} className="matching__match-item">
                <div className="matching__match-info">
                  <div className="matching__match-details">
                    <span className="matching__match-label">Bill #{match.billId}</span>
                    <span className="matching__match-arrow">→</span>
                    <span className="matching__match-label">Entry #{match.entryId}</span>
                  </div>
                  <div className="matching__match-time">{formatDate(match.timestamp)}</div>
                </div>
                <div className="matching__match-amount">{formatCurrency(match.matchedAmount)}</div>
                <span className={`matching__badge ${getConfidenceColor(match.confidence)}`}>
                  {match.confidence}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchingDashboard;
