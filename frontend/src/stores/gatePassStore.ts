import { create } from 'zustand';
import { GatePass, GatePassListFilter } from '../types/gate-pass';
import { apiClient } from '../services/api';

interface GatePassStoreState {
  // State
  gatePasses: GatePass[];
  selectedGatePass: GatePass | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  filters: GatePassListFilter;

  // Actions
  setFilters: (filters: Partial<GatePassListFilter>) => void;
  fetchGatePasses: (warehouseId: number, filters?: Partial<GatePassListFilter>) => Promise<void>;
  fetchGatePassDetail: (gatePassId: number) => Promise<void>;
  selectGatePass: (gatePass: GatePass | null) => void;
  updateGatePassStatus: (gatePassId: number, status: string) => Promise<void>;
  reportShortage: (gatePassId: number, data: any) => Promise<void>;
  confirmGatePass: (gatePassId: number, items: any[]) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const initialFilters: GatePassListFilter = {
  skip: 0,
  take: 10,
  status: 'PENDING',
  sortBy: 'date',
  sortOrder: 'desc',
};

export const useGatePassStore = create<GatePassStoreState>((set, get) => ({
  // Initial State
  gatePasses: [],
  selectedGatePass: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    pageSize: 10,
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

  fetchGatePasses: async (warehouseId: number, filters?: Partial<GatePassListFilter>) => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const mergedFilters = { ...state.filters, ...filters };

      const response = await apiClient.getGatePassesByStatus(
        warehouseId,
        mergedFilters.status || 'PENDING',
        mergedFilters.skip,
        mergedFilters.take
      );

      set({
        gatePasses: response.data,
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
        error: error.message || 'Failed to fetch gate passes',
        loading: false,
      });
    }
  },

  fetchGatePassDetail: async (gatePassId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getGatePassDetail(gatePassId);
      set({
        selectedGatePass: response,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch gate pass details',
        loading: false,
      });
    }
  },

  selectGatePass: (gatePass) => {
    set({ selectedGatePass: gatePass });
  },

  updateGatePassStatus: async (gatePassId: number, status: string) => {
    set({ loading: true, error: null });
    try {
      await apiClient.updateGatePassStatus(gatePassId, status);

      // Update selected gate pass if it's the one being updated
      const state = get();
      if (state.selectedGatePass?.id === gatePassId) {
        set({
          selectedGatePass: {
            ...state.selectedGatePass,
            status: status as any,
          },
        });
      }

      // Refresh list
      const filters = state.filters;
      if (filters.warehouseId) {
        await get().fetchGatePasses(filters.warehouseId);
      }

      set({ loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update status',
        loading: false,
      });
      throw error;
    }
  },

  reportShortage: async (gatePassId: number, data: any) => {
    set({ loading: true, error: null });
    try {
      await apiClient.reportGatePassShortage(gatePassId, data);

      // Update status to SHORTAGE_REPORTED
      const state = get();
      if (state.selectedGatePass?.id === gatePassId) {
        set({
          selectedGatePass: {
            ...state.selectedGatePass,
            status: 'SHORTAGE_REPORTED',
          },
        });
      }

      set({ loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to report shortage',
        loading: false,
      });
      throw error;
    }
  },

  confirmGatePass: async (gatePassId: number, items: any[]) => {
    set({ loading: true, error: null });
    try {
      await apiClient.confirmGatePass(gatePassId, items, 'Gate pass confirmed');

      // Refresh the gate pass detail
      await get().fetchGatePassDetail(gatePassId);

      set({ loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to confirm gate pass',
        loading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({
    gatePasses: [],
    selectedGatePass: null,
    loading: false,
    error: null,
    filters: initialFilters,
    pagination: {
      total: 0,
      page: 1,
      pageSize: 10,
      hasMore: false,
    },
  }),
}));
