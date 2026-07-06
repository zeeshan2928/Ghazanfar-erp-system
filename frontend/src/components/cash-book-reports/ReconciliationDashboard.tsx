import React from 'react';
import { CashBookKPIs } from '../../stores/cash-book/reportStore';

interface ReconciliationDashboardProps {
  kpis: CashBookKPIs | null;
  isLoading: boolean;
}

const KPICard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
  progress?: number;
}> = ({ title, value, unit, status, progress }) => {
  const statusColor =
    status === 'critical' ? '#F44336' :
    status === 'warning' ? '#FF9800' :
    '#4CAF50';

  return (
    <div className="kpi-card">
      <div className="kpi-card__header">
        <span className="kpi-card__title">{title}</span>
        {status && (
          <span
            className="kpi-card__status"
            style={{ backgroundColor: statusColor }}
          />
        )}
      </div>
      <div className="kpi-card__value">
        {value}
        {unit && <span className="kpi-card__unit">{unit}</span>}
      </div>
      {progress !== undefined && (
        <div className="kpi-card__progress-bar">
          <div
            className="kpi-card__progress-fill"
            style={{
              width: `${Math.min(100, progress)}%`,
              backgroundColor: statusColor,
            }}
          />
        </div>
      )}
    </div>
  );
};

const MatchSummary: React.FC<{ kpis: CashBookKPIs }> = ({ kpis }) => {
  const summaryItems = [
    { label: 'Total Matched', value: kpis.matchedCount },
    { label: 'Total Unmatched', value: kpis.unmatchedCount },
    { label: 'Match Rate', value: `${kpis.reconciliationPercentage.toFixed(1)}%` },
  ];

  return (
    <div className="match-summary">
      <h3 className="match-summary__title">Reconciliation Summary</h3>
      <div className="match-summary__grid">
        {summaryItems.map((item) => (
          <div key={item.label} className="match-summary__item">
            <div className="match-summary__label">{item.label}</div>
            <div className="match-summary__value">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DiscrepancySummary: React.FC<{ kpis: CashBookKPIs }> = ({ kpis }) => {
  const criticalityScore = Math.min(100, (kpis.oldestUnmatchedDays / 90) * 100);
  const severity =
    kpis.oldestUnmatchedDays > 60
      ? 'critical'
      : kpis.oldestUnmatchedDays > 30
      ? 'warning'
      : 'good';

  return (
    <div className="discrepancy-summary">
      <h3 className="discrepancy-summary__title">Aging Analysis</h3>
      <div className="discrepancy-summary__main">
        <div className="discrepancy-summary__days">
          {kpis.oldestUnmatchedDays}
          <span className="discrepancy-summary__label">days</span>
        </div>
        <div
          className="discrepancy-summary__severity"
          style={{
            color:
              severity === 'critical'
                ? '#F44336'
                : severity === 'warning'
                ? '#FF9800'
                : '#4CAF50',
          }}
        >
          {severity.toUpperCase()}
        </div>
      </div>
      <div className="discrepancy-summary__details">
        <span>Oldest Unmatched: {kpis.oldestUnmatchedDays} days</span>
        <span>Avg Match Time: {kpis.avgMatchTime.toFixed(1)} hours</span>
      </div>
    </div>
  );
};

export const ReconciliationDashboard: React.FC<ReconciliationDashboardProps> = ({
  kpis,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading__spinner" />
        <p>Loading KPIs...</p>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="dashboard-empty">
        <p>No data available. Please select a date range and generate a report.</p>
      </div>
    );
  }

  const reconciliationStatus =
    kpis.reconciliationPercentage > 90
      ? 'good'
      : kpis.reconciliationPercentage > 75
      ? 'warning'
      : 'critical';

  const discrepancyStatus =
    kpis.discrepancyAmount === 0
      ? 'good'
      : kpis.discrepancyAmount < 10000
      ? 'warning'
      : 'critical';

  return (
    <div className="reconciliation-dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-header__title">Dashboard</h2>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <KPICard
          title="Total Entries"
          value={kpis.totalEntries}
          status="good"
        />
        <KPICard
          title="Reconciliation %"
          value={kpis.reconciliationPercentage.toFixed(1)}
          unit="%"
          status={reconciliationStatus}
          progress={kpis.reconciliationPercentage}
        />
        <KPICard
          title="Discrepancies"
          value={kpis.unmatchedCount}
          status={discrepancyStatus}
        />
        <KPICard
          title="Oldest Unmatched"
          value={kpis.oldestUnmatchedDays}
          unit="days"
          status={
            kpis.oldestUnmatchedDays > 60
              ? 'critical'
              : kpis.oldestUnmatchedDays > 30
              ? 'warning'
              : 'good'
          }
        />
      </div>

      {/* Summary Sections */}
      <div className="dashboard-summaries">
        <MatchSummary kpis={kpis} />
        <DiscrepancySummary kpis={kpis} />
      </div>

      {/* Amount Summary */}
      <div className="amount-summary">
        <div className="amount-summary__card">
          <div className="amount-summary__label">Total Amount</div>
          <div className="amount-summary__value">PKR {kpis.totalAmount.toLocaleString()}</div>
        </div>
        <div className="amount-summary__card">
          <div className="amount-summary__label">Discrepancy Amount</div>
          <div className="amount-summary__value" style={{ color: '#F44336' }}>
            PKR {kpis.discrepancyAmount.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationDashboard;
