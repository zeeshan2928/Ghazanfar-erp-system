import React, { useRef, useState } from 'react';

export interface WizardFieldDef {
  field: string;
  label: string;
  required: boolean;
}

interface DetectedColumn {
  index: number;
  header: string;
  sampleValues: string[];
}

interface AnalyzeResult {
  headerRowIndex: number;
  columns: DetectedColumn[];
  mapping: Record<string, number>;
  structure: 'FLAT' | 'MULTI_ROW';
  unmappedRequired: string[];
  matchedTemplate: boolean;
  preview: any[];
}

interface ImportWizardProps {
  title: string;
  fields: WizardFieldDef[];
  analyzeFn: (fd: FormData) => Promise<AnalyzeResult>;
  importFn: (fd: FormData) => Promise<any>;
  onDone: () => void;
}

// Format-agnostic import UI: pick a file -> the system studies it and
// proposes a column mapping -> you confirm/adjust -> import. Works for any
// layout; the confirmed mapping is remembered server-side for next time.
export function ImportWizard({ title, fields, analyzeFn, importFn, onDone }: ImportWizardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | ''>>({});
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
    setMapping({});
    setSummary(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    setSummary(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await analyzeFn(fd);
      setResult(res);
      setMapping({ ...res.mapping });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not read this file.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImport() {
    if (!file || !result) return;
    setImporting(true);
    setError('');
    try {
      const cleanMapping: Record<string, number> = {};
      for (const [k, v] of Object.entries(mapping)) if (v !== '' && v !== undefined) cleanMapping[k] = Number(v);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mapping', JSON.stringify(cleanMapping));
      fd.append('structure', result.structure);
      fd.append('headerRowIndex', String(result.headerRowIndex));
      const res = await importFn(fd);
      setSummary(res);
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  const missingRequired = fields.filter(f => f.required && (mapping[f.field] === '' || mapping[f.field] === undefined));

  return (
    <div style={styles.card}>
      <h4 style={styles.h4}>{title}</h4>

      <div style={styles.row}>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setSummary(null); }}
        />
        <button style={styles.btn} onClick={() => fileRef.current?.click()}>📁 Choose File</button>
        {file && <span style={styles.fileName}>{file.name}</span>}
        {file && !result && (
          <button style={styles.btnPrimary} onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? 'Studying file…' : 'Study file →'}
          </button>
        )}
        {result && <button style={styles.btnGhost} onClick={reset}>Start over</button>}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {result && !summary && (
        <>
          <div style={styles.note}>
            {result.matchedTemplate
              ? '✓ Recognized this layout from a previous import — mapping pre-filled. Adjust if needed.'
              : 'Auto-detected the columns below. Please confirm or adjust each, then import.'}
            {' '}Layout: <strong>{result.structure === 'MULTI_ROW' ? 'multi-row per bill' : 'one row per line'}</strong>.
          </div>

          <table style={styles.table}>
            <thead>
              <tr><th style={styles.th}>Field</th><th style={styles.th}>Mapped column</th><th style={styles.th}>Sample values</th></tr>
            </thead>
            <tbody>
              {fields.map(f => {
                const selected = mapping[f.field];
                const col = typeof selected === 'number' ? result.columns[selected] : undefined;
                return (
                  <tr key={f.field}>
                    <td style={styles.td}>
                      {f.label}{f.required && <span style={{ color: '#b91c1c' }}> *</span>}
                    </td>
                    <td style={styles.td}>
                      <select
                        style={styles.select}
                        value={selected === undefined ? '' : String(selected)}
                        onChange={e => setMapping(m => ({ ...m, [f.field]: e.target.value === '' ? '' : Number(e.target.value) }))}
                      >
                        <option value="">— not in file —</option>
                        {result.columns.filter(c => c.header !== '' || c.sampleValues.length > 0).map(c => (
                          <option key={c.index} value={c.index}>
                            {c.header || `(column ${c.index + 1})`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...styles.td, color: '#666', fontSize: '12px' }}>
                      {col ? col.sampleValues.slice(0, 3).join(' · ') : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {missingRequired.length > 0 && (
            <div style={styles.warn}>Map the required fields first: {missingRequired.map(f => f.label).join(', ')}</div>
          )}

          <button
            style={{ ...styles.btnPrimary, opacity: missingRequired.length === 0 && !importing ? 1 : 0.5 }}
            onClick={handleImport}
            disabled={missingRequired.length > 0 || importing}
          >
            {importing ? 'Importing…' : 'Confirm mapping & Import'}
          </button>
        </>
      )}

      {summary && (
        <div style={styles.summary}>
          <div style={styles.summaryRow}><span>Rows parsed:</span><strong>{summary.rowsParsed}</strong></div>
          <div style={styles.summaryRow}><span>New rows added:</span><strong style={{ color: '#16a34a' }}>{summary.newRowsAdded}</strong></div>
          <div style={styles.summaryRow}><span>Duplicates skipped:</span><strong>{summary.duplicatesSkipped}</strong></div>
          {summary.skippedNoDate > 0 && <div style={styles.summaryRow}><span>Skipped (no date):</span><strong>{summary.skippedNoDate}</strong></div>}
          <div style={styles.summaryRow}><span>Conflicts to review:</span><strong style={{ color: summary.conflictCount > 0 ? '#b91c1c' : '#666' }}>{summary.conflictCount}</strong></div>
          <button style={styles.btnGhost} onClick={reset}>Import another file</button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  h4: { margin: '0 0 10px 0' },
  row: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  btn: { background: '#f3f4f6', color: '#111', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
  btnPrimary: { background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
  btnGhost: { background: 'transparent', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '6px', padding: '7px 12px', cursor: 'pointer', fontWeight: 600 },
  fileName: { fontSize: '13px', color: '#444' },
  note: { background: '#eff6ff', color: '#1e3a8a', padding: '10px', borderRadius: '6px', margin: '12px 0', fontSize: '13px' },
  warn: { background: '#fff3cd', color: '#856404', padding: '8px 10px', borderRadius: '6px', margin: '8px 0', fontSize: '13px' },
  error: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', margin: '10px 0', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse', margin: '10px 0' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '6px 8px', fontSize: '12px', color: '#555' },
  td: { borderBottom: '1px solid #eee', padding: '6px 8px', fontSize: '13px', verticalAlign: 'top' },
  select: { padding: '5px 8px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '13px', minWidth: '180px' },
  summary: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '360px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' },
};
