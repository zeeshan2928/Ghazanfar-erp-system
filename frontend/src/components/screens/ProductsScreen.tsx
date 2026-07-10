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

interface VendorOption {
  id: number;
  name: string;
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
  const [take, setTake] = useState(20);

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
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [primaryFilter, columnFilters, skip, take]);

  const [vendors, setVendors] = useState<VendorOption[]>([]);

  async function fetchVendors() {
    try {
      const result = await apiClient.getVendors(0, 100);
      setVendors((result.data || []).map((v: any) => ({ id: v.id, name: v.name })));
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  }

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

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    cost_price: '',
    minimum_quantity: '',
    reorder_quantity: '',
    primary_vendor_id: '',
  });
  const [newProductMediaFiles, setNewProductMediaFiles] = useState<File[]>([]);

  async function handleAddProduct() {
    try {
      const result = await apiClient.createProduct({
        code: formData.code,
        name: formData.name,
        cost_price: parseInt(formData.cost_price) || 0,
      });
      console.log('✅ Product created:', result);

      if (formData.minimum_quantity || formData.reorder_quantity || formData.primary_vendor_id) {
        await apiClient.setProductReorderParams(result.id, {
          minimumQuantity: parseInt(formData.minimum_quantity) || 0,
          reorderQuantity: parseInt(formData.reorder_quantity) || 0,
          primaryVendorId: formData.primary_vendor_id ? parseInt(formData.primary_vendor_id) : undefined,
        });
      }

      for (const file of newProductMediaFiles) {
        await apiClient.uploadProductMedia(result.id, file);
      }

      setFormData({ code: '', name: '', cost_price: '', minimum_quantity: '', reorder_quantity: '', primary_vendor_id: '' });
      setNewProductMediaFiles([]);
      setShowAddForm(false);
      await fetchProducts();
      alert('✅ Product created successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create product';
      console.error('❌ Error creating product:', errorMsg, err);
      alert('❌ Error: ' + errorMsg);
    }
  }

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    minimum_quantity: '',
    reorder_quantity: '',
    primary_vendor_id: '',
  });

  async function openEditReorder(productId: number) {
    try {
      const product = await apiClient.getProductById(productId);
      setEditFormData({
        minimum_quantity: product.minimum_quantity != null ? String(product.minimum_quantity) : '',
        reorder_quantity: product.reorder_quantity != null ? String(product.reorder_quantity) : '',
        primary_vendor_id: product.primary_vendor_id != null ? String(product.primary_vendor_id) : '',
      });
      setEditingProductId(productId);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load product';
      alert('❌ Error: ' + errorMsg);
    }
  }

  async function handleSaveReorderSettings() {
    if (editingProductId == null) return;
    try {
      await apiClient.setProductReorderParams(editingProductId, {
        minimumQuantity: parseInt(editFormData.minimum_quantity) || 0,
        reorderQuantity: parseInt(editFormData.reorder_quantity) || 0,
        primaryVendorId: editFormData.primary_vendor_id ? parseInt(editFormData.primary_vendor_id) : undefined,
      });
      setEditingProductId(null);
      await fetchProducts();
      alert('✅ Reorder settings saved!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save reorder settings';
      alert('❌ Error: ' + errorMsg);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>📦 Products</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={styles.addBtn}
        >
          {showAddForm ? '❌ Cancel' : '➕ Add Product'}
        </button>
      </div>

      {showAddForm && (
        <div style={styles.formContainer}>
          <input
            type="text"
            placeholder="Product Code (e.g., PHONE001)"
            value={formData.code}
            onChange={(e) => setFormData({...formData, code: e.target.value})}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Product Name (e.g., Samsung Phone)"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Cost Price (e.g., 50000)"
            value={formData.cost_price}
            onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Min Quantity (reorder threshold)"
            value={formData.minimum_quantity}
            onChange={(e) => setFormData({...formData, minimum_quantity: e.target.value})}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Reorder Quantity"
            value={formData.reorder_quantity}
            onChange={(e) => setFormData({...formData, reorder_quantity: e.target.value})}
            style={styles.input}
          />
          <select
            value={formData.primary_vendor_id}
            onChange={(e) => setFormData({...formData, primary_vendor_id: e.target.value})}
            style={styles.input}
          >
            <option value="">— No primary vendor —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
            multiple
            onChange={(e) => setNewProductMediaFiles(Array.from(e.target.files || []))}
            style={styles.input}
          />
          <button onClick={handleAddProduct} style={styles.submitBtn}>Save Product</button>
        </div>
      )}

      {editingProductId !== null && (
        <div style={styles.formContainer}>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Reorder Settings</span>
          <input
            type="number"
            placeholder="Min Quantity (reorder threshold)"
            value={editFormData.minimum_quantity}
            onChange={(e) => setEditFormData({...editFormData, minimum_quantity: e.target.value})}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Reorder Quantity"
            value={editFormData.reorder_quantity}
            onChange={(e) => setEditFormData({...editFormData, reorder_quantity: e.target.value})}
            style={styles.input}
          />
          <select
            value={editFormData.primary_vendor_id}
            onChange={(e) => setEditFormData({...editFormData, primary_vendor_id: e.target.value})}
            style={styles.input}
          >
            <option value="">— No primary vendor —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <button onClick={handleSaveReorderSettings} style={styles.submitBtn}>Save</button>
          <button onClick={() => setEditingProductId(null)} style={styles.addBtn}>Cancel</button>
        </div>
      )}

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
                  <th style={styles.th}></th>
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
                    <td style={styles.td}>
                      <button onClick={() => openEditReorder(p.id)} style={styles.reorderBtn}>
                        ✏️ Reorder Settings
                      </button>
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
            onItemsPerPageChange={(newTake) => setTake(newTake)}
            allowCustomPageSize={true}
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  addBtn: { padding: '10px 20px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '600' },
  formContainer: { backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-end' },
  input: { flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' },
  submitBtn: { padding: '10px 30px', backgroundColor: '#43e97b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  reorderBtn: { padding: '6px 10px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  noResults: { textAlign: 'center', padding: '40px', color: '#999' },
  tableWrapper: { overflowX: 'auto', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' },
  th: { padding: '12px', backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left', fontSize: '12px', fontWeight: '600' },
  td: { padding: '10px 12px', fontSize: '13px', borderBottom: '1px solid #eee' },
};
