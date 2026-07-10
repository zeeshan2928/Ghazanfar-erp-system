import axios, { AxiosInstance } from 'axios';
import { GatePass, WarehouseTransfer, ApiResponse } from '../types/api';
import { SearchRequestDto, FilterResponseDto } from '../types/filters';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  async recordGatePassPrint(id: number) {
    const response = await this.client.post(`/api/v1/gate-passes/${id}/record-print`);
    return response.data as { isDuplicate: boolean; printCount: number; printedAt: string };
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
    // Backend DTO (ReceiveItemDto) expects camelCase quantityReceived - this
    // was previously sending quantity_received verbatim and silently failing
    // validation on every call. Translate at the boundary, keep this
    // method's own snake_case param name so existing callers don't need to change.
    const response = await this.client.post(
      `/warehouse-transfers/${id}/confirm-receipt`,
      { items: items.map(i => ({ productId: i.productId, quantityReceived: i.quantity_received })), remarks }
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

  async getStockMovement(days = 30, productId?: number) {
    const response = await this.client.get('/reports/stock-movement', { params: { days, productId } });
    return response.data;
  }

  async getWarehouseTransferAnalytics(days = 30) {
    const response = await this.client.get('/reports/warehouse-transfer', { params: { days } });
    return response.data;
  }

  async getCommissionPeriodSummary(startDate: string, endDate: string) {
    const response = await this.client.get(`/commission/summary/${startDate}/${endDate}`);
    return response.data;
  }

  async getDailySalesTrend(days = 30) {
    const response = await this.client.get('/reports/daily-sales-trend', { params: { days } });
    return response.data;
  }

  async getYearlyMonthlyComparison(years = 3) {
    const response = await this.client.get('/reports/yearly-monthly-comparison', { params: { years } });
    return response.data;
  }

  async getTodayCashCollection() {
    const response = await this.client.get('/reports/cash-collection-today');
    return response.data;
  }

  async getExpenseBreakdown(from?: string, to?: string) {
    const response = await this.client.get('/reports/expense-breakdown', { params: { from, to } });
    return response.data;
  }

  async getExpenseTrend(months = 6) {
    const response = await this.client.get('/reports/expense-trend', { params: { months } });
    return response.data;
  }

  async getSalesmanPerformanceReport(startDate?: string, endDate?: string) {
    const response = await this.client.get('/reports/salesman-performance', { params: { startDate, endDate } });
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

  async createProduct(data: any) {
    const response = await this.client.post('/products', data);
    return response.data;
  }

  async getProductById(productId: number) {
    const response = await this.client.get(`/products/${productId}`);
    return response.data;
  }

  async uploadProductMedia(productId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post(`/products/${productId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getProductMedia(productId: number) {
    const response = await this.client.get(`/products/${productId}/media`);
    return response.data as Array<{
      id: number;
      productId: number;
      url: string;
      mediaType: 'IMAGE' | 'VIDEO';
      mimeType: string;
      isPrimary: boolean;
      createdAt: string;
    }>;
  }

  async setPrimaryProductMedia(productId: number, mediaId: number) {
    const response = await this.client.post(`/products/${productId}/media/${mediaId}/set-primary`);
    return response.data;
  }

  async deleteProductMedia(productId: number, mediaId: number) {
    const response = await this.client.delete(`/products/${productId}/media/${mediaId}`);
    return response.data;
  }

  async setProductReorderParams(
    productId: number,
    data: { minimumQuantity: number; reorderQuantity: number; primaryVendorId?: number },
  ) {
    const response = await this.client.post(
      `/purchase-orders/products/${productId}/set-reorder-params`,
      data,
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

  async getProductPurchaseHistory(productId: number) {
    const response = await this.client.get(`/products/${productId}/purchase-history`);
    return response.data;
  }

  async getProductStockAcrossWarehouses(productId: number) {
    const response = await this.client.get(`/warehouses/product/${productId}/stock`);
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

  async createCustomer(data: any) {
    const response = await this.client.post('/customers', data);
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

  async getCustomerSaleHistory(customerId: number) {
    const response = await this.client.get(`/customers/${customerId}/sale-history`);
    return response.data;
  }

  async getCustomerProductHistory(customerId: number, productId: number) {
    const response = await this.client.get(`/customers/${customerId}/products/${productId}/purchase-history`);
    return response.data;
  }

  async getCustomerCreditStatus(customerId: number) {
    const response = await this.client.get(`/customers/${customerId}/credit-status`);
    return response.data as { creditLimit: number; outstandingBalance: number; availableCredit: number };
  }

  async getCustomerLedger(customerId: number) {
    const response = await this.client.get(`/customers/${customerId}/ledger`);
    return response.data as {
      customer: { id: number; name: string; phone: string; email: string | null; creditLimit: number };
      entries: Array<{
        billId: number;
        billNumber: string;
        billDate: string;
        totalAmount: number;
        amountPaid: number;
        outstanding: number;
        runningBalance: number;
        status: string;
      }>;
      totalOutstanding: number;
    };
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

  async exportBillPDF(billId: number): Promise<Blob> {
    const response = await this.client.get(`/bills/${billId}/export-pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async sendInvoiceEmail(billId: number, to?: string) {
    const response = await this.client.post(`/bills/${billId}/send-email`, { to });
    return response.data as { billId: number; to: string; sent: boolean; reason?: string; messageId?: string };
  }

  // ==================== GLOBAL SEARCH ====================
  async globalSearch(query: string) {
    const response = await this.client.get('/search', { params: { q: query } });
    return response.data as Array<{
      type: 'bill' | 'purchase_order' | 'gate_pass' | 'journal_entry' | 'cash_book_entry' | 'customer' | 'vendor' | 'sales_order';
      id: number;
      title: string;
      subtitle: string;
    }>;
  }

  // ==================== SALES ORDERS (optional, secondary to direct invoicing) ====================
  async createSalesOrder(data: any) {
    const response = await this.client.post('/sales-orders', data);
    return response.data;
  }

  async getSalesOrders(status?: string) {
    const response = await this.client.get('/sales-orders', { params: { status } });
    return response.data;
  }

  async getSalesOrderById(id: number) {
    const response = await this.client.get(`/sales-orders/${id}`);
    return response.data;
  }

  async cancelSalesOrder(id: number) {
    const response = await this.client.post(`/sales-orders/${id}/cancel`);
    return response.data;
  }

  async convertSalesOrderToInvoice(id: number, data: any) {
    const response = await this.client.post(`/sales-orders/${id}/convert-to-invoice`, data);
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

  async getVendorScorecard(vendorId: number) {
    const response = await this.client.get(`/vendors/${vendorId}/scorecard`);
    return response.data;
  }

  // ==================== LOW STOCK / REORDER ====================
  async getLowStockAlerts() {
    const response = await this.client.get('/purchase-orders/alerts/low-stock');
    return response.data;
  }

  async autoCreatePOsForLowStock() {
    const response = await this.client.post('/purchase-orders/alerts/auto-create-pos');
    return response.data;
  }

  async manualCreatePOsForLowStock(items: Array<{ productId: number; vendorId: number; quantity: number }>) {
    const response = await this.client.post('/purchase-orders/alerts/manual-create-pos', { items });
    return response.data;
  }

  // ==================== NOTIFICATIONS ====================
  async getNotifications(skip = 0, take = 10) {
    const response = await this.client.get('/notifications', { params: { skip, take } });
    return response.data;
  }

  async markNotificationRead(id: number) {
    const response = await this.client.post(`/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsRead() {
    const response = await this.client.post('/notifications/mark-all/read');
    return response.data;
  }

  async createVendor(data: any) {
    const response = await this.client.post('/vendors', data);
    return response.data;
  }

  async getVendors(skip = 0, take = 20) {
    const response = await this.client.get('/vendors', { params: { skip, take } });
    return response.data;
  }

  async getVendorById(vendorId: number) {
    const response = await this.client.get(`/vendors/${vendorId}`);
    return response.data;
  }

  async updateVendor(vendorId: number, data: any) {
    const response = await this.client.put(`/vendors/${vendorId}`, data);
    return response.data;
  }

  async deactivateVendor(vendorId: number) {
    const response = await this.client.delete(`/vendors/${vendorId}`);
    return response.data;
  }

  async addProductToVendor(vendorId: number, data: any) {
    const response = await this.client.post(`/vendors/${vendorId}/products`, data);
    return response.data;
  }

  async removeProductFromVendor(vendorId: number, productId: number) {
    const response = await this.client.delete(`/vendors/${vendorId}/products/${productId}`);
    return response.data;
  }

  // ==================== WAREHOUSE TRANSFERS (additional) ====================
  async createWarehouseTransfer(data: any) {
    const response = await this.client.post('/warehouse-transfers', data);
    return response.data;
  }

  async getWarehouseTransferById(id: number) {
    const response = await this.client.get(`/warehouse-transfers/${id}`);
    return response.data;
  }

  async rejectTransfer(id: number, reason: string) {
    const response = await this.client.post(`/warehouse-transfers/${id}/reject`, { reason });
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

  async getBillStatusBreakdown(days = 90) {
    const response = await this.client.get('/reports/bill-status-breakdown', { params: { days } });
    return response.data;
  }

  async getSalesOrderStatusBreakdown() {
    const response = await this.client.get('/reports/sales-order-status-breakdown');
    return response.data;
  }

  async getPurchaseOrderStatusBreakdown(days = 90) {
    const response = await this.client.get('/reports/purchase-order-status-breakdown', { params: { days } });
    return response.data;
  }

  async getPermissionOverrideStats() {
    const response = await this.client.get('/permissions/override-stats');
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

  // ==================== PERMISSIONS ====================
  async getPermissionCatalog() {
    const response = await this.client.get('/permissions/catalog');
    return response.data;
  }

  async getUserPermissionOverrides(userId: number) {
    const response = await this.client.get(`/permissions/user/${userId}/overrides`);
    return response.data;
  }

  async setUserPermissionOverrides(userId: number, overrides: { key: string; granted: boolean }[]) {
    const response = await this.client.put(`/permissions/user/${userId}/overrides`, { overrides });
    return response.data;
  }

  // ==================== GATE PASS OPERATIONS ====================
  async getGatePassesByStatus(warehouseId: number, status: string, skip = 0, take = 10) {
    const response = await this.client.get('/gate-passes', {
      params: { warehouseId, status, skip, take }
    });
    return response.data;
  }

  async getGatePassDetail(gatePassId: number) {
    const response = await this.client.get(`/gate-passes/${gatePassId}`);
    return response.data;
  }

  async updateGatePassStatus(gatePassId: number, status: string) {
    const response = await this.client.patch(`/gate-passes/${gatePassId}/status`, { status });
    return response.data;
  }

  async reportGatePassShortage(gatePassId: number, data: any) {
    const response = await this.client.post(`/gate-passes/${gatePassId}/shortage`, data);
    return response.data;
  }

  async printGatePassLabel(gatePassId: number) {
    const response = await this.client.get(`/gate-passes/${gatePassId}/print`);
    return response.data;
  }

  // ==================== INVENTORY OPERATIONS ====================
  async getInventoryByWarehouse(warehouseId: number, skip = 0, take = 20, search?: string) {
    const response = await this.client.get('/inventory', {
      params: { warehouseId, skip, take, search }
    });
    return response.data;
  }

  async getInventoryItem(productId: number, warehouseId: number) {
    const response = await this.client.get(`/inventory/product/${productId}/warehouse/${warehouseId}`);
    return response.data;
  }

  async adjustStock(data: any) {
    const response = await this.client.post('/inventory/adjust', data);
    return response.data;
  }

  async getInventoryMovements(warehouseId: number, fromDate?: string, toDate?: string, skip = 0, take = 20) {
    const response = await this.client.get('/inventory/movements', {
      params: { warehouseId, fromDate, toDate, skip, take }
    });
    return response.data;
  }

  async getInventoryDashboard(warehouseId: number) {
    const response = await this.client.get(`/inventory/dashboard/${warehouseId}`);
    return response.data;
  }

  async getWarehouseInventory(warehouseId: number) {
    const response = await this.client.get(`/warehouses/${warehouseId}/inventory`);
    return response.data;
  }

  async getProductInventoryStatus(productId: number) {
    const response = await this.client.get(`/products/${productId}/inventory-status`);
    return response.data;
  }

  // ==================== WAREHOUSES MANAGEMENT ====================
  async getWarehouses() {
    const response = await this.client.get('/warehouses');
    return response.data;
  }

  async createWarehouse(data: any) {
    const response = await this.client.post('/warehouses', data);
    return response.data;
  }

  // ==================== GENERAL LEDGER (GL) ====================
  async getChartOfAccounts() {
    const response = await this.client.get('/chart-of-accounts');
    return response.data;
  }

  async createAccount(data: any) {
    const response = await this.client.post('/chart-of-accounts', data);
    return response.data;
  }

  async updateAccount(accountId: number, data: any) {
    const response = await this.client.patch(`/chart-of-accounts/${accountId}`, data);
    return response.data;
  }

  async getAccountHierarchy() {
    const response = await this.client.get('/chart-of-accounts/tree/hierarchy');
    return response.data;
  }

  async deactivateAccount(accountId: number) {
    const response = await this.client.delete(`/chart-of-accounts/${accountId}`);
    return response.data;
  }

  async seedChartOfAccounts() {
    const response = await this.client.post('/chart-of-accounts/seed/starter', {});
    return response.data;
  }

  async getJournalEntries(skip = 0, take = 20) {
    const response = await this.client.get('/journal-entries', { params: { skip, take } });
    return response.data;
  }

  async createJournalEntry(data: any) {
    const response = await this.client.post('/journal-entries', data);
    return response.data;
  }

  async getJournalEntry(entryId: number) {
    const response = await this.client.get(`/journal-entries/${entryId}`);
    return response.data;
  }

  async postJournalEntry(entryId: number) {
    const response = await this.client.post(`/journal-entries/${entryId}/post`, {});
    return response.data;
  }

  async reverseJournalEntry(entryId: number, reversalDate?: string) {
    const response = await this.client.post(`/journal-entries/${entryId}/reverse`, { reversalDate });
    return response.data;
  }

  async getTrialBalance() {
    const response = await this.client.get('/journal-entries/reports/trial-balance');
    return response.data;
  }

  async getBalanceSheet(asOfDate?: string) {
    const response = await this.client.get('/gl-reporting/balance-sheet', { params: { asOf: asOfDate } });
    return response.data;
  }

  async getIncomeStatement(from?: string, to?: string) {
    const response = await this.client.get('/gl-reporting/income-statement', { params: { from, to } });
    return response.data;
  }

  async getGeneralLedger(accountId: number, from?: string, to?: string) {
    const response = await this.client.get('/gl-reporting/general-ledger', { params: { accountId, from, to } });
    return response.data;
  }

  async getCashReceiptsJournal(from?: string, to?: string) {
    const response = await this.client.get('/gl-reporting/cash-receipts-journal', { params: { from, to } });
    return response.data;
  }

  async getCashDisbursementsJournal(from?: string, to?: string) {
    const response = await this.client.get('/gl-reporting/cash-disbursements-journal', { params: { from, to } });
    return response.data;
  }

  async generateArAging(asOfDate?: string) {
    const response = await this.client.post('/ar-ap-aging/generate/ar', {}, { params: { asOfDate } });
    return response.data;
  }

  async generateApAging(asOfDate?: string) {
    const response = await this.client.post('/ar-ap-aging/generate/ap', {}, { params: { asOfDate } });
    return response.data;
  }

  async getArAgingReport(customerId?: number, asOfDate?: string) {
    const response = await this.client.get('/ar-ap-aging/report/ar', { params: { customerId, asOfDate } });
    return response.data;
  }

  async getApAgingReport(vendorId?: number, asOfDate?: string) {
    const response = await this.client.get('/ar-ap-aging/report/ap', { params: { vendorId, asOfDate } });
    return response.data;
  }

  async getCombinedAgingReport(asOfDate?: string) {
    const response = await this.client.get('/ar-ap-aging/report/combined', { params: { asOfDate } });
    return response.data;
  }

  async getCashBookKPIs(fromDate: string, toDate: string) {
    const response = await this.client.get('/cash-book/kpis', { params: { fromDate, toDate } });
    return response.data;
  }

  // ==================== BUDGET ====================
  async createBudget(data: any) {
    const response = await this.client.post('/budget', data);
    return response.data;
  }

  async getBudgets(fiscalYear?: number) {
    const response = await this.client.get('/budget', { params: { fiscalYear } });
    return response.data;
  }

  async getBudget(id: number) {
    const response = await this.client.get(`/budget/${id}`);
    return response.data;
  }

  async updateBudget(id: number, data: any) {
    const response = await this.client.patch(`/budget/${id}`, data);
    return response.data;
  }

  async deleteBudget(id: number) {
    const response = await this.client.delete(`/budget/${id}`);
    return response.data;
  }

  async getBudgetVariances(fiscalYear: number) {
    const response = await this.client.get(`/budget/variance/${fiscalYear}`);
    return response.data;
  }

  // ==================== PRODUCT CATEGORIES ====================
  async createProductCategory(data: any) {
    const response = await this.client.post('/product-categories', data);
    return response.data;
  }

  async getProductCategories(includeInactive = false) {
    const response = await this.client.get('/product-categories', { params: { includeInactive } });
    return response.data;
  }

  async getProductCategory(id: number) {
    const response = await this.client.get(`/product-categories/${id}`);
    return response.data;
  }

  async updateProductCategory(id: number, data: any) {
    const response = await this.client.patch(`/product-categories/${id}`, data);
    return response.data;
  }

  async deleteProductCategory(id: number) {
    const response = await this.client.delete(`/product-categories/${id}`);
    return response.data;
  }

  // ==================== BRANDS ====================
  async createBrand(data: any) {
    const response = await this.client.post('/brands', data);
    return response.data;
  }

  async getBrands(includeInactive = false) {
    const response = await this.client.get('/brands', { params: { includeInactive } });
    return response.data;
  }

  async getBrand(id: number) {
    const response = await this.client.get(`/brands/${id}`);
    return response.data;
  }

  async updateBrand(id: number, data: any) {
    const response = await this.client.patch(`/brands/${id}`, data);
    return response.data;
  }

  async deleteBrand(id: number) {
    const response = await this.client.delete(`/brands/${id}`);
    return response.data;
  }

  // ==================== SALES COMMISSION ====================
  async createCommissionAssignment(data: any) {
    const response = await this.client.post('/commission/assignments', data);
    return response.data;
  }

  async getCommissionAssignments(salesmanId?: number) {
    const response = await this.client.get('/commission/assignments', { params: salesmanId ? { salesmanId } : {} });
    return response.data;
  }

  async updateCommissionAssignment(id: number, data: any) {
    const response = await this.client.patch(`/commission/assignments/${id}`, data);
    return response.data;
  }

  async deactivateCommissionAssignment(id: number) {
    const response = await this.client.post(`/commission/assignments/${id}/deactivate`);
    return response.data;
  }

  async markCommissionPaid(id: number) {
    const response = await this.client.post(`/commission/assignments/${id}/mark-paid`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
