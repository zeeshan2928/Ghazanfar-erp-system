import React, { useMemo, useState } from 'react';
import { Discrepancy } from '../../stores/cash-book/reportStore';

interface DiscrepancyListProps {
  discrepancies: Discrepancy[];
  isLoading: boolean;
  onExport: (format: 'pdf' | 'excel') => void;
}

const getSeverityColor = (severity: 'critical' | 'warning' | 'notice'): string => {
  switch (severity) {
    case 'critical':
      return '#F44336';
    case 'warning':
      return '#FF9800';
    case 'notice':
      return '#FFC107';
    default:
      return '#2196F3';
  }
};

const SeverityBadge: React.FC<{ severity: 'critical' | 'warning' | 'notice' }> = ({
  severity,
}) => {
  const colors: Record<string, { bg: string; text: string }> = {
    critical: { bg: '#FFEBEE', text: '#C62828' },
    warning: { bg: '#FFF3E0', text: '#E65100' },
    notice: { bg: '#FFFDE7', text: '#F57F17' },
  };

  const color = colors[severity] || colors.notice;

  return (
    <span
      className="severity-badge"
      style={{
        backgroundColor: color.bg,
        color: color.text,
      }}
    >
      {severity.toUpperCase()}
    </span>
  );
};

export const DiscrepancyList: React.FC<DiscrepancyListProps> = ({
  discrepancies,
  isLoading,
  onExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDaysFilter, setSelectedDaysFilter] = useState<number | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<
    'critical' | 'warning' | 'notice' | null
  >(null);

  const filteredDiscrepancies = useMemo(() => {
    return discrepancies
      .filter((d) => {
        if (searchQuery && !d.description.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        if (selectedDaysFilter) {
          if (selectedDaysFilter === 7 && d.daysOld > 7) return false;
          if (selectedDaysFilter === 15 && (d.daysOld < 8 || d.daysOld > 15)) return false;
          if (selectedDaysFilter === 30 && (d.daysOld < 16 || d.daysOld > 30)) return false;
          if (selectedDaysFilter === 60 && (d.daysOld < 31 || d.daysOld > 60)) return false;
          if (selectedDaysFilter === 90 && d.daysOld < 61) return false;
        }
        if (selectedSeverity && d.severity !== selectedSeverity) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.daysOld - a.daysOld);
  }, [discrepancies, searchQuery, selectedDaysFilter, selectedSeverity]);

  const daysFilterOptions = [
    { label: 'Last 7 days', value: 7 },
    { label: '8-15 days', value: 15 },
    { label: '16-30 days', value: 30 },
    { label: '31-60 days', value: 60 },
    { label: '60+ days', value: 90 },
  ];

  const severityOptions = [
    { label: 'Critical', value: 'critical' as const },
    { label: 'Warning', value: 'warning' as const },
    { label: 'Notice', value: 'notice' as const },
  ];

  if (isLoading) {
    return (
      <div className="discrepancy-loading">
        <div className="discrepancy-loading__spinner" />
        <p>Loading discrepancies...</p>
      </div>
    );
  }

  return (
    <div className="discrepancy-list">
      <div className="discrepancy-header">
        <h2 className="discrepancy-header__title">Discrepancies & Aging</h2>
        <div className="discrepancy-header__actions">
          <button
            className="discrepancy-export-btn"
            onClick={() => onExport('pdf')}
            disabled={filteredDiscrepancies.length === 0}
          >
            📄 Export PDF
          </button>
          <button
            className="discrepancy-export-btn"
            onClick={() => onExport('excel')}
            disabled={filteredDiscrepancies.length === 0}
          >
            📊 Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="discrepancy-filters">
        <div className="discrepancy-filter-group">
          <label className="discrepancy-filter-label">Search</label>
          <input
            type="text"
            className="discrepancy-filter-input"
            placeholder="Search by description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="discrepancy-filter-group">
          <label className="discrepancy-filter-label">Age</label>
          <select
            className="discrepancy-filter-select"
            value={selectedDaysFilter || ''}
            onChange={(e) =>
              setSelectedDaysFilter(e.target.value ? parseInt(e.target.value) : null)
            }
          >
            <option value="">All Ages</option>
            {daysFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="discrepancy-filter-group">
          <label className="discrepancy-filter-label">Severity</label>
          <select
            className="discrepancy-filter-select"
            value={selectedSeverity || ''}
            onChange={(e) =>
              setSelectedSeverity(
                e.target.value
                  ? (e.target.value as 'critical' | 'warning' | 'notice')
                  : null
              )
            }
          >
            <option value="">All Levels</option>
            {severityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          className="discrepancy-filter-reset"
          onClick={() => {
            setSearchQuery('');
            setSelectedDaysFilter(null);
            setSelectedSeverity(null);
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* Results Count */}
      <div className="discrepancy-count">
        Showing {filteredDiscrepancies.length} of {discrepancies.length} discrepancies
      </div>

      {/* List */}
      {filteredDiscrepancies.length === 0 ? (
        <div className="discrepancy-empty">
          <p>No discrepancies found matching your filters.</p>
        </div>
      ) : (
        <div className="discrepancy-table">
          <div className="discrepancy-table__header">
            <div className="discrepancy-table__cell discrepancy-table__cell--description">
              Description
            </div>
            <div className="discrepancy-table__cell discrepancy-table__cell--amount">
              Amount
            </div>
            <div className="discrepancy-table__cell discrepancy-table__cell--days">
              Days Old
            </div>
            <div className="discrepancy-table__cell discrepancy-table__cell--severity">
              Severity
            </div>
          </div>

          <div className="discrepancy-table__body">
            {filteredDiscrepancies.map((discrepancy) => (
              <div key={discrepancy.id} className="discrepancy-table__row">
                <div className="discrepancy-table__cell discrepancy-table__cell--description">
                  <div className="discrepancy-row__type">{discrepancy.type}</div>
                  <div className="discrepancy-row__desc">{discrepancy.description}</div>
                </div>
                <div className="discrepancy-table__cell discrepancy-table__cell--amount">
                  <span
                    style={{
                      color: getSeverityColor(discrepancy.severity),
                      fontWeight: 600,
                    }}
                  >
                    PKR {discrepancy.amount.toLocaleString()}
                  </span>
                </div>
                <div className="discrepancy-table__cell discrepancy-table__cell--days">
                  {discrepancy.daysOld} days
                </div>
                <div className="discrepancy-table__cell discrepancy-table__cell--severity">
                  <SeverityBadge severity={discrepancy.severity} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscrepancyList;
