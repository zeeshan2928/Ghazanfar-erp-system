import { useEffect, useState, useCallback } from 'react';
import { getWebSocketManager } from '../services/websocketManager';
import { useGatePassStore } from '../stores/gatePassStore';
import { useInventoryStore } from '../stores/inventoryStore';

interface RealtimeSyncStatus {
  isConnected: boolean;
  lastSyncTime: number | null;
  gatePassUpdates: number;
  inventoryUpdates: number;
  errors: string[];
}

/**
 * Hook for real-time sync via WebSocket
 * Subscribes to gate pass and inventory updates
 */
export const useRealtimeSync = (
  warehouseId: number,
  authToken?: string
): RealtimeSyncStatus => {
  const { fetchGatePasses } = useGatePassStore();
  const { fetchInventory, fetchDashboard } = useInventoryStore();

  const [status, setStatus] = useState<RealtimeSyncStatus>({
    isConnected: false,
    lastSyncTime: null,
    gatePassUpdates: 0,
    inventoryUpdates: 0,
    errors: [],
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (!authToken) return;

    const ws = getWebSocketManager();
    const token = localStorage.getItem('auth_token') || authToken;

    ws.connect(token)
      .then(() => {
        setStatus((prev) => ({ ...prev, isConnected: true }));
      })
      .catch((error) => {
        console.error('WebSocket connection failed:', error);
        setStatus((prev) => ({
          ...prev,
          errors: [...prev.errors, error.message],
        }));
      });

    // Subscribe to gate pass updates
    const unsubscribeGatePass = ws.subscribe(
      'gate-pass-update',
      (data) => {
        console.log('Gate pass update:', data);
        fetchGatePasses(warehouseId).catch((error) => {
          console.error('Failed to refresh gate passes:', error);
          setStatus((prev) => ({
            ...prev,
            errors: [...prev.errors, `Gate pass update error: ${error.message}`],
          }));
        });

        setStatus((prev) => ({
          ...prev,
          gatePassUpdates: prev.gatePassUpdates + 1,
          lastSyncTime: Date.now(),
        }));
      }
    );

    // Subscribe to inventory updates
    const unsubscribeInventory = ws.subscribe(
      'inventory-update',
      (data) => {
        console.log('Inventory update:', data);
        Promise.all([
          fetchInventory(warehouseId),
          fetchDashboard(warehouseId),
        ]).catch((error) => {
          console.error('Failed to refresh inventory:', error);
          setStatus((prev) => ({
            ...prev,
            errors: [...prev.errors, `Inventory update error: ${error.message}`],
          }));
        });

        setStatus((prev) => ({
          ...prev,
          inventoryUpdates: prev.inventoryUpdates + 1,
          lastSyncTime: Date.now(),
        }));
      }
    );

    // Cleanup
    return () => {
      unsubscribeGatePass();
      unsubscribeInventory();
      ws.disconnect();
    };
  }, [warehouseId, authToken, fetchGatePasses, fetchInventory, fetchDashboard]);

  return status;
};

/**
 * Hook to trigger manual sync
 */
export const useSyncTrigger = () => {
  const { fetchGatePasses } = useGatePassStore();
  const { fetchInventory, fetchDashboard } = useInventoryStore();

  return useCallback(
    async (warehouseId: number) => {
      try {
        await Promise.all([
          fetchGatePasses(warehouseId),
          fetchInventory(warehouseId),
          fetchDashboard(warehouseId),
        ]);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    [fetchGatePasses, fetchInventory, fetchDashboard]
  );
};
