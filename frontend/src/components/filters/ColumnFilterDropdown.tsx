import React, { useState, useEffect } from 'react';
import { FilterOperator, DataType, ColumnValueDto } from '../../types/filters';
import { NumericFilter } from './NumericFilter';
import { DateFilter } from './DateFilter';
import { TextFilter } from './TextFilter';
import { EnumFilter } from './EnumFilter';

interface ColumnFilterDropdownProps {
  columnName: string;
  dataType: DataType;
  values?: ColumnValueDto[];
  onApply: (operator: FilterOperator, value: any) => void;
  onClose: () => void;
}

export function ColumnFilterDropdown({
  columnName,
  dataType,
  values = [],
  onApply,
  onClose,
}: ColumnFilterDropdownProps) {
  return (
    <div style={styles.popup}>
      <div style={styles.header}>
        <h4 style={styles.title}>{columnName}</h4>
        <button onClick={onClose} style={styles.closeBtn}>
          ✕
        </button>
      </div>

      <div style={styles.content}>
        {dataType === DataType.TEXT && (
          <TextFilter
            field={columnName}
            value={undefined}
            onApply={onApply}
            onCancel={onClose}
          />
        )}

        {dataType === DataType.NUMERIC && (
          <NumericFilter
            field={columnName}
            value={undefined}
            onApply={onApply}
            onCancel={onClose}
          />
        )}

        {dataType === DataType.DATE && (
          <DateFilter
            field={columnName}
            value={undefined}
            onApply={onApply}
            onCancel={onClose}
          />
        )}

        {dataType === DataType.ENUM && (
          <EnumFilter
            field={columnName}
            values={values}
            selectedValues={undefined}
            onApply={onApply}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  popup: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    minWidth: '250px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid #eee',
  },
  title: {
    margin: 0,
    fontSize: '13px',
    fontWeight: '600',
  },
  closeBtn: {
    padding: '0',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
  },
  content: {
    padding: '8px',
  },
};
