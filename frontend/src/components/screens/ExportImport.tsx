import React, { useState, useRef } from 'react';

interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  data: Array<Record<string, string>>;
  errors: Array<{ row: number; error: string }>;
}

interface ColumnMapping {
  csvColumn: string;
  systemField: string;
}

export function ExportImport() {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [selectedEntity, setSelectedEntity] = useState<'products' | 'bills' | 'pos' | 'customers' | 'vendors'>('products');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const entityConfig: Record<string, { label: string; fields: string[]; sampleData: any[] }> = {
    products: {
      label: 'Products',
      fields: ['Product Name', 'Code', 'Category', 'Cost Price', 'Selling Price', 'Stock Level'],
      sampleData: [
        {
          'Product Name': 'Product A',
          'Code': 'PA-001',
          'Category': 'Electronics',
          'Cost Price': '5000',
          'Selling Price': '7500',
          'Stock Level': '100',
        },
        {
          'Product Name': 'Product B',
          'Code': 'PB-002',
          'Category': 'Hardware',
          'Cost Price': '2000',
          'Selling Price': '3000',
          'Stock Level': '250',
        },
      ],
    },
    bills: {
      label: 'Bills',
      fields: ['Bill Number', 'Customer', 'Amount', 'Date', 'Status', 'Payment Method'],
      sampleData: [
        {
          'Bill Number': 'BL-001',
          'Customer': 'ABC Corporation',
          'Amount': '50000',
          'Date': '2024-01-15',
          'Status': 'FINALIZED',
          'Payment Method': 'CASH',
        },
      ],
    },
    pos: {
      label: 'Purchase Orders',
      fields: ['PO Number', 'Vendor', 'Amount', 'Date', 'Status', 'Expected Delivery'],
      sampleData: [
        {
          'PO Number': 'PO-001',
          'Vendor': 'Supplier A',
          'Amount': '100000',
          'Date': '2024-01-10',
          'Status': 'APPROVED',
          'Expected Delivery': '2024-02-10',
        },
      ],
    },
    customers: {
      label: 'Customers',
      fields: ['Name', 'Email', 'Phone', 'Address', 'City', 'Credit Limit'],
      sampleData: [
        {
          'Name': 'ABC Corporation',
          'Email': 'info@abc.com',
          'Phone': '03001234567',
          'Address': '123 Main Street',
          'City': 'Karachi',
          'Credit Limit': '500000',
        },
      ],
    },
    vendors: {
      label: 'Vendors',
      fields: ['Name', 'Email', 'Phone', 'Address', 'City', 'Payment Terms'],
      sampleData: [
        {
          'Name': 'Supplier A',
          'Email': 'sales@supplieria.com',
          'Phone': '03019876543',
          'Address': '456 Commercial Road',
          'City': 'Lahore',
          'Payment Terms': '30 days',
        },
      ],
    },
  };

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  function handleExport() {
    setIsExporting(true);
    setTimeout(() => {
      const config = entityConfig[selectedEntity];
      const csvHeaders = config.fields.join(',');
      const csvData = config.sampleData.map((row) =>
        config.fields.map((field) => `"${row[field] || ''}"`.replace(/"/g, '""')).join(',')
      );

      const fullCsv = [csvHeaders, ...csvData].join('\n');
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(fullCsv));
      element.setAttribute('download', `${selectedEntity}-export-${new Date().toISOString().split('T')[0]}.csv`);
      element.click();

      showMessage('success', `Exported ${config.label} successfully!`);
      setIsExporting(false);
    }, 500);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showMessage('error', 'Please select a CSV file');
      return;
    }

    setImportFile(file);
    parseCSV(file);
  }

  function parseCSV(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const data = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const obj: Record<string, string> = {};
          headers.forEach((header, idx) => {
            obj[header] = values[idx] || '';
          });
          return obj;
        });

        const config = entityConfig[selectedEntity];
        const errors: Array<{ row: number; error: string }> = [];
        let validRows = 0;

        data.forEach((row, idx) => {
          const missingFields = config.fields.filter((field) => !row[field] || row[field].trim() === '');
          if (missingFields.length > 0) {
            errors.push({
              row: idx + 2,
              error: `Missing required fields: ${missingFields.join(', ')}`,
            });
          } else {
            validRows++;
          }
        });

        const mappings = headers.map((header) => ({
          csvColumn: header,
          systemField: config.fields.includes(header) ? header : '',
        }));

        setImportPreview({
          totalRows: data.length,
          validRows,
          invalidRows: errors.length,
          data,
          errors,
        });
        setColumnMappings(mappings);

        if (errors.length === 0) {
          showMessage('success', `File parsed successfully! ${validRows} rows ready to import.`);
        } else {
          showMessage('error', `File parsed with ${errors.length} error(s). Please review before importing.`);
        }
      } catch (error) {
        showMessage('error', 'Failed to parse CSV file');
        console.error(error);
      }
    };
    reader.readAsText(file);
  }

  function updateColumnMapping(index: number, systemField: string) {
    const updated = [...columnMappings];
    updated[index] = { ...updated[index], systemField };
    setColumnMappings(updated);
  }

  function handleImport() {
    if (!importPreview || importPreview.validRows === 0) {
      showMessage('error', 'No valid rows to import');
      return;
    }

    setIsImporting(true);
    setTimeout(() => {
      // Simulate import
      const config = entityConfig[selectedEntity];
      console.log(`Importing ${importPreview.validRows} ${config.label.toLowerCase()}...`);
      showMessage('success', `Successfully imported ${importPreview.validRows} ${config.label.toLowerCase()}!`);
      setIsImporting(false);
      setImportFile(null);
      setImportPreview(null);
      setColumnMappings([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 1000);
  }

  const config = entityConfig[selectedEntity];

  return (
    <div style={styles.container}>
      <h2>📤 Export & Import Data</h2>

      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
        }}>
          {message.text}
        </div>
      )}

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('export')}
          style={{ ...styles.tabBtn, ...(activeTab === 'export' ? styles.tabBtnActive : {}) }}
        >
          📥 Export Data
        </button>
        <button
          onClick={() => setActiveTab('import')}
          style={{ ...styles.tabBtn, ...(activeTab === 'import' ? styles.tabBtnActive : {}) }}
        >
          📤 Import Data
        </button>
      </div>

      {activeTab === 'export' && (
        <div style={styles.section}>
          <h3>Export Data to CSV</h3>

          <div style={styles.formGroup}>
            <label>Select Entity to Export:</label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value as any)}
              style={styles.select}
            >
              {Object.entries(entityConfig).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.infoBox}>
            <h4>Export Information</h4>
            <p><strong>Entity:</strong> {config.label}</p>
            <p><strong>Format:</strong> CSV (Comma Separated Values)</p>
            <p><strong>Columns:</strong> {config.fields.join(', ')}</p>
            <p><strong>Sample Size:</strong> {config.sampleData.length} rows</p>
          </div>

          <div style={styles.previewSection}>
            <h4>Sample Preview</h4>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {config.fields.map((field) => (
                      <th key={field} style={styles.th}>{field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.sampleData.map((row, idx) => (
                    <tr key={idx}>
                      {config.fields.map((field) => (
                        <td key={field} style={styles.td}>{row[field]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{ ...styles.primaryBtn, opacity: isExporting ? 0.6 : 1 }}
          >
            {isExporting ? 'Exporting...' : '📥 Download CSV'}
          </button>
        </div>
      )}

      {activeTab === 'import' && (
        <div style={styles.section}>
          <h3>Import Data from CSV</h3>

          <div style={styles.formGroup}>
            <label>Select Entity to Import:</label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value as any)}
              style={styles.select}
            >
              {Object.entries(entityConfig).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.uploadBox}>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={styles.uploadBtn}
            >
              📁 Choose CSV File
            </button>
            <p style={styles.uploadHelp}>or drag and drop a CSV file here</p>
            {importFile && <p style={styles.fileName}>File: {importFile.name}</p>}
          </div>

          {importPreview && (
            <>
              <div style={styles.statusBox}>
                <div style={styles.statusItem}>
                  <span>Total Rows:</span>
                  <strong>{importPreview.totalRows}</strong>
                </div>
                <div style={styles.statusItem}>
                  <span>Valid Rows:</span>
                  <strong style={{ color: '#28a745' }}>{importPreview.validRows}</strong>
                </div>
                <div style={styles.statusItem}>
                  <span>Invalid Rows:</span>
                  <strong style={{ color: importPreview.invalidRows > 0 ? '#e74c3c' : '#28a745' }}>
                    {importPreview.invalidRows}
                  </strong>
                </div>
              </div>

              <div style={styles.mappingSection}>
                <h4>Column Mapping</h4>
                <p style={styles.mappingHelp}>Map CSV columns to system fields:</p>
                <div style={styles.mappingGrid}>
                  {columnMappings.map((mapping, idx) => (
                    <div key={idx} style={styles.mappingRow}>
                      <label style={styles.mappingLabel}>{mapping.csvColumn}</label>
                      <select
                        value={mapping.systemField}
                        onChange={(e) => updateColumnMapping(idx, e.target.value)}
                        style={styles.mappingSelect}
                      >
                        <option value="">-- Select Field --</option>
                        {config.fields.map((field) => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {importPreview.errors.length > 0 && (
                <div style={styles.errorsSection}>
                  <h4>Validation Errors</h4>
                  <div style={styles.errorsList}>
                    {importPreview.errors.slice(0, 5).map((error, idx) => (
                      <div key={idx} style={styles.errorItem}>
                        <strong>Row {error.row}:</strong> {error.error}
                      </div>
                    ))}
                    {importPreview.errors.length > 5 && (
                      <div style={styles.errorItem}>
                        ... and {importPreview.errors.length - 5} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={styles.previewSection}>
                <h4>Data Preview (First 5 rows)</h4>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {columnMappings.slice(0, 5).map((mapping, idx) => (
                          <th key={idx} style={styles.th}>{mapping.csvColumn}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.data.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          {columnMappings.slice(0, 5).map((mapping, cidx) => (
                            <td key={cidx} style={styles.td}>{row[mapping.csvColumn]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={styles.importActions}>
                <button
                  onClick={() => {
                    setImportFile(null);
                    setImportPreview(null);
                    setColumnMappings([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  style={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting || importPreview.validRows === 0}
                  style={{
                    ...styles.primaryBtn,
                    opacity: isImporting || importPreview.validRows === 0 ? 0.6 : 1,
                  }}
                >
                  {isImporting ? 'Importing...' : `📤 Import ${importPreview.validRows} Rows`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  message: {
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '1px solid #ddd',
  },
  tabBtn: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
  },
  tabBtnActive: {
    borderBottomColor: '#667eea',
    color: '#667eea',
  },
  section: { marginBottom: '30px' },
  formGroup: {
    marginBottom: '20px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    maxWidth: '300px',
  },
  infoBox: {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    marginBottom: '20px',
  },
  previewSection: { marginBottom: '20px' },
  tableWrapper: { overflowX: 'auto', border: '1px solid #ddd', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' },
  th: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: '13px' },
  primaryBtn: {
    padding: '12px 24px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  secondaryBtn: {
    padding: '12px 24px',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  uploadBox: {
    border: '2px dashed #667eea',
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    marginBottom: '20px',
  },
  uploadBtn: {
    padding: '10px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  uploadHelp: { color: '#666', marginTop: '10px', fontSize: '13px' },
  fileName: { marginTop: '10px', color: '#28a745', fontWeight: '500' },
  statusBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  statusItem: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  mappingSection: { marginBottom: '20px' },
  mappingHelp: { color: '#666', fontSize: '13px', marginBottom: '12px' },
  mappingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px',
  },
  mappingRow: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  mappingLabel: { fontSize: '13px', fontWeight: '500', color: '#333' },
  mappingSelect: {
    padding: '8px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  errorsSection: {
    backgroundColor: '#f8d7da',
    padding: '16px',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb',
  },
  errorsList: {},
  errorItem: {
    padding: '8px 0',
    fontSize: '13px',
    color: '#721c24',
  },
  importActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
};
