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

  // Authentication
  async login(credentials: { email: string; password: string }) {
    const response = await this.client.post<any>(
      '/users/login',
      credentials
    );
    return response.data;
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

  // ==================== BILLS MANAGEMENT ====================
  async createBill(billData: any) {
    const response = await this.client.post('/bills', billData);
    return response.data;
  }

  async getBills(skip = 0, take = 20, search?: string) {
    const response = await this.client.get('/bills', { params: { skip, take, search } });
    return response.data;
  }

  async getBillById(billId: number) {
    const response = await this.client.get(`/bills/${billId}`);
    return response.data;
  }

  async updateBill(billId: number, billData: any) {
    const response = await this.client.put(`/bills/${billId}`, billData);
    return response.data;
  }

  async deleteBill(billId: number) {
    const response = await this.client.delete(`/bills/${billId}`);
    return response.data;
  }

  async changeBillStatus(billId: number, status: string) {
    const response = await this.client.patch(`/bills/${billId}/status`, { status });
    return response.data;
  }

  async exportBillPDF(billId: number) {
    const response = await this.client.get(`/bills/${billId}/export-pdf`);
    return response.data;
  }

  // ==================== PURCHASE ORDERS MANAGEMENT ====================
  async createPurchaseOrder(poData: any) {
    const response = await this.client.post('/purchase-orders', poData);
    return response.data;
  }

  async getPurchaseOrders(skip = 0, take = 20, search?: string, status?: string) {
    const response = await this.client.get('/purchase-orders', { params: { skip, take, search, status } });
    return response.data;
  }

  async getPurchaseOrderById(poId: number) {
    const response = await this.client.get(`/purchase-orders/${poId}`);
    return response.data;
  }

  async updatePurchaseOrder(poId: number, poData: any) {
    const response = await this.client.put(`/purchase-orders/${poId}`, poData);
    return response.data;
  }

  async deletePurchaseOrder(poId: number) {
    const response = await this.client.delete(`/purchase-orders/${poId}`);
    return response.data;
  }

  async changePOStatus(poId: number, status: string) {
    const response = await this.client.patch(`/purchase-orders/${poId}/status`, { status });
    return response.data;
  }

  async confirmPOReceipt(poId: number, items: any[]) {
    const response = await this.client.post(`/purchase-orders/${poId}/confirm-receipt`, { items });
    return response.data;
  }

  async getVendorMetrics(vendorId: number) {
    const response = await this.client.get(`/vendors/${vendorId}/metrics`);
    return response.data;
  }

  // ==================== REPORTS & ANALYTICS ====================
  async getSalesReport(startDate?: string, endDate?: string) {
    const response = await this.client.get('/reports/sales', { params: { startDate, endDate } });
    return response.data;
  }

  async getVendorReport(startDate?: string, endDate?: string) {
    const response = await this.client.get('/reports/vendors', { params: { startDate, endDate } });
    return response.data;
  }

  async getInventoryReport() {
    const response = await this.client.get('/reports/inventory');
    return response.data;
  }

  async getCustomerReport(startDate?: string, endDate?: string) {
    const response = await this.client.get('/reports/customers', { params: { startDate, endDate } });
    return response.data;
  }

  // ==================== IMPORT/EXPORT ====================
  async exportProducts() {
    const response = await this.client.get('/import-export/export/products', { responseType: 'blob' });
    return response.data;
  }

  async exportBills() {
    const response = await this.client.get('/import-export/export/bills', { responseType: 'blob' });
    return response.data;
  }

  async exportPurchaseOrders() {
    const response = await this.client.get('/import-export/export/purchase-orders', { responseType: 'blob' });
    return response.data;
  }

  async exportCustomers() {
    const response = await this.client.get('/import-export/export/customers', { responseType: 'blob' });
    return response.data;
  }

  async exportVendors() {
    const response = await this.client.get('/import-export/export/vendors', { responseType: 'blob' });
    return response.data;
  }

  async importProducts(formData: FormData) {
    const response = await this.client.post('/import-export/import/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async importBills(formData: FormData) {
    const response = await this.client.post('/import-export/import/bills', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async importPurchaseOrders(formData: FormData) {
    const response = await this.client.post('/import-export/import/purchase-orders', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async importCustomers(formData: FormData) {
    const response = await this.client.post('/import-export/import/customers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async importVendors(formData: FormData) {
    const response = await this.client.post('/import-export/import/vendors', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // ==================== USER MANAGEMENT ====================
  async createUser(userData: any) {
    const response = await this.client.post('/users', userData);
    return response.data;
  }

  async getUsers(skip = 0, take = 20, search?: string, role?: string, status?: string) {
    const response = await this.client.get('/users', { params: { skip, take, search, role, status } });
    return response.data;
  }

  async getUserById(userId: number) {
    const response = await this.client.get(`/users/${userId}`);
    return response.data;
  }

  async updateUser(userId: number, userData: any) {
    const response = await this.client.put(`/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: number) {
    const response = await this.client.delete(`/users/${userId}`);
    return response.data;
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const response = await this.client.post(`/users/${userId}/change-password`, {
      oldPassword,
      newPassword,
    });
    return response.data;
  }

  async getUserStats() {
    const response = await this.client.get('/users/stats');
    return response.data;
  }
}

export const apiClient = new ApiClient();
