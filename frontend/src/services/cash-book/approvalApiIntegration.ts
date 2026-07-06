import { useEffect, useState } from 'react';
import { useApprovalStore, ApprovalStatus } from '../../stores/cash-book/approvalStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApprovalRequest {
  entryId: string;
  status: ApprovalStatus;
  comments: string;
  rejectionReason?: string;
}

interface EntriesResponse {
  entries: Array<{
    id: string;
    referenceNumber: string;
    date: string;
    amount: number;
    category: string;
    description: string;
    status: ApprovalStatus;
  }>;
}

export function useApprovalAPI() {
  const store = useApprovalStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchEntries = async (filterStatus?: ApprovalStatus | 'all') => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const response = await fetch(
        `${API_BASE}/cash-book/entries/approval?${params.toString()}`,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch entries');

      const data: EntriesResponse = await response.json();
      store.setEntries(data.entries);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  };

  const submitApproval = async (request: ApprovalRequest) => {
    try {
      setError(null);
      store.setIsSubmitting(true);

      const response = await fetch(`${API_BASE}/cash-book/entries/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('Failed to submit approval');

      const data = await response.json();

      store.updateApprovalState(request.entryId, {
        entryId: request.entryId,
        status: request.status,
        comments: request.comments,
        approvedBy: data.approvedBy,
        approvedAt: new Date().toISOString(),
        rejectionReason: request.rejectionReason,
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      store.setIsSubmitting(false);
    }
  };

  const approveBulk = async (entryIds: string[], comments: string) => {
    try {
      setError(null);
      store.setIsSubmitting(true);

      const response = await fetch(
        `${API_BASE}/cash-book/entries/approve/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryIds, comments }),
        }
      );

      if (!response.ok) throw new Error('Failed to approve bulk entries');

      const data = await response.json();

      for (const entryId of entryIds) {
        store.updateApprovalState(entryId, {
          entryId,
          status: 'approved',
          comments,
          approvedBy: data.approvedBy,
          approvedAt: new Date().toISOString(),
        });
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      store.setIsSubmitting(false);
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
    fetchEntries,
    submitApproval,
    approveBulk,
  };
}
