import React, { useState, useEffect } from 'react';
import { SearchBox } from '../filters/SearchBox';
import { FilterPanel } from '../filters/FilterPanel';
import { FilterSummary } from '../filters/FilterSummary';
import { FilterOperator, DataType, FilterOperatorDto, SearchRequestDto, ColumnValueDto } from '../../types/filters';
import { apiClient } from '../../services/api';

interface InventoryItem {
  id: number;
  stock_id: string;
  product_name: string;
  warehouse_name: string;
  quantity: number;
  date_received: string;
}

export function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);
  const [primaryFilter, setPrimaryFilter] = useState<FilterOperatorDto | undefined>();
  const [columnFilters, setColumnFilters] = useState<FilterOperatorDto[]>([]);
  const [columnValues, setColumnValues] = useState<Record<string, ColumnValueDto[]>>({});

  const columns = [
    { name: 'product_name', label: 'Product', dataType: DataType.TEXT },
    { name: 'warehouse', label: 'Warehouse', dataType: DataType.ENUM },
    { name: 'quantity', label: 'Quantity', dataType: DataType.NUMERIC },
    { name: 'date_received', label: 'Date', dataType: DataType.DATE },
  ];

  useEffect(() => {
    fetchInventory();
    preloadColumnValues();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [primaryFilter, columnFilters, skip]);

  async function preloadColumnValues() {
    try {
      const [warehouseVals] = await Promise.all([
        apiClient.getInventoryColumnValues('warehouse'),
      ]);
      setColumnValues((prev) => ({ ...prev, warehouse: warehouseVals || [] }));
    } catch (error) {
      console.error('Failed to load values:', error);
    }
  }

  async function fetchInventory() {
    try {
      setLoading(true);
      const request: SearchRequestDto = { skip, take, primaryFilter, columnFilters: columnFilters.length > 0 ? columnFilters : undefined };
      const result = await apiClient.searchInventory(request);
      setItems(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setLoading(false);
    }
  }

  const handlePrimarySearch = (value: string, operator: FilterOperator) => {
    setPrimaryFilter({ field: 'product_name', operator, value, dataType: DataType.TEXT });
    setSkip(0);
  };

  const handleColumnFilter = (columnName: string, operator: FilterOperator, value: any) => {
    const newFilter: FilterOperatorDto = {
      field: columnName,
      operator,
      value,
      dataType: columns.find((c) => c.name === columnName)?.dataType || DataType.TEXT,
    };
    const idx = columnFilters.findIndex((f) => f.field === columnName);
    if (idx >= 0) {
      const updated = [...columnFilters];
      updated[idx] = newFilter;
      setColumnFilters(updated);
    } else {
      setColumnFilters([...columnFilters, newFilter]);
    }
    setSkip(0);
  };

  const filterableColumns = columns.map((col) => ({ ...col, values: columnValues[col.name] }));

  return (
    <div style={styles.container}>
      <h2>📊 Inventory</h2>
      <SearchBox onSearch={handlePrimarySearch} placeholder="Search by product..." />
      <FilterPanel columns={filterableColumns} onFilterApply={handleColumnFilter} />
      <FilterSummary
        primaryFilter={primaryFilter}
        columnFilters={columnFilters}
        onRemovePrimary={() => { setPrimaryFilter(undefined); setSkip(0); }}
        onRemoveColumn={(idx) => { setColumnFilters(prev => prev.filter((_, i) => i !== idx)); setSkip(0); }}
      />

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : items.length === 0 ? (
        <p style={styles.noResults}>No items found</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Stock ID</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Warehouse</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.stock_id}</td>
                    <td style={styles.td}>{item.product_name}</td>
                    <td style={styles.td}>{item.warehouse_name}</td>
                    <td style={styles.td}>{item.quantity}</td>
                    <td style={styles.td}>{new Date(item.date_received).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.pagination}>
            <div style={styles.info}>Showing {skip + 1} to {Math.min(skip + take, total)} of {total}</div>
            <div style={styles.buttons}>
              <button onClick={() => setSkip(Math.max(0, skip - take))} disabled={skip === 0} style={{...styles.btn, ...(skip === 0 ? styles.disabled : {})}}>← Previous</button>
              <button onClick={() => setSkip(skip + take)} disabled={skip + take >= total} style={{...styles.btn, ...(skip + take >= total ? styles.disabled : {})}}>Next →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  noResults: { textAlign: 'center', padding: '40px', color: '#999' },
  tableWrapper: { overflowX: 'auto', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' },
  th: { padding: '12px', backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left', fontSize: '12px', fontWeight: '600' },
  td: { padding: '10px 12px', fontSize: '13px', borderBottom: '1px solid #eee' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #eee' },
  info: { fontSize: '12px', color: '#666' },
  buttons: { display: 'flex', gap: '8px' },
  btn: { padding: '8px 16px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  disabled: { backgroundColor: '#ccc', cursor: 'not-allowed' },
};
