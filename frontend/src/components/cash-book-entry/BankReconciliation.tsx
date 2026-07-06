import React, { useState, useRef } from 'react';
import { useCashBookEntryStore } from '../../stores/cash-book/entryStore';
import './bank-reconciliation.css';

interface BankEntry {
  date: string;
  description: string;
  amount: number;
  referenceNumber: string;
}

export function BankReconciliation(): JSX.Element {
  const store = useCashBookEntryStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bankEntries, setBankEntries] = useState<BankEntry[]>([]);
  const [matchedEntries, setMatchedEntries] = useState<Set<string>>(new Set());
  const [unmatchedBank, setUnmatchedBank] = useState<BankEntry[]>([]);
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [error, setError] = useState<string | null>(null);

  const parseCSV = (content: string): BankEntry[] => {
    const lines = content.split('\n').filter((line) => line.trim());
    const entries: BankEntry[] = [];

    // Skip header if present
    const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length >= 4) {
        entries.push({
          date: parts[0],
          description: parts[1],
          amount: Math.round(parseFloat(parts[2]) * 100),
          referenceNumber: parts[3],
        });
      }
    }

    return entries;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const entries = parseCSV(content);

        if (entries.length === 0) {
          setError('No valid entries found in file');
          return;
        }

        setBankEntries(entries);
        performMatching(entries);
        setStep('review');
      } catch (err) {
        setError('Failed to parse file. Please use CSV format.');
      }
    };

    reader.readAsText(file);
  };

  const performMatching = (bankItems: BankEntry[]) => {
    const matched = new Set<string>();
    const unmatched: BankEntry[] = [];

    for (const bankEntry of bankItems) {
      let foundMatch = false;

      for (const entry of store.entries) {
        if (
          Math.abs(entry.amount - bankEntry.amount) < 100 &&
          Math.abs(
            new Date(entry.date).getTime() - new Date(bankEntry.date).getTime()
          ) <
            3 * 24 * 60 * 60 * 1000
        ) {
          matched.add(bankEntry.referenceNumber);
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        unmatched.push(bankEntry);
      }
    }

    setMatchedEntries(matched);
    setUnmatchedBank(unmatched);
  };

  const handleCompleteReconciliation = () => {
    // Mark entries as reconciled
    store.syncPending(
      store.entries.filter((e) =>
        matchedEntries.has(e.referenceNumber)
      )
    );
    setStep('complete');
  };

  if (step === 'upload') {
    return (
      <div className="bank-recon">
        <div className="bank-recon__header">
          <h2 className="bank-recon__title">Bank Reconciliation</h2>
          <p className="bank-recon__subtitle">
            Upload your bank statement to reconcile with cash entries
          </p>
        </div>

        <div className="bank-recon__upload-area">
          <div className="bank-recon__upload-box">
            <div className="bank-recon__upload-icon">📄</div>
            <h3 className="bank-recon__upload-title">Upload CSV File</h3>
            <p className="bank-recon__upload-text">
              CSV format: Date, Description, Amount, Reference Number
            </p>
            <button
              className="bank-recon__btn bank-recon__btn--primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="bank-recon__input"
            />
          </div>

          {error && (
            <div className="bank-recon__error">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="bank-recon__template">
          <h4 className="bank-recon__template-title">CSV Template</h4>
          <pre className="bank-recon__template-code">
{`Date,Description,Amount,Reference Number
2026-07-01,Cheque Deposit,50000.00,CHK-001
2026-07-02,Wire Transfer,25000.00,WIR-002`}
          </pre>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    const reconciliationRate =
      bankEntries.length > 0
        ? ((matchedEntries.size / bankEntries.length) * 100).toFixed(1)
        : '0';

    return (
      <div className="bank-recon">
        <div className="bank-recon__header">
          <h2 className="bank-recon__title">Reconciliation Review</h2>
          <button
            className="bank-recon__btn bank-recon__btn--secondary"
            onClick={() => {
              setBankEntries([]);
              setMatchedEntries(new Set());
              setUnmatchedBank([]);
              setStep('upload');
            }}
          >
            ↶ Upload New
          </button>
        </div>

        {/* Summary */}
        <div className="bank-recon__summary">
          <div className="bank-recon__stat">
            <div className="bank-recon__stat-label">Total Entries</div>
            <div className="bank-recon__stat-value">{bankEntries.length}</div>
          </div>
          <div className="bank-recon__stat">
            <div className="bank-recon__stat-label">Matched</div>
            <div className="bank-recon__stat-value bank-recon__stat-value--success">
              {matchedEntries.size}
            </div>
          </div>
          <div className="bank-recon__stat">
            <div className="bank-recon__stat-label">Unmatched</div>
            <div className="bank-recon__stat-value bank-recon__stat-value--warning">
              {unmatchedBank.length}
            </div>
          </div>
          <div className="bank-recon__stat">
            <div className="bank-recon__stat-label">Rate</div>
            <div className="bank-recon__stat-value">{reconciliationRate}%</div>
          </div>
        </div>

        {/* Unmatched Entries */}
        {unmatchedBank.length > 0 && (
          <div className="bank-recon__section">
            <h3 className="bank-recon__section-title">
              Unmatched Bank Entries ({unmatchedBank.length})
            </h3>
            <div className="bank-recon__table-wrapper">
              <table className="bank-recon__table">
                <thead className="bank-recon__thead">
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody className="bank-recon__tbody">
                  {unmatchedBank.map((entry, idx) => (
                    <tr key={idx} className="bank-recon__row bank-recon__row--unmatched">
                      <td>{entry.date}</td>
                      <td>{entry.description}</td>
                      <td>Rs. {(entry.amount / 100).toLocaleString()}</td>
                      <td>{entry.referenceNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bank-recon__actions">
          <button
            className="bank-recon__btn bank-recon__btn--primary"
            onClick={handleCompleteReconciliation}
            disabled={matchedEntries.size === 0}
          >
            ✓ Complete Reconciliation
          </button>
          <button
            className="bank-recon__btn bank-recon__btn--secondary"
            onClick={() => {
              setBankEntries([]);
              setStep('upload');
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Complete state
  return (
    <div className="bank-recon">
      <div className="bank-recon__complete">
        <div className="bank-recon__complete-icon">✓</div>
        <h2 className="bank-recon__complete-title">Reconciliation Complete!</h2>
        <p className="bank-recon__complete-text">
          {matchedEntries.size} entries matched and {unmatchedBank.length} unmatched
        </p>
        <button
          className="bank-recon__btn bank-recon__btn--primary"
          onClick={() => {
            setBankEntries([]);
            setMatchedEntries(new Set());
            setUnmatchedBank([]);
            setStep('upload');
          }}
        >
          Reconcile Another File
        </button>
      </div>
    </div>
  );
}

export default BankReconciliation;
