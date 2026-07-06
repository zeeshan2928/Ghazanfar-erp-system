/**
 * Offline Storage Utilities
 * Handles LocalStorage caching for offline support
 */

const STORAGE_PREFIX = 'ghazanfar_';
const CACHE_EXPIRY_KEY = `${STORAGE_PREFIX}cache_expiry`;
const PENDING_SYNC_KEY = `${STORAGE_PREFIX}pending_sync`;

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface PendingOperation {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

/**
 * Storage utilities
 */
export const offlineStorage = {
  /**
   * Set item with TTL (time to live)
   */
  set<T>(key: string, value: T, ttlMinutes: number = 60): void {
    try {
      const now = Date.now();
      const expiresAt = now + ttlMinutes * 60 * 1000;
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: now,
        expiresAt,
      };
      localStorage.setItem(
        `${STORAGE_PREFIX}${key}`,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.error('Failed to set offline storage:', error);
    }
  },

  /**
   * Get item from storage
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);

      // Check if expired
      if (entry.expiresAt < Date.now()) {
        localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Failed to get offline storage:', error);
      return null;
    }
  },

  /**
   * Remove item from storage
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error('Failed to remove offline storage:', error);
    }
  },

  /**
   * Clear all cache
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear offline storage:', error);
    }
  },

  /**
   * Get cache size in KB
   */
  getSize(): number {
    let size = 0;
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          const item = localStorage.getItem(key);
          if (item) size += item.length;
        }
      });
    } catch (error) {
      console.error('Failed to get storage size:', error);
    }
    return Math.round(size / 1024);
  },
};

/**
 * Pending operations queue
 */
export const pendingQueue = {
  /**
   * Add operation to pending queue
   */
  add(operation: PendingOperation): void {
    try {
      const queue = pendingQueue.getAll();
      queue.push(operation);
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to add pending operation:', error);
    }
  },

  /**
   * Get all pending operations
   */
  getAll(): PendingOperation[] {
    try {
      const data = localStorage.getItem(PENDING_SYNC_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get pending operations:', error);
      return [];
    }
  },

  /**
   * Remove operation from queue
   */
  remove(operationId: string): void {
    try {
      const queue = pendingQueue.getAll();
      const filtered = queue.filter((op) => op.id !== operationId);
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove pending operation:', error);
    }
  },

  /**
   * Clear all pending operations
   */
  clear(): void {
    try {
      localStorage.removeItem(PENDING_SYNC_KEY);
    } catch (error) {
      console.error('Failed to clear pending operations:', error);
    }
  },

  /**
   * Update operation retry count
   */
  updateRetry(operationId: string): void {
    try {
      const queue = pendingQueue.getAll();
      const operation = queue.find((op) => op.id === operationId);
      if (operation) {
        operation.retries += 1;
        localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Failed to update retry count:', error);
    }
  },
};

/**
 * Connection status monitoring
 */
export const connectionStatus = {
  isOnline(): boolean {
    return navigator.onLine;
  },

  /**
   * Listen for connection changes
   */
  onChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return unsubscribe function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};

/**
 * Service Worker registration for offline support
 */
export const serviceWorkerManager = {
  /**
   * Register service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register(
        '/sw.js',
        { scope: '/' }
      );
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  },

  /**
   * Unregister service worker
   */
  async unregister(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
    }
  },
};

/**
 * IndexedDB for larger data storage
 */
export const indexedDBManager = {
  dbName: 'GhazanfarERP',
  version: 1,
  stores: ['gatePasses', 'inventory', 'movements'],

  /**
   * Initialize database
   */
  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        this.stores.forEach((store) => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
    });
  },

  /**
   * Save data to IndexedDB
   */
  async save<T>(store: string, data: T): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.add(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  /**
   * Get data from IndexedDB
   */
  async get<T>(store: string, key: any): Promise<T | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  /**
   * Get all data from store
   */
  async getAll<T>(store: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  },

  /**
   * Clear store
   */
  async clear(store: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },
};
