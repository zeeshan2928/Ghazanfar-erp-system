import { useEffect, useState } from 'react';
import { useBankReconciliationStore } from '../../stores/cash-book/bankReconciliationStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface BankStatement {
  id: string;
  date: string;
  description: string;
  amount: number;
  referenceNumber: string;
}

interface ReconciliationResponse {
  totalStatements: number;
  totalMatched: number;
  reconciliationRate: number;
  matches: Array<{
    id: string;
    bankStatementId: string;
    entryId: string;
    matchedAt: string;
    confidence: number;
  }>;
  unmatchedEntries: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    referenceNumber: string;
    days: number;
  }>;
}

export function useBankReconciliationAPI() {
  const store = useBankReconciliationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const uploadBankStatement = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      store.setIsProcessing(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${API_BASE}/cash-book/reconciliation/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) throw new Error('Failed to upload bank statement');

      const data = await response.json();
      store.setBankStatements(data.statements);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      store.setError(message);
      throw err;
    } finally {
      setIsLoading(false);
      store.setIsProcessing(false);
    }
  };

  const reconcile = async (statements: BankStatement[]) => {
    try {
      setError(null);
      store.setIsProcessing(true);

      const response = await fetch(
        `${API_BASE}/cash-book/reconciliation/process`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statements }),
        }
      );

      if (!response.ok) throw new Error('Failed to reconcile');

      const data: ReconciliationResponse = await response.json();

      store.setTotalStatements(data.totalStatements);
      store.setTotalMatched(data.totalMatched);
      store.setReconciliationRate(data.reconciliationRate);
      store.setMatches(data.matches);
      store.setUnmatchedEntries(data.unmatchedEntries);

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      store.setError(message);
      throw err;
    } finally {
      store.setIsProcessing(false);
    }
  };

  const completeReconciliation = async () => {
    try {
      setError(null);

      const response = await fetch(
        `${API_BASE}/cash-book/reconciliation/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to complete reconciliation');

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  };

  const rejectMatch = async (matchId: string) => {
    try {
      setError(null);

      const response = await fetch(
        `${API_BASE}/cash-book/reconciliation/matches/${matchId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to reject match');

      store.removeMatch(matchId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  };

  useEffect(() => {
    window.addEventListener('online', () => setIsOffline(false));
    window.addEventListener('offline', () => setIsOffline(true));

    return () => {
      window.removeEventListener('online', () => setIsOffline(false));
      window.removeEventListener('offline', () => setIsOffline(true));
    };
  }, []);

  return {
    isLoading,
    error,
    isOffline,
    uploadBankStatement,
    reconcile,
    completeReconciliation,
    rejectMatch,
  };
}
