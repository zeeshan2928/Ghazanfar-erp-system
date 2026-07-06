import { apiClient } from './api';
import { GatePass } from '../types/gate-pass';
import { useGatePassStore } from '../stores/gatePassStore';

/**
 * Warehouse Staff API Integration
 * Handles all API calls for warehouse picking operations
 */

export const warehouseApiIntegration = {
  /**
   * Fetch pending gate passes for warehouse
   */
  async getPendingGatePasses(
    warehouseId: number,
    skip = 0,
    take = 10
  ): Promise<{ data: GatePass[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.getGatePassesByStatus(
        warehouseId,
        'PENDING',
        skip,
        take
      );
      return {
        data: response.data || [],
        total: response.total || 0,
        hasMore: response.hasMore || false,
      };
    } catch (error) {
      console.error('Failed to fetch gate passes:', error);
      throw error;
    }
  },

  /**
   * Get gate pass detail
   */
  async getGatePassDetail(gatePassId: number): Promise<GatePass> {
    try {
      const response = await apiClient.getGatePassDetail(gatePassId);
      return response;
    } catch (error) {
      console.error('Failed to fetch gate pass detail:', error);
      throw error;
    }
  },

  /**
   * Confirm picked items and update gate pass status
   */
  async confirmPickedItems(
    gatePassId: number,
    items: Array<{
      itemId: number;
      pickedQuantity: number;
    }>,
    remarks?: string
  ): Promise<GatePass> {
    try {
      const response = await apiClient.confirmGatePass(
        gatePassId,
        items.map((item) => ({
          billLineId: item.itemId,
          pickedQuantity: item.pickedQuantity,
        })),
        remarks
      );
      return response;
    } catch (error) {
      console.error('Failed to confirm gate pass:', error);
      throw error;
    }
  },

  /**
   * Report shortage for items
   */
  async reportShortage(
    gatePassId: number,
    itemId: number,
    quantityPicked: number,
    reason: string,
    notes?: string,
    photoUrl?: string
  ): Promise<void> {
    try {
      await apiClient.reportGatePassShortage(gatePassId, {
        itemId,
        quantityPicked,
        reason,
        notes,
        photoUrl,
      });
    } catch (error) {
      console.error('Failed to report shortage:', error);
      throw error;
    }
  },

  /**
   * Get printable gate pass data
   */
  async getPrintLabel(gatePassId: number): Promise<GatePass> {
    try {
      const response = await apiClient.getGatePassDetail(gatePassId);
      return response;
    } catch (error) {
      console.error('Failed to get print label:', error);
      throw error;
    }
  },

  /**
   * Update gate pass status
   */
  async updateGatePassStatus(
    gatePassId: number,
    status: string
  ): Promise<GatePass> {
    try {
      const response = await apiClient.updateGatePassStatus(gatePassId, status);
      return response;
    } catch (error) {
      console.error('Failed to update gate pass status:', error);
      throw error;
    }
  },

  /**
   * Search for product by barcode/QR code
   */
  async searchProductByBarcode(
    barcode: string
  ): Promise<{
    productId: number;
    name: string;
    sku: string;
    warehouseId: number;
  } | null> {
    try {
      // This would call a product search endpoint
      // For now, return null (to be implemented with backend)
      console.log('Searching for product:', barcode);
      return null;
    } catch (error) {
      console.error('Failed to search product:', error);
      throw error;
    }
  },

  /**
   * Initialize warehouse staff session
   */
  async initializeSession(
    warehouseId: number,
    userId: number
  ): Promise<{ warehouseName: string; userName: string }> {
    try {
      // Validate warehouse and user access
      // Load initial data
      return {
        warehouseName: 'Main Warehouse',
        userName: 'Warehouse Staff',
      };
    } catch (error) {
      console.error('Failed to initialize session:', error);
      throw error;
    }
  },

  /**
   * Sync gate passes with server in real-time
   */
  async syncGatePasses(warehouseId: number): Promise<void> {
    try {
      // Poll or use WebSocket to sync
      // This is called periodically
      const store = useGatePassStore();
      await store.fetchGatePasses(warehouseId, {
        skip: 0,
        take: 10,
        status: 'PENDING',
      });
    } catch (error) {
      console.error('Failed to sync gate passes:', error);
    }
  },

  /**
   * Get warehouse inventory snapshot
   */
  async getWarehouseInventory(warehouseId: number): Promise<any> {
    try {
      const response = await apiClient.getWarehouseInventory(warehouseId);
      return response;
    } catch (error) {
      console.error('Failed to get warehouse inventory:', error);
      throw error;
    }
  },

  /**
   * Logout warehouse staff
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
 * Hook for warehouse API operations with error handling
 */
export const useWarehouseAPI = () => {
  const { setError, clearError } = useGatePassStore();

  return {
    ...warehouseApiIntegration,
    setError,
    clearError,
  };
};

/**
 * Initialize warehouse API with interceptors
 */
export const initializeWarehouseAPI = () => {
  // Add response interceptor for warehouse staff
  // Handle 401 - show login
  // Handle 403 - show permission error
  // Handle network errors - queue for offline mode
};
