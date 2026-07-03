import axios, { AxiosInstance } from 'axios';
import { GatePass, WarehouseTransfer, ApiResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Gate Passes
  async getGatePasses(warehouseId: number, skip = 0, take = 10) {
    const response = await this.client.get<ApiResponse<GatePass[]>>(
      '/gate-passes',
      { params: { warehouseId, skip, take } }
    );
    return response.data;
  }

  async getGatePass(id: number) {
    const response = await this.client.get<GatePass>(`/gate-passes/${id}`);
    return response.data;
  }

  async confirmGatePass(id: number, pickedItems: Array<{ billLineId: number; pickedQuantity: number }>, remarks?: string) {
    const response = await this.client.post(
      `/gate-passes/${id}/confirm`,
      { pickedItems, remarks }
    );
    return response.data;
  }

  async rejectGatePass(id: number, reason: string) {
    const response = await this.client.post(`/gate-passes/${id}/reject`, { reason });
    return response.data;
  }

  // Website Orders
  async getPendingWebsiteOrders(skip = 0, take = 10) {
    const response = await this.client.get(
      '/website-orders/pending',
      { params: { skip, take } }
    );
    return response.data;
  }

  async approveWebsiteOrder(orderId: string, customerId: number, warehouseId: number, remarks?: string) {
    const response = await this.client.post(
      `/website-orders/${orderId}/approve`,
      { customerId, warehouseId, remarks }
    );
    return response.data;
  }

  // Warehouse Transfers
  async getPendingTransfers(skip = 0, take = 10) {
    const response = await this.client.get(
      '/warehouse-transfers/pending',
      { params: { skip, take } }
    );
    return response.data;
  }

  async getInTransitTransfers(skip = 0, take = 10) {
    const response = await this.client.get(
      '/warehouse-transfers/in-transit',
      { params: { skip, take } }
    );
    return response.data;
  }

  async startTransfer(id: number) {
    const response = await this.client.post(`/warehouse-transfers/${id}/start`);
    return response.data;
  }

  async confirmTransferReceipt(id: number, items: Array<{ productId: number; quantity_received: number }>, remarks?: string) {
    const response = await this.client.post(
      `/warehouse-transfers/${id}/confirm-receipt`,
      { items, remarks }
    );
    return response.data;
  }

  // Reports
  async getGatePassAnalytics(days = 30) {
    const response = await this.client.get(
      '/reports/gate-pass-analytics',
      { params: { days } }
    );
    return response.data;
  }

  async getWarehousePerformance(days = 30) {
    const response = await this.client.get(
      '/reports/warehouse-performance',
      { params: { days } }
    );
    return response.data;
  }

  async getBillAnalytics(days = 30) {
    const response = await this.client.get(
      '/reports/bill-analytics',
      { params: { days } }
    );
    return response.data;
  }

  async getInventorySnapshot() {
    const response = await this.client.get('/reports/inventory-snapshot');
    return response.data;
  }
}

export const apiClient = new ApiClient();
