import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ReportingService } from './services/reporting.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('reports')
@UseGuards(JwtGuard)
export class ReportingController {
  constructor(private reportingService: ReportingService) {}

  @Get('gate-pass-analytics')
  async getGatePassAnalytics(@Query('days') days?: string, @OrgContext() orgContext?: any) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getGatePassAnalytics(orgContext.organizationId, daysNum);
  }

  @Get('warehouse-performance')
  async getWarehousePerformance(@Query('days') days?: string, @OrgContext() orgContext?: any) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getWarehousePerformance(orgContext.organizationId, daysNum);
  }

  @Get('stock-movement')
  async getStockMovement(
    @Query('productId') productId?: string,
    @Query('days') days?: string,
    @OrgContext() orgContext?: any,
  ) {
    const productIdNum = productId ? parseInt(productId, 10) : undefined;
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getStockMovement(orgContext.organizationId, productIdNum, daysNum);
  }

  @Get('bill-analytics')
  async getBillAnalytics(@Query('days') days?: string, @OrgContext() orgContext?: any) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getBillAnalytics(orgContext.organizationId, daysNum);
  }

  @Get('inventory-snapshot')
  async getInventorySnapshot(@OrgContext() orgContext?: any) {
    return this.reportingService.getInventorySnapshot(orgContext.organizationId);
  }

  @Get('sales')
  async getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgContext() orgContext?: any,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportingService.getSalesReport(orgContext.organizationId, start, end);
  }

  @Get('vendors')
  async getVendorReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgContext() orgContext?: any,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportingService.getVendorReport(orgContext.organizationId, start, end);
  }

  @Get('inventory')
  async getInventoryReport(@OrgContext() orgContext?: any) {
    return this.reportingService.getInventoryReport(orgContext.organizationId);
  }

  @Get('customers')
  async getCustomerReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgContext() orgContext?: any,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportingService.getCustomerReport(orgContext.organizationId, start, end);
  }

  @Get('salesman-performance')
  async getSalesmanPerformanceReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgContext() orgContext?: any,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportingService.getSalesmanPerformanceReport(orgContext.organizationId, start, end);
  }

  @Get('commission')
  async getCommissionReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgContext() orgContext?: any,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportingService.getCommissionReport(orgContext.organizationId, start, end);
  }

  @Get('warehouse-transfer')
  async getWarehouseTransferAnalytics(
    @Query('days') days?: string,
    @OrgContext() orgContext?: any,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getWarehouseTransferAnalytics(orgContext.organizationId, daysNum);
  }

  @Get('product-performance')
  async getProductPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgContext() orgContext?: any,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportingService.getProductPerformance(orgContext.organizationId, start, end);
  }

  @Get('daily-sales-trend')
  async getDailySalesTrend(@Query('days') days?: string, @OrgContext() orgContext?: any) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getDailySalesTrend(orgContext.organizationId, daysNum);
  }

  @Get('fulfillment-by-customer')
  async getGateFulfillmentByCustomer(@Query('days') days?: string, @OrgContext() orgContext?: any) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getGateFulfillmentByCustomer(orgContext.organizationId, daysNum);
  }

  @Get('yearly-monthly-comparison')
  async getYearlyMonthlyComparison(@Query('years') years?: string, @OrgContext() orgContext?: any) {
    const yearsNum = years ? parseInt(years, 10) : 3;
    return this.reportingService.getYearlyMonthlyComparison(orgContext.organizationId, yearsNum);
  }

  @Get('cash-collection-today')
  async getTodayCashCollection(@OrgContext() orgContext?: any) {
    return this.reportingService.getTodayCashCollection(orgContext.organizationId);
  }

  @Get('expense-breakdown')
  async getExpenseBreakdown(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @OrgContext() orgContext?: any,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();
    return this.reportingService.getExpenseBreakdown(orgContext.organizationId, fromDate, toDate);
  }

  @Get('expense-trend')
  async getExpenseTrend(@Query('months') months?: string, @OrgContext() orgContext?: any) {
    const monthsNum = months ? parseInt(months, 10) : 6;
    return this.reportingService.getExpenseTrend(orgContext.organizationId, monthsNum);
  }

  @Get('bill-status-breakdown')
  async getBillStatusBreakdown(@Query('days') days?: string, @OrgContext() orgContext?: any) {
    const daysNum = days ? parseInt(days, 10) : 90;
    return this.reportingService.getBillStatusBreakdown(orgContext.organizationId, daysNum);
  }

  @Get('sales-order-status-breakdown')
  async getSalesOrderStatusBreakdown(@OrgContext() orgContext?: any) {
    return this.reportingService.getSalesOrderStatusBreakdown(orgContext.organizationId);
  }

  @Get('purchase-order-status-breakdown')
  async getPurchaseOrderStatusBreakdown(@Query('days') days?: string, @OrgContext() orgContext?: any) {
    const daysNum = days ? parseInt(days, 10) : 90;
    return this.reportingService.getPurchaseOrderStatusBreakdown(orgContext.organizationId, daysNum);
  }
}
