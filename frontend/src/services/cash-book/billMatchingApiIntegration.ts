import { useEffect, useState } from 'react';
import { useBillMatchingStore } from '../../stores/cash-book/billMatchingStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface MatchResponse {
  candidates: Array<{
    id: string;
    entryId: string;
    billId: string;
    confidence: number;
    reason: string;
    amountDiff: number;
    dateDiff: number;
  }>;
}

interface UnmatchedBillsResponse {
  bills: Array<{
    id: string;
    billNumber: string;
    amount: number;
    date: string;
    vendor: string;
    category: string;
    description: string;
  }>;
  matchedCount: number;
  unconfirmedCount: number;
}

export function useBillMatchingAPI() {
  const store = useBillMatchingStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchUnmatchedBills = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/cash-book/bills/unmatched`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch unmatched bills');

      const data: UnmatchedBillsResponse = await response.json();
      store.setUnmatchedBills(data.bills);
      store.setMatchedCount(data.matchedCount);
      store.setUnconfirmedCount(data.unconfirmedCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCandidates = async (billId: string) => {
    try {
      setError(null);

      const response = await fetch(
        `${API_BASE}/api/cash-book/matches/candidates/${billId}`,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch candidates');

      const data: MatchResponse = await response.json();
      store.setCandidates(data.candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const createMatch = async (billId: string, entryId: string) => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE}/api/cash-book/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, entryId }),
      });

      if (!response.ok) throw new Error('Failed to create match');

      const data = await response.json();
      store.addMatchPair({
        id: data.id,
        billId,
        entryId,
        confidence: data.confidence,
        matchedAt: new Date().toISOString(),
      });

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const undoMatch = async (matchId: string) => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE}/api/cash-book/matches/${matchId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to undo match');

      store.removeMatchPair(matchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const autoMatch = async (onProgress?: (progress: number) => void) => {
    try {
      setError(null);
      store.setIsAutoMatching(true);

      const response = await fetch(`${API_BASE}/api/cash-book/matches/batch-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to auto-match');

      const data = await response.json();

      for (const match of data.matches) {
        store.addMatchPair({
          id: match.id,
          billId: match.billId,
          entryId: match.entryId,
          confidence: match.confidence,
          matchedAt: new Date().toISOString(),
        });

        if (onProgress) {
          onProgress((store.matchedPairs.length / data.totalBills) * 100);
        }
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      store.setIsAutoMatching(false);
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
    fetchUnmatchedBills,
    fetchCandidates,
    createMatch,
    undoMatch,
    autoMatch,
  };
}
