import React, { useState, useEffect } from 'react';
import { SearchBox } from '../filters/SearchBox';
import { FilterPanel } from '../filters/FilterPanel';
import { FilterSummary } from '../filters/FilterSummary';
import { Pagination } from '../Pagination';
import {
  FilterOperator,
  DataType,
  FilterOperatorDto,
  SearchRequestDto,
  ColumnValueDto,
} from '../../types/filters';
import { apiClient } from '../../services/api';

interface Product {
  id: number;
  name: string;
  code: string;
  brand_name: string;
  category_name: string;
  cost_price: number;
  stock_level: string;
}

interface ColumnConfig {
  name: string;
  label: string;
  dataType: DataType;
  values?: ColumnValueDto[];
}

export function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);

  const [primaryFilter, setPrimaryFilter] = useState<FilterOperatorDto | undefined>();
  const [columnFilters, setColumnFilters] = useState<FilterOperatorDto[]>([]);
  const [columnValues, setColumnValues] = useState<Record<string, ColumnValueDto[]>>({});

  const columns: ColumnConfig[] = [
    { name: 'name', label: 'Product', dataType: DataType.TEXT },
    { name: 'code', label: 'Code', dataType: DataType.TEXT },
    { name: 'cost_price', label: 'Cost', dataType: DataType.NUMERIC },
    { name: 'stock_level', label: 'Stock', dataType: DataType.ENUM },
  ];

  useEffect(() => {
    fetchProducts();
    preloadColumnValues();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [primaryFilter, columnFilters, skip]);

  async function preloadColumnValues() {
    try {
      const [stockVals] = await Promise.all([
        apiClient.getProductColumnValues('stock_level'),
      ]);
      setColumnValues((prev) => ({
        ...prev,
        stock_level: stockVals || [],
      }));
    } catch (error) {
      console.error('Failed to load column values:', error);
    }
  }

  async function fetchProducts() {
    try {
      setLoading(true);
      const request: SearchRequestDto = {
        skip,
        take,
        primaryFilter,
        columnFilters: columnFilters.length > 0 ? columnFilters : undefined,
      };
      const result = await apiClient.searchProducts(request);
      setProducts(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to search products:', error);
    } finally {
      setLoading(false);
    }
  }

  const handlePrimarySearch = (value: string, operator: FilterOperator) => {
    setPrimaryFilter({
      field: 'name',
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
      <h2>📦 Products</h2>
      <SearchBox onSearch={handlePrimarySearch} placeholder="Search by product name..." />
      <FilterPanel columns={filterableColumns} onFilterApply={handleColumnFilter} />
      <FilterSummary
        primaryFilter={primaryFilter}
        columnFilters={columnFilters}
        onRemovePrimary={() => { setPrimaryFilter(undefined); setSkip(0); }}
        onRemoveColumn={(idx) => { setColumnFilters(prev => prev.filter((_, i) => i !== idx)); setSkip(0); }}
      />

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : products.length === 0 ? (
        <p style={styles.noResults}>No products found</p>
      ) : (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Cost</th>
                  <th style={styles.th}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.name}</td>
                    <td style={styles.td}>{p.code}</td>
                    <td style={styles.td}>Rs {p.cost_price.toLocaleString()}</td>
                    <td style={styles.td}>
                      <span style={getStockStyle(p.stock_level)}>{p.stock_level}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={Math.floor(skip / take) + 1}
            totalPages={Math.ceil(total / take)}
            totalItems={total}
            itemsPerPage={take}
            onPageChange={(page) => setSkip((page - 1) * take)}
          />
        </>
      )}
    </div>
  );
}

function getStockStyle(level: string): React.CSSProperties {
  const base: React.CSSProperties = { padding: '4px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: '500' };
  if (level === 'low') return { ...base, backgroundColor: '#fff3cd', color: '#856404' };
  if (level === 'out') return { ...base, backgroundColor: '#f8d7da', color: '#721c24' };
  if (level === 'high') return { ...base, backgroundColor: '#d4edda', color: '#155724' };
  return { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  noResults: { textAlign: 'center', padding: '40px', color: '#999' },
  tableWrapper: { overflowX: 'auto', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' },
  th: { padding: '12px', backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left', fontSize: '12px', fontWeight: '600' },
  td: { padding: '10px 12px', fontSize: '13px', borderBottom: '1px solid #eee' },
};
