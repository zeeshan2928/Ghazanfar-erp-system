import React, { useState, useMemo } from 'react';
import { CashFlowEntry } from '../../stores/cash-book/reportStore';

interface CashFlowProps {
  data: CashFlowEntry[];
  isLoading: boolean;
  groupBy: 'day' | 'week' | 'month';
  onGroupByChange: (groupBy: 'day' | 'week' | 'month') => void;
}

const getCategoryColor = (
  category: 'sales' | 'purchases' | 'expenses'
): string => {
  switch (category) {
    case 'sales':
      return '#4CAF50';
    case 'purchases':
      return '#F44336';
    case 'expenses':
      return '#FF9800';
    default:
      return '#2196F3';
  }
};

const getCategoryLabel = (
  category: 'sales' | 'purchases' | 'expenses'
): string => {
  switch (category) {
    case 'sales':
      return 'Sales';
    case 'purchases':
      return 'Purchases';
    case 'expenses':
      return 'Expenses';
  }
};

const formatDate = (dateStr: string, groupBy: 'day' | 'week' | 'month'): string => {
  const date = new Date(dateStr);
  if (groupBy === 'day') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (groupBy === 'week') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return `W${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)}`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
};

const Tooltip: React.FC<{
  x: number;
  y: number;
  entry: CashFlowEntry;
  visible: boolean;
}> = ({ x, y, entry, visible }) => {
  if (!visible) return null;

  return (
    <div
      className="cash-flow-tooltip"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="cash-flow-tooltip__date">{entry.date}</div>
      <div className="cash-flow-tooltip__category">{getCategoryLabel(entry.category)}</div>
      <div className="cash-flow-tooltip__amount">
        PKR {entry.amount.toLocaleString()}
      </div>
    </div>
  );
};

export const CashFlow: React.FC<CashFlowProps> = ({
  data,
  isLoading,
  groupBy,
  onGroupByChange,
}) => {
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    entry: CashFlowEntry;
  } | null>(null);

  const maxAmount = useMemo(
    () => Math.max(...data.map((d) => d.amount), 1),
    [data]
  );

  const groupedData = useMemo(() => {
    if (data.length === 0) return [];

    const grouped: Record<string, CashFlowEntry[]> = {};
    data.forEach((entry) => {
      const formattedDate = formatDate(entry.date, groupBy);
      if (!grouped[formattedDate]) {
        grouped[formattedDate] = [];
      }
      grouped[formattedDate].push(entry);
    });

    return Object.entries(grouped).map(([date, entries]) => ({
      date,
      entries,
      total: entries.reduce((sum, e) => sum + e.amount, 0),
    }));
  }, [data, groupBy]);

  const handleBarHover = (e: React.MouseEvent, entry: CashFlowEntry) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipData({
      x: rect.left,
      y: rect.top - 10,
      entry,
    });
  };

  if (isLoading) {
    return (
      <div className="cash-flow-loading">
        <div className="cash-flow-loading__spinner" />
        <p>Loading chart data...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="cash-flow-empty">
        <p>No cash flow data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="cash-flow">
      <div className="cash-flow-header">
        <h2 className="cash-flow-header__title">Cash Flow Analysis</h2>
        <div className="cash-flow-controls">
          <button
            className={`cash-flow-btn ${groupBy === 'day' ? 'active' : ''}`}
            onClick={() => onGroupByChange('day')}
          >
            Daily
          </button>
          <button
            className={`cash-flow-btn ${groupBy === 'week' ? 'active' : ''}`}
            onClick={() => onGroupByChange('week')}
          >
            Weekly
          </button>
          <button
            className={`cash-flow-btn ${groupBy === 'month' ? 'active' : ''}`}
            onClick={() => onGroupByChange('month')}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="cash-flow-legend">
        <div className="cash-flow-legend__item">
          <span
            className="cash-flow-legend__color"
            style={{ backgroundColor: '#4CAF50' }}
          />
          <span>Sales</span>
        </div>
        <div className="cash-flow-legend__item">
          <span
            className="cash-flow-legend__color"
            style={{ backgroundColor: '#F44336' }}
          />
          <span>Purchases</span>
        </div>
        <div className="cash-flow-legend__item">
          <span
            className="cash-flow-legend__color"
            style={{ backgroundColor: '#FF9800' }}
          />
          <span>Expenses</span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="cash-flow-chart">
        <div className="cash-flow-chart__y-axis">
          <div className="cash-flow-chart__y-label">
            PKR {(maxAmount).toLocaleString()}
          </div>
          <div className="cash-flow-chart__y-label" style={{ marginTop: 'auto' }}>
            0
          </div>
        </div>

        <div className="cash-flow-chart__content">
          <div className="cash-flow-chart__bars">
            {groupedData.map((group) => (
              <div key={group.date} className="cash-flow-chart__group">
                {group.entries.map((entry, idx) => (
                  <div
                    key={`${group.date}-${idx}`}
                    className="cash-flow-chart__bar-wrapper"
                    onMouseEnter={(e) => handleBarHover(e, entry)}
                    onMouseLeave={() => setTooltipData(null)}
                    title={`${getCategoryLabel(entry.category)}: PKR ${entry.amount.toLocaleString()}`}
                  >
                    <div
                      className="cash-flow-chart__bar"
                      style={{
                        height: `${(entry.amount / maxAmount) * 100}%`,
                        backgroundColor: getCategoryColor(entry.category),
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* X Axis Labels */}
          <div className="cash-flow-chart__x-axis">
            {groupedData.map((group) => (
              <div key={group.date} className="cash-flow-chart__x-label">
                {group.date}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltipData && (
        <Tooltip
          x={tooltipData.x}
          y={tooltipData.y}
          entry={tooltipData.entry}
          visible={true}
        />
      )}
    </div>
  );
};

export default CashFlow;
