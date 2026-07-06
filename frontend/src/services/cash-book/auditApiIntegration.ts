import { useEffect, useState } from 'react';
import { useAuditStore, AuditLogEntry, AuditComment } from '../../stores/cash-book/auditStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface CommentRequest {
  entryId: string;
  content: string;
}

interface AuditLogsResponse {
  logs: AuditLogEntry[];
  comments: Record<string, AuditComment[]>;
}

export function useAuditAPI() {
  const store = useAuditStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchAuditLogs = async (entryId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/cash-book/entries/${entryId}/audit`,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data: AuditLogsResponse = await response.json();

      // Load logs
      for (const log of data.logs) {
        store.addAuditLog(log);
      }

      // Load comments
      for (const [id, comments] of Object.entries(data.comments)) {
        for (const comment of comments) {
          store.addComment(id, comment);
        }
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  };

  const addComment = async (request: CommentRequest) => {
    try {
      setError(null);

      const response = await fetch(
        `${API_BASE}/cash-book/entries/${request.entryId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: request.content }),
        }
      );

      if (!response.ok) throw new Error('Failed to add comment');

      const data = await response.json();

      const comment: AuditComment = {
        id: data.id,
        entryId: request.entryId,
        author: data.author,
        content: request.content,
        timestamp: new Date().toISOString(),
      };

      store.addComment(request.entryId, comment);

      // Log the action
      const log: AuditLogEntry = {
        id: `log-${Date.now()}`,
        entryId: request.entryId,
        action: 'COMMENT_ADDED',
        by: data.author,
        timestamp: new Date().toISOString(),
        details: { content: request.content },
      };
      store.addAuditLog(log);

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteComment = async (entryId: string, commentId: string) => {
    try {
      setError(null);

      const response = await fetch(
        `${API_BASE}/cash-book/entries/${entryId}/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to delete comment');

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const exportAuditLog = async (entryId: string) => {
    try {
      setError(null);

      const response = await fetch(
        `${API_BASE}/cash-book/entries/${entryId}/audit/export`,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to export audit log');

      return await response.blob();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
    fetchAuditLogs,
    addComment,
    deleteComment,
    exportAuditLog,
  };
}
