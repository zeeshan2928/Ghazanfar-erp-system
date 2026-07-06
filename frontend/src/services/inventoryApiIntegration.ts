import { apiClient } from './api';
import { InventoryItem, InventoryMovement } from '../types/inventory';
import { useInventoryStore } from '../stores/inventoryStore';
import { useOfflineMode } from '../hooks/useOfflineMode';

/**
 * Inventory Manager API Integration
 * Handles all API calls for inventory operations
 */

export const inventoryApiIntegration = {
  /**
   * Get inventory by warehouse
   */
  async getInventoryByWarehouse(
    warehouseId: number,
    skip = 0,
    take = 20
  ): Promise<{
    data: InventoryItem[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await apiClient.getInventoryByWarehouse(
        warehouseId,
        skip,
        take
      );
      return {
        data: response.data || [],
        total: response.total || 0,
        hasMore: response.hasMore || false,
      };
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      throw error;
    }
  },

  /**
   * Get inventory dashboard
   */
  async getInventoryDashboard(warehouseId: number): Promise<any> {
    try {
      const response = await apiClient.getInventoryDashboard(warehouseId);
      return response;
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      throw error;
    }
  },

  /**
   * Adjust stock
   */
  async adjustStock(
    warehouseId: number,
    productId: number,
    quantity: number,
    adjustmentType: 'ADD' | 'REMOVE' | 'CORRECT',
    reason: string,
    reference?: string,
    notes?: string
  ): Promise<InventoryItem> {
    try {
      const response = await apiClient.adjustStock({
        warehouse_id: warehouseId,
        product_id: productId,
        adjustment_type: adjustmentType,
        quantity,
        reason,
        reference,
        notes,
      });
      return response;
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      throw error;
    }
  },

  /**
   * Get inventory movements
   */
  async getInventoryMovements(
    warehouseId: number,
    fromDate?: string,
    toDate?: string,
    skip = 0,
    take = 50
  ): Promise<{
    data: InventoryMovement[];
    total: number;
  }> {
    try {
      const response = await apiClient.getInventoryMovements(
        warehouseId,
        fromDate,
        toDate,
        skip,
        take
      );
      return {
        data: response.data || [],
        total: response.total || 0,
      };
    } catch (error) {
      console.error('Failed to fetch movements:', error);
      throw error;
    }
  },

  /**
   * Get inventory item detail
   */
  async getInventoryItem(
    productId: number,
    warehouseId: number
  ): Promise<InventoryItem> {
    try {
      const response = await apiClient.getInventoryItem(productId, warehouseId);
      return response;
    } catch (error) {
      console.error('Failed to fetch inventory item:', error);
      throw error;
    }
  },

  /**
   * Get product inventory status across all warehouses
   */
  async getProductInventoryStatus(productId: number): Promise<any> {
    try {
      const response = await apiClient.getProductInventoryStatus(productId);
      return response;
    } catch (error) {
      console.error('Failed to fetch product inventory status:', error);
      throw error;
    }
  },

  /**
   * Get warehouse inventory
   */
  async getWarehouseInventory(warehouseId: number): Promise<any> {
    try {
      const response = await apiClient.getWarehouseInventory(warehouseId);
      return response;
    } catch (error) {
      console.error('Failed to fetch warehouse inventory:', error);
      throw error;
    }
  },

  /**
   * Sync inventory with server
   */
  async syncInventory(warehouseId: number): Promise<void> {
    try {
      const store = useInventoryStore();
      await store.fetchInventory(warehouseId);
    } catch (error) {
      console.error('Failed to sync inventory:', error);
    }
  },

  /**
   * Search products in inventory
   */
  async searchInventory(
    warehouseId: number,
    query: string
  ): Promise<InventoryItem[]> {
    try {
      const response = await apiClient.getInventoryByWarehouse(
        warehouseId,
        0,
        50,
        query
      );
      return response.data || [];
    } catch (error) {
      console.error('Failed to search inventory:', error);
      throw error;
    }
  },

  /**
   * Export inventory to CSV
   */
  async exportInventory(warehouseId: number): Promise<Blob> {
    try {
      // This would call an export endpoint
      // For now, return null
      throw new Error('Export not yet implemented');
    } catch (error) {
      console.error('Failed to export inventory:', error);
      throw error;
    }
  },

  /**
   * Generate inventory report
   */
  async getInventoryReport(warehouseId: number): Promise<any> {
    try {
      const response = await apiClient.getInventoryReport();
      return response;
    } catch (error) {
      console.error('Failed to get inventory report:', error);
      throw error;
    }
  },

  /**
   * Get low stock items
   */
  async getLowStockItems(warehouseId: number): Promise<InventoryItem[]> {
    try {
      const response = await apiClient.getInventoryByWarehouse(
        warehouseId,
        0,
        100
      );
      // Filter for items below threshold (assume 20 unit threshold)
      return (response.data || []).filter((item) => item.available < 20);
    } catch (error) {
      console.error('Failed to get low stock items:', error);
      throw error;
    }
  },

  /**
   * Initialize inventory manager session
   */
  async initializeSession(
    warehouseId: number,
    userId: number
  ): Promise<{ warehouseName: string; userName: string }> {
    try {
      // Validate manager access
      // Load initial data
      return {
        warehouseName: 'Main Warehouse',
        userName: 'Inventory Manager',
      };
    } catch (error) {
      console.error('Failed to initialize session:', error);
      throw error;
    }
  },

  /**
   * Logout inventory manager
   */
  async logout(): Promise<void> {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  },
};

/**
 * Hook for inventory API operations
 */
export const useInventoryAPI = () => {
  const { setError, clearError } = useInventoryStore();
  const { sync } = useOfflineMode();

  return {
    ...inventoryApiIntegration,
    setError,
    clearError,
    syncOffline: sync,
  };
};

/**
 * Initialize inventory API
 */
export const initializeInventoryAPI = () => {
  // Add response interceptors
  // Handle errors and offline scenarios
};
