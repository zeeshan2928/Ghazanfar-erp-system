import React from 'react';
import { FilterOperatorDto } from '../../types/filters';

interface FilterSummaryProps {
  primaryFilter?: FilterOperatorDto;
  columnFilters?: FilterOperatorDto[];
  onRemovePrimary?: () => void;
  onRemoveColumn?: (index: number) => void;
}

export function FilterSummary({
  primaryFilter,
  columnFilters = [],
  onRemovePrimary,
  onRemoveColumn,
}: FilterSummaryProps) {
  if (!primaryFilter && columnFilters.length === 0) {
    return null;
  }

  const formatValue = (value: any): string => {
    if (Array.isArray(value)) {
      return `${value[0]} - ${value[1]}`;
    }
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Active Filters</h4>
      <div style={styles.tags}>
        {primaryFilter && (
          <div style={styles.tag}>
            <span>
              <strong>{primaryFilter.field}</strong> {primaryFilter.operator}{' '}
              {formatValue(primaryFilter.value)}
            </span>
            {onRemovePrimary && (
              <button
                onClick={onRemovePrimary}
                style={styles.removeBtn}
                title="Remove filter"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {columnFilters.map((filter, idx) => (
          <div key={idx} style={styles.tag}>
            <span>
              <strong>{filter.field}</strong> {filter.operator}{' '}
              {formatValue(filter.value)}
            </span>
            {onRemoveColumn && (
              <button
                onClick={() => onRemoveColumn(idx)}
                style={styles.removeBtn}
                title="Remove filter"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f0f4ff',
    borderRadius: '4px',
    border: '1px solid #d0d8ff',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: '600',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    backgroundColor: 'white',
    border: '1px solid #d0d8ff',
    borderRadius: '3px',
    fontSize: '12px',
  },
  removeBtn: {
    padding: '0',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#e74c3c',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: '1',
  },
};
