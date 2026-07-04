import React, { useState } from 'react';
import { FilterOperator } from '../../types/filters';

interface DateFilterProps {
  field: string;
  value: string | [string, string] | undefined;
  onApply: (operator: FilterOperator, value: any) => void;
  onCancel: () => void;
}

export function DateFilter({
  field,
  value,
  onApply,
  onCancel,
}: DateFilterProps) {
  const [operator, setOperator] = useState<FilterOperator>(FilterOperator.EQUALS);
  const [singleDate, setSingleDate] = useState<string>(
    Array.isArray(value) ? value[0] : value || ''
  );
  const [startDate, setStartDate] = useState<string>(
    Array.isArray(value) ? value[0] : ''
  );
  const [endDate, setEndDate] = useState<string>(
    Array.isArray(value) ? value[1] : ''
  );

  const handleApply = () => {
    if (operator === FilterOperator.BETWEEN) {
      if (!startDate || !endDate) {
        alert('Please enter both start and end dates');
        return;
      }
      onApply(operator, [startDate, endDate]);
    } else {
      if (!singleDate) {
        alert('Please enter a date');
        return;
      }
      onApply(operator, singleDate);
    }
  };

  const dateOperators = [
    { value: FilterOperator.EQUALS, label: 'On' },
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
        {dateOperators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      <div style={styles.valueGroup}>
        {operator === FilterOperator.BETWEEN ? (
          <>
            <div>
              <label style={styles.label}>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.input}
              />
            </div>
          </>
        ) : (
          <>
            <label style={styles.label}>Date:</label>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              style={styles.input}
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
