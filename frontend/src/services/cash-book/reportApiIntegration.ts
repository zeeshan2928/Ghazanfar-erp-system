import { useState, useCallback } from 'react';
import {
  CashBookKPIs,
  CashFlowEntry,
  Discrepancy,
  UnmatchedItem,
} from '../../stores/cash-book/reportStore';
import { reportOfflineStorage } from '../../utils/cash-book-offline/reportOfflineStorage';
import { connectionStatus } from '../../utils/offlineStorage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ==================== API Client ====================

class CashBookReportApiClient {
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Get KPIs
  async getKPIs(fromDate: string, toDate: string): Promise<CashBookKPIs> {
    try {
      const endpoint = `/cash-book/kpis?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
      const data = await this.fetchWithAuth<CashBookKPIs>(endpoint);
      reportOfflineStorage.kpis.save(data);
      return data;
    } catch (error: any) {
      const cached = reportOfflineStorage.kpis.get();
      if (cached) return cached;
      throw new Error(`Failed to fetch KPIs: ${error.message}`);
    }
  }

  // Get Cash Flow Data
  async getCashFlow(
    groupBy: 'day' | 'week' | 'month' = 'day',
    fromDate?: string,
    toDate?: string
  ): Promise<CashFlowEntry[]> {
    try {
      const params = new URLSearchParams({ groupBy });
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const endpoint = `/cash-book/cash-flow?${params.toString()}`;
      const data = await this.fetchWithAuth<CashFlowEntry[]>(endpoint);
      reportOfflineStorage.cashFlow.save(data);
      return data;
    } catch (error: any) {
      const cached = reportOfflineStorage.cashFlow.get();
      if (cached.length > 0) return cached;
      throw new Error(`Failed to fetch cash flow: ${error.message}`);
    }
  }

  // Get Discrepancies
  async getDiscrepancies(
    fromDate?: string,
    toDate?: string,
    category?: string
  ): Promise<Discrepancy[]> {
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (category) params.append('category', category);

      const endpoint = `/cash-book/discrepancies?${params.toString()}`;
      const data = await this.fetchWithAuth<Discrepancy[]>(endpoint);
      reportOfflineStorage.discrepancies.save(data);
      return data;
    } catch (error: any) {
      const cached = reportOfflineStorage.discrepancies.get();
      if (cached.length > 0) return cached;
      throw new Error(`Failed to fetch discrepancies: ${error.message}`);
    }
  }

  // Get Unmatched Items by Age
  async getUnmatchedItems(ageingDays: number = 30): Promise<UnmatchedItem[]> {
    try {
      const endpoint = `/cash-book/unmatched-items?ageingDays=${ageingDays}`;
      const data = await this.fetchWithAuth<UnmatchedItem[]>(endpoint);
      reportOfflineStorage.unmatchedItems.save(data);
      return data;
    } catch (error: any) {
      const cached = reportOfflineStorage.unmatchedItems.get();
      if (cached.length > 0) return cached;
      throw new Error(`Failed to fetch unmatched items: ${error.message}`);
    }
  }

  // Export Report
  async exportReport(
    format: 'pdf' | 'excel',
    fromDate: string,
    toDate: string
  ): Promise<Blob> {
    try {
      const token = this.getToken();
      const endpoint = `${API_BASE}/cash-book/export?format=${format}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;

      const response = await fetch(endpoint, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return response.blob();
    } catch (error: any) {
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }
}

const apiClient = new CashBookReportApiClient();

// ==================== Hook: useCashBookReportAPI ====================

export interface CashBookReportAPIState {
  kpis: CashBookKPIs | null;
  cashFlow: CashFlowEntry[];
  discrepancies: Discrepancy[];
  unmatchedItems: UnmatchedItem[];
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
}

export const useCashBookReportAPI = () => {
  const [state, setState] = useState<CashBookReportAPIState>({
    kpis: null,
    cashFlow: [],
    discrepancies: [],
    unmatchedItems: [],
    isLoading: false,
    isOffline: !connectionStatus.isOnline(),
    error: null,
  });

  const fetchKPIs = useCallback(
    async (fromDate: string, toDate: string) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const data = await apiClient.getKPIs(fromDate, toDate);
        setState((s) => ({
          ...s,
          kpis: data,
          isLoading: false,
        }));
      } catch (error: any) {
        setState((s) => ({
          ...s,
          error: error.message || 'Failed to fetch KPIs',
          isLoading: false,
        }));
      }
    },
    []
  );

  const fetchCashFlow = useCallback(
    async (
      groupBy: 'day' | 'week' | 'month' = 'day',
      fromDate?: string,
      toDate?: string
    ) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const data = await apiClient.getCashFlow(groupBy, fromDate, toDate);
        setState((s) => ({
          ...s,
          cashFlow: data,
          isLoading: false,
        }));
      } catch (error: any) {
        setState((s) => ({
          ...s,
          error: error.message || 'Failed to fetch cash flow',
          isLoading: false,
        }));
      }
    },
    []
  );

  const fetchDiscrepancies = useCallback(
    async (fromDate?: string, toDate?: string, category?: string) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const data = await apiClient.getDiscrepancies(fromDate, toDate, category);
        setState((s) => ({
          ...s,
          discrepancies: data,
          isLoading: false,
        }));
      } catch (error: any) {
        setState((s) => ({
          ...s,
          error: error.message || 'Failed to fetch discrepancies',
          isLoading: false,
        }));
      }
    },
    []
  );

  const fetchUnmatchedItems = useCallback(
    async (ageingDays: number = 30) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const data = await apiClient.getUnmatchedItems(ageingDays);
        setState((s) => ({
          ...s,
          unmatchedItems: data,
          isLoading: false,
        }));
      } catch (error: any) {
        setState((s) => ({
          ...s,
          error: error.message || 'Failed to fetch unmatched items',
          isLoading: false,
        }));
      }
    },
    []
  );

  const exportReport = useCallback(
    async (format: 'pdf' | 'excel', fromDate: string, toDate: string) => {
      try {
        const blob = await apiClient.exportReport(format, fromDate, toDate);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cash-book-report-${fromDate}-${toDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error: any) {
        setState((s) => ({
          ...s,
          error: error.message || 'Failed to export report',
        }));
      }
    },
    []
  );

  return {
    state,
    fetchKPIs,
    fetchCashFlow,
    fetchDiscrepancies,
    fetchUnmatchedItems,
    exportReport,
  };
};

export default apiClient;
