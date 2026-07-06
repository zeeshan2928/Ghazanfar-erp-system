import { create } from 'zustand';
import { InventoryItem, InventoryMovement, InventoryDashboard, InventoryFilter } from '../types/inventory';
import { apiClient } from '../services/api';

interface InventoryStoreState {
  // State
  items: InventoryItem[];
  selectedItem: InventoryItem | null;
  movements: InventoryMovement[];
  dashboard: InventoryDashboard | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  filters: InventoryFilter;

  // Actions
  setFilters: (filters: Partial<InventoryFilter>) => void;
  fetchInventory: (warehouseId: number, filters?: Partial<InventoryFilter>) => Promise<void>;
  fetchInventoryItem: (productId: number, warehouseId: number) => Promise<void>;
  selectItem: (item: InventoryItem | null) => void;
  adjustStock: (data: any) => Promise<void>;
  fetchMovements: (warehouseId: number, fromDate?: string, toDate?: string) => Promise<void>;
  fetchDashboard: (warehouseId: number) => Promise<void>;
  searchInventory: (query: string, warehouseId: number) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const initialFilters: InventoryFilter = {
  skip: 0,
  take: 20,
  sortBy: 'name',
  sortOrder: 'asc',
  showLowStockOnly: false,
};

export const useInventoryStore = create<InventoryStoreState>((set, get) => ({
  // Initial State
  items: [],
  selectedItem: null,
  movements: [],
  dashboard: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
  },
  filters: initialFilters,

  // Actions
  setFilters: (newFilters) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...newFilters,
        skip: newFilters.skip ?? state.filters.skip,
        take: newFilters.take ?? state.filters.take,
      },
    }));
  },

  fetchInventory: async (warehouseId: number, filters?: Partial<InventoryFilter>) => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const mergedFilters = { ...state.filters, ...filters };

      const response = await apiClient.getInventoryByWarehouse(
        warehouseId,
        mergedFilters.skip,
        mergedFilters.take,
        mergedFilters.search
      );

      set({
        items: response.data,
        pagination: {
          total: response.total,
          page: Math.floor(response.skip / response.take) + 1,
          pageSize: response.take,
          hasMore: response.hasMore,
        },
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch inventory',
        loading: false,
      });
    }
  },

  fetchInventoryItem: async (productId: number, warehouseId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getInventoryItem(productId, warehouseId);
      set({
        selectedItem: response,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch inventory item',
        loading: false,
      });
    }
  },

  selectItem: (item) => {
    set({ selectedItem: item });
  },

  adjustStock: async (data: any) => {
    set({ loading: true, error: null });
    try {
      await apiClient.adjustStock(data);

      // Refresh inventory list
      const filters = get().filters;
      if (filters.warehouseId) {
        await get().fetchInventory(filters.warehouseId);
      }

      set({ loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to adjust stock',
        loading: false,
      });
      throw error;
    }
  },

  fetchMovements: async (warehouseId: number, fromDate?: string, toDate?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getInventoryMovements(warehouseId, fromDate, toDate);
      set({
        movements: response.data,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch movements',
        loading: false,
      });
    }
  },

  fetchDashboard: async (warehouseId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getInventoryDashboard(warehouseId);
      set({
        dashboard: response,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch dashboard',
        loading: false,
      });
    }
  },

  searchInventory: async (query: string, warehouseId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getInventoryByWarehouse(warehouseId, 0, 20, query);
      set({
        items: response.data,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Search failed',
        loading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({
    items: [],
    selectedItem: null,
    movements: [],
    dashboard: null,
    loading: false,
    error: null,
    filters: initialFilters,
    pagination: {
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    },
  }),
}));
