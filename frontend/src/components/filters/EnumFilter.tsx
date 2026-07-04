import React, { useState, useEffect } from 'react';
import { FilterOperator, ColumnValueDto } from '../../types/filters';

interface EnumFilterProps {
  field: string;
  values: ColumnValueDto[];
  selectedValues: (string | number)[] | undefined;
  onApply: (operator: FilterOperator, value: any) => void;
  onCancel: () => void;
}

export function EnumFilter({
  field,
  values,
  selectedValues = [],
  onApply,
  onCancel,
}: EnumFilterProps) {
  const [selected, setSelected] = useState<(string | number)[]>(
    selectedValues || []
  );

  const handleToggle = (value: string | number) => {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleApply = () => {
    if (selected.length === 0) {
      alert('Please select at least one value');
      return;
    }
    onApply(FilterOperator.IN, selected);
  };

  return (
    <div style={styles.container}>
      <div style={styles.checklist}>
        {values.map((item) => (
          <label key={item.value} style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={selected.includes(item.value)}
              onChange={() => handleToggle(item.value)}
              style={styles.checkbox}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <div style={styles.buttons}>
        <button onClick={handleApply} style={styles.applyBtn}>
          Apply
        </button>
        <button onClick={onCancel} style={styles.cancelBtn}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#f9f9f9',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  checklist: {
    marginBottom: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 0',
    cursor: 'pointer',
    fontSize: '12px',
  },
  checkbox: {
    marginRight: '8px',
    cursor: 'pointer',
  },
  buttons: {
    display: 'flex',
    gap: '8px',
    borderTop: '1px solid #ddd',
    paddingTop: '8px',
  },
  applyBtn: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#ccc',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};
