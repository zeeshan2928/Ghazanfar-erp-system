import React, { useState } from 'react';
import { FilterOperator, DataType, ColumnValueDto } from '../../types/filters';
import { ColumnFilterDropdown } from './ColumnFilterDropdown';

interface FilterColumnConfig {
  name: string;
  label: string;
  dataType: DataType;
  values?: ColumnValueDto[];
}

interface FilterPanelProps {
  columns: FilterColumnConfig[];
  onFilterApply: (columnName: string, operator: FilterOperator, value: any) => void;
}

export function FilterPanel({ columns, onFilterApply }: FilterPanelProps) {
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const [columnValues, setColumnValues] = useState<Record<string, ColumnValueDto[]>>({});

  const handleColumnClick = (columnName: string, values?: ColumnValueDto[]) => {
    setOpenColumn(openColumn === columnName ? null : columnName);
    if (values) {
      setColumnValues((prev) => ({ ...prev, [columnName]: values }));
    }
  };

  const handleFilterApply = (
    columnName: string,
    operator: FilterOperator,
    value: any
  ) => {
    onFilterApply(columnName, operator, value);
    setOpenColumn(null);
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.label}>Column Filters</h4>
      <div style={styles.buttonGroup}>
        {columns.map((column) => (
          <div key={column.name} style={styles.buttonWrapper}>
            <button
              onClick={() =>
                handleColumnClick(column.name, column.values)
              }
              style={{
                ...styles.filterBtn,
                ...(openColumn === column.name ? styles.filterBtnActive : {}),
              }}
              title={`Filter by ${column.label}`}
            >
              {column.label} {openColumn === column.name ? '▼' : '▶'}
            </button>

            {openColumn === column.name && (
              <ColumnFilterDropdown
                columnName={column.name}
                dataType={column.dataType}
                values={columnValues[column.name] || column.values}
                onApply={(op, val) =>
                  handleFilterApply(column.name, op, val)
                }
                onClose={() => setOpenColumn(null)}
              />
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
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    border: '1px solid #eee',
  },
  label: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: '600',
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  buttonWrapper: {
    position: 'relative',
  },
  filterBtn: {
    padding: '6px 10px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  filterBtnActive: {
    backgroundColor: '#667eea',
    color: 'white',
    borderColor: '#667eea',
  },
};
