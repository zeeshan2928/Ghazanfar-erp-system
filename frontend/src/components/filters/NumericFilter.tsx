import React, { useState } from 'react';
import { FilterOperator } from '../../types/filters';

interface NumericFilterProps {
  field: string;
  value: number | [number, number] | undefined;
  onApply: (operator: FilterOperator, value: any) => void;
  onCancel: () => void;
}

export function NumericFilter({
  field,
  value,
  onApply,
  onCancel,
}: NumericFilterProps) {
  const [operator, setOperator] = useState<FilterOperator>(FilterOperator.EQUALS);
  const [singleValue, setSingleValue] = useState<string>(
    Array.isArray(value) ? value[0].toString() : value?.toString() || ''
  );
  const [minValue, setMinValue] = useState<string>(
    Array.isArray(value) ? value[0].toString() : ''
  );
  const [maxValue, setMaxValue] = useState<string>(
    Array.isArray(value) ? value[1].toString() : ''
  );

  const handleApply = () => {
    if (operator === FilterOperator.BETWEEN) {
      if (!minValue || !maxValue) {
        alert('Please enter both min and max values');
        return;
      }
      onApply(operator, [parseFloat(minValue), parseFloat(maxValue)]);
    } else {
      if (!singleValue) {
        alert('Please enter a value');
        return;
      }
      onApply(operator, parseFloat(singleValue));
    }
  };

  const numericOperators = [
    { value: FilterOperator.EQUALS, label: 'Equals' },
    { value: FilterOperator.GT, label: 'Greater than' },
    { value: FilterOperator.GTE, label: 'Greater than or equal' },
    { value: FilterOperator.LT, label: 'Less than' },
    { value: FilterOperator.LTE, label: 'Less than or equal' },
    { value: FilterOperator.BETWEEN, label: 'Between' },
  ];

  return (
    <div style={styles.container}>
      <label style={styles.label}>Operator:</label>
      <select
        value={operator}
        onChange={(e) => setOperator(e.target.value as FilterOperator)}
        style={styles.select}
      >
        {numericOperators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      <div style={styles.valueGroup}>
        {operator === FilterOperator.BETWEEN ? (
          <>
            <div>
              <label style={styles.label}>Min:</label>
              <input
                type="number"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                style={styles.input}
                placeholder="Minimum value"
              />
            </div>
            <div>
              <label style={styles.label}>Max:</label>
              <input
                type="number"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                style={styles.input}
                placeholder="Maximum value"
              />
            </div>
          </>
        ) : (
          <>
            <label style={styles.label}>Value:</label>
            <input
              type="number"
              value={singleValue}
              onChange={(e) => setSingleValue(e.target.value)}
              style={styles.input}
              placeholder="Enter value"
            />
          </>
        )}
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
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  select: {
    width: '100%',
    padding: '6px',
    marginBottom: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
  },
  valueGroup: {
    marginBottom: '12px',
  },
  input: {
    width: '100%',
    padding: '6px',
    marginBottom: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
  },
  buttons: {
    display: 'flex',
    gap: '8px',
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
