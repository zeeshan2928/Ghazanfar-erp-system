import { useEffect, useState, useCallback } from 'react';
import {
  offlineStorage,
  pendingQueue,
  connectionStatus,
  PendingOperation,
} from '../utils/offlineStorage';
import { apiClient } from '../services/api';

interface UseOfflineModeReturn {
  isOnline: boolean;
  isLoading: boolean;
  pendingCount: number;
  cacheSize: number;
  sync: () => Promise<void>;
  clearCache: () => void;
  clearPending: () => void;
}

/**
 * Hook for offline mode support
 * Handles caching, pending operations, and sync
 */
export const useOfflineMode = (): UseOfflineModeReturn => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);

  // Monitor connection status
  useEffect(() => {
    const unsubscribe = connectionStatus.onChange((online) => {
      setIsOnline(online);
      if (online) {
        // Auto-sync when coming online
        syncPendingOperations();
      }
    });

    return unsubscribe;
  }, []);

  // Update pending count and cache size
  useEffect(() => {
    const updateStats = () => {
      setPendingCount(pendingQueue.getAll().length);
      setCacheSize(offlineStorage.getSize());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5s

    return () => clearInterval(interval);
  }, []);

  /**
   * Cache API responses
   */
  const cacheResponse = useCallback(
    <T,>(key: string, data: T, ttlMinutes?: number) => {
      offlineStorage.set(key, data, ttlMinutes);
    },
    []
  );

  /**
   * Get cached response
   */
  const getCachedResponse = useCallback(<T,>(key: string): T | null => {
    return offlineStorage.get<T>(key);
  }, []);

  /**
   * Queue operation for sync
   */
  const queueOperation = useCallback(
    (
      method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      endpoint: string,
      data?: any
    ) => {
      const operation: PendingOperation = {
        id: `${method}-${endpoint}-${Date.now()}`,
        method,
        endpoint,
        data,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
      };

      pendingQueue.add(operation);
      setPendingCount(pendingQueue.getAll().length);
    },
    []
  );

  /**
   * Sync pending operations
   */
  const syncPendingOperations = useCallback(async () => {
    if (!isOnline) return;

    setIsLoading(true);
    try {
      const operations = pendingQueue.getAll();
      let successCount = 0;
      let failureCount = 0;

      for (const operation of operations) {
        try {
          // Execute operation via API
          let response;

          switch (operation.method) {
            case 'POST':
              response = await apiClient.client.post(
                operation.endpoint,
                operation.data
              );
              break;
            case 'PUT':
              response = await apiClient.client.put(
                operation.endpoint,
                operation.data
              );
              break;
            case 'DELETE':
              response = await apiClient.client.delete(operation.endpoint);
              break;
            case 'PATCH':
              response = await apiClient.client.patch(
                operation.endpoint,
                operation.data
              );
              break;
            default:
              throw new Error(`Unknown method: ${operation.method}`);
          }

          // Remove from pending queue on success
          pendingQueue.remove(operation.id);
          successCount++;
        } catch (error) {
          // Retry logic
          operation.retries += 1;
          if (operation.retries >= operation.maxRetries) {
            pendingQueue.remove(operation.id);
            failureCount++;
          } else {
            pendingQueue.updateRetry(operation.id);
          }
        }
      }

      console.log(
        `Sync complete: ${successCount} succeeded, ${failureCount} failed`
      );
      setPendingCount(pendingQueue.getAll().length);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  /**
   * Clear all cache
   */
  const clearCache = useCallback(() => {
    offlineStorage.clear();
    setCacheSize(0);
  }, []);

  /**
   * Clear pending operations
   */
  const clearPending = useCallback(() => {
    pendingQueue.clear();
    setPendingCount(0);
  }, []);

  return {
    isOnline,
    isLoading,
    pendingCount,
    cacheSize,
    sync: syncPendingOperations,
    clearCache,
    clearPending,
  };
};

/**
 * Create offline-aware API wrapper
 */
export const createOfflineAPI = (originalAPI: typeof apiClient) => {
  return {
    ...originalAPI,

    /**
     * Cached GET with fallback
     */
    async getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
      const cached = offlineStorage.get<T>(key);
      if (cached) return cached;

      try {
        const data = await fetcher();
        offlineStorage.set(key, data, 60); // Cache for 60 minutes
        return data;
      } catch (error) {
        // Try to use stale cache if available
        const staleCache = offlineStorage.get<T>(key);
        if (staleCache) {
          console.warn('Using stale cache due to fetch error');
          return staleCache;
        }
        throw error;
      }
    },

    /**
     * Queued POST with offline support
     */
    async postQueued<T>(
      endpoint: string,
      data: any
    ): Promise<T | { queued: true }> {
      if (!navigator.onLine) {
        const operation: PendingOperation = {
          id: `POST-${endpoint}-${Date.now()}`,
          method: 'POST',
          endpoint,
          data,
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
        };
        pendingQueue.add(operation);
        return { queued: true } as any;
      }

      try {
        return await originalAPI.client.post(endpoint, data);
      } catch (error) {
        // Queue for retry
        queueOperation('POST', endpoint, data);
        throw error;
      }
    },
  };
};

export default useOfflineMode;
