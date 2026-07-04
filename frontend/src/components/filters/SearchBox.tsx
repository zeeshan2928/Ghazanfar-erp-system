import React, { useState } from 'react';
import { FilterOperator, DataType } from '../../types/filters';

interface SearchBoxProps {
  onSearch: (value: string, operator: FilterOperator) => void;
  placeholder?: string;
  dataType?: DataType;
}

export function SearchBox({
  onSearch,
  placeholder = 'Search...',
  dataType = DataType.TEXT,
}: SearchBoxProps) {
  const [value, setValue] = useState('');
  const [operator, setOperator] = useState<FilterOperator>(
    dataType === DataType.TEXT ? FilterOperator.IS_LIKE : FilterOperator.EQUALS
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value, operator);
    }
  };

  const textOperators = [
    { value: FilterOperator.IS_LIKE, label: 'Fuzzy Match' },
    { value: FilterOperator.CONTAINS, label: 'Contains' },
    { value: FilterOperator.EQUALS, label: 'Exact Match' },
    { value: FilterOperator.BEGINS_WITH, label: 'Starts With' },
  ];

  return (
    <form onSubmit={handleSearch} style={styles.form}>
      <div style={styles.container}>
        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value as FilterOperator)}
          style={styles.operatorSelect}
          title="Filter operator"
        >
          {textOperators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={styles.input}
        />

        <button type="submit" style={styles.button}>
          🔍 Search
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    marginBottom: '20px',
  },
  container: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  operatorSelect: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};
