import React, { useState, useEffect } from 'react';
import { SearchBox } from '../filters/SearchBox';
import { FilterPanel } from '../filters/FilterPanel';
import { FilterSummary } from '../filters/FilterSummary';
import {
  FilterOperator,
  DataType,
  FilterOperatorDto,
  SearchRequestDto,
  ColumnValueDto,
} from '../../types/filters';
import { apiClient } from '../../services/api';

interface Bill {
  id: number;
  bill_number: string;
  customer_name: string;
  amount: number;
  bill_date: string;
  status: string;
  payment_method: string;
  employee_name: string;
}

interface ColumnConfig {
  name: string;
  label: string;
  dataType: DataType;
  values?: ColumnValueDto[];
}

export function BillsScreen() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);

  const [primaryFilter, setPrimaryFilter] = useState<FilterOperatorDto | undefined>();
  const [columnFilters, setColumnFilters] = useState<FilterOperatorDto[]>([]);
  const [columnValues, setColumnValues] = useState<Record<string, ColumnValueDto[]>>({});

  const columns: ColumnConfig[] = [
    {
      name: 'bill_number',
      label: 'Bill #',
      dataType: DataType.TEXT,
    },
    {
      name: 'customer_name',
      label: 'Customer',
      dataType: DataType.TEXT,
    },
    {
      name: 'amount',
      label: 'Amount',
      dataType: DataType.NUMERIC,
    },
    {
      name: 'bill_date',
      label: 'Date',
      dataType: DataType.DATE,
    },
    {
      name: 'status',
      label: 'Status',
      dataType: DataType.ENUM,
    },
  ];

  useEffect(() => {
    fetchBills();
    preloadColumnValues();
  }, []);

  useEffect(() => {
    fetchBills();
  }, [primaryFilter, columnFilters, skip]);

  async function preloadColumnValues() {
    try {
      const [statusVals, paymentVals] = await Promise.all([
        apiClient.getBillColumnValues('status'),
        apiClient.getBillColumnValues('payment_method'),
      ]);

      setColumnValues((prev) => ({
        ...prev,
        status: statusVals || [],
        payment_method: paymentVals || [],
      }));
    } catch (error) {
      console.error('Failed to load column values:', error);
    }
  }

  async function fetchBills() {
    try {
      setLoading(true);
      const request: SearchRequestDto = {
        skip,
        take,
        primaryFilter,
        columnFilters: columnFilters.length > 0 ? columnFilters : undefined,
      };

      const result = await apiClient.searchBills(request);
      setBills(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to search bills:', error);
    } finally {
      setLoading(false);
    }
  }

  const handlePrimarySearch = (value: string, operator: FilterOperator) => {
    setPrimaryFilter({
      field: 'bill_number',
      operator,
      value,
      dataType: DataType.TEXT,
    });
    setSkip(0);
  };

  const handleColumnFilter = (columnName: string, operator: FilterOperator, value: any) => {
    const newFilter: FilterOperatorDto = {
      field: columnName,
      operator,
      value,
      dataType: getDataType(columnName),
    };

    const existingIdx = columnFilters.findIndex((f) => f.field === columnName);
    if (existingIdx >= 0) {
      const updated = [...columnFilters];
      updated[existingIdx] = newFilter;
      setColumnFilters(updated);
    } else {
      setColumnFilters([...columnFilters, newFilter]);
    }
    setSkip(0);
  };

  const handleRemovePrimaryFilter = () => {
    setPrimaryFilter(undefined);
    setSkip(0);
  };

  const handleRemoveColumnFilter = (index: number) => {
    setColumnFilters((prev) => prev.filter((_, i) => i !== index));
    setSkip(0);
  };

  function getDataType(fieldName: string): DataType {
    const col = columns.find((c) => c.name === fieldName);
    return col?.dataType || DataType.TEXT;
  }

  const filterableColumns = columns.map((col) => ({
    ...col,
    values: columnValues[col.name],
  }));

  return (
    <div style={styles.container}>
      <h2>📄 Bills</h2>

      <SearchBox
        onSearch={handlePrimarySearch}
        placeholder="Search by bill number..."
      />

      <FilterPanel
        columns={filterableColumns}
        onFilterApply={handleColumnFilter}
      />

      <FilterSummary
        primaryFilter={primaryFilter}
        columnFilters={columnFilters}
        onRemovePrimary={handleRemovePrimaryFilter}
        onRemoveColumn={handleRemoveColumnFilter}
      />

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : bills.length === 0 ? (
        <p style={styles.noResults}>No bills found</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Bill #</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Payment</th>
                  <th style={styles.th}>Employee</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} style={styles.tr}>
                    <td style={styles.td}>{bill.bill_number}</td>
                    <td style={styles.td}>{bill.customer_name}</td>
                    <td style={styles.td}>Rs {bill.amount.toLocaleString()}</td>
                    <td style={styles.td}>
                      {new Date(bill.bill_date).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <span style={getStatusStyle(bill.status)}>
                        {bill.status}
                      </span>
                    </td>
                    <td style={styles.td}>{bill.payment_method}</td>
                    <td style={styles.td}>{bill.employee_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.pagination}>
            <div style={styles.info}>
              Showing {skip + 1} to {Math.min(skip + take, total)} of {total}
              results
            </div>
            <div style={styles.buttons}>
              <button
                onClick={() => setSkip(Math.max(0, skip - take))}
                disabled={skip === 0}
                style={{
                  ...styles.paginationBtn,
                  ...(skip === 0 ? styles.disabled : {}),
                }}
              >
                ← Previous
              </button>
              <button
                onClick={() => setSkip(skip + take)}
                disabled={skip + take >= total}
                style={{
                  ...styles.paginationBtn,
                  ...(skip + take >= total ? styles.disabled : {}),
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getStatusStyle(status: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: '500',
  };

  switch (status) {
    case 'APPROVED':
      return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
    case 'PENDING':
      return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
    case 'REJECTED':
      return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
    default:
      return { ...baseStyle, backgroundColor: '#e2e3e5', color: '#383d41' };
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '20px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  th: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
  },
  tr: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '10px 12px',
    fontSize: '13px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    border: '1px solid #eee',
  },
  info: {
    fontSize: '12px',
    color: '#666',
  },
  buttons: {
    display: 'flex',
    gap: '8px',
  },
  paginationBtn: {
    padding: '8px 16px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  disabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
};
