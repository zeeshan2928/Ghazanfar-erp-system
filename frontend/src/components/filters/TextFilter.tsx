import React, { useState } from 'react';
import { FilterOperator } from '../../types/filters';

interface TextFilterProps {
  field: string;
  value: string | undefined;
  onApply: (operator: FilterOperator, value: any) => void;
  onCancel: () => void;
}

export function TextFilter({
  field,
  value,
  onApply,
  onCancel,
}: TextFilterProps) {
  const [operator, setOperator] = useState<FilterOperator>(
    FilterOperator.CONTAINS
  );
  const [textValue, setTextValue] = useState<string>(value || '');

  const handleApply = () => {
    if (!textValue.trim()) {
      alert('Please enter a value');
      return;
    }
    onApply(operator, textValue);
  };

  const textOperators = [
    { value: FilterOperator.EQUALS, label: 'Equals' },
    { value: FilterOperator.DOES_NOT_EQUAL, label: 'Does not equal' },
    { value: FilterOperator.CONTAINS, label: 'Contains' },
    { value: FilterOperator.DOES_NOT_CONTAIN, label: 'Does not contain' },
    { value: FilterOperator.IS_LIKE, label: 'Fuzzy match' },
    { value: FilterOperator.IS_NOT_LIKE, label: 'Not fuzzy match' },
    { value: FilterOperator.BEGINS_WITH, label: 'Starts with' },
    { value: FilterOperator.ENDS_WITH, label: 'Ends with' },
  ];

  return (
    <div style={styles.container}>
      <label style={styles.label}>Operator:</label>
      <select
        value={operator}
        onChange={(e) => setOperator(e.target.value as FilterOperator)}
        style={styles.select}
      >
        {textOperators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      <label style={styles.label}>Value:</label>
      <input
        type="text"
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        style={styles.input}
        placeholder={`Enter text to ${operator}`}
      />

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
  input: {
    width: '100%',
    padding: '6px',
    marginBottom: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    boxSizing: 'border-box',
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
