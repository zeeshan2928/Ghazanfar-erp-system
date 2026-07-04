import axios, { AxiosInstance } from 'axios';
import { GatePass, WarehouseTransfer, ApiResponse } from '../types/api';
import { SearchRequestDto, FilterResponseDto } from '../types/filters';

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

  // Search APIs
  async searchBills(request: SearchRequestDto) {
    const response = await this.client.post<FilterResponseDto<any>>(
      '/bills/search',
      request
    );
    return response.data;
  }

  async getBillColumnValues(columnName: string) {
    const response = await this.client.get<any[]>(
      `/bills/filters/columns/${columnName}`
    );
    return response.data;
  }

  async searchProducts(request: SearchRequestDto) {
    const response = await this.client.post<FilterResponseDto<any>>(
      '/products/search',
      request
    );
    return response.data;
  }

  async getProductColumnValues(columnName: string) {
    const response = await this.client.get<any[]>(
      `/products/filters/columns/${columnName}`
    );
    return response.data;
  }

  async searchInventory(request: SearchRequestDto) {
    const response = await this.client.post<FilterResponseDto<any>>(
      '/inventory/search',
      request
    );
    return response.data;
  }

  async getInventoryColumnValues(columnName: string) {
    const response = await this.client.get<any[]>(
      `/inventory/filters/columns/${columnName}`
    );
    return response.data;
  }

  async searchCustomers(request: SearchRequestDto) {
    const response = await this.client.post<FilterResponseDto<any>>(
      '/customers/search',
      request
    );
    return response.data;
  }

  async getCustomerColumnValues(columnName: string) {
    const response = await this.client.get<any[]>(
      `/customers/filters/columns/${columnName}`
    );
    return response.data;
  }

  async searchPurchaseOrders(request: SearchRequestDto) {
    const response = await this.client.post<FilterResponseDto<any>>(
      '/purchase-orders/search',
      request
    );
    return response.data;
  }

  async getPurchaseOrderColumnValues(columnName: string) {
    const response = await this.client.get<any[]>(
      `/purchase-orders/filters/columns/${columnName}`
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();
