import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ReportingService } from './services/reporting.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('reports')
@UseGuards(JwtGuard)
export class ReportingController {
  constructor(private reportingService: ReportingService) {}

  @Get('gate-pass-analytics')
  async getGatePassAnalytics(
    @Query('days') days?: string,
    @OrgContext() orgContext?: any,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getGatePassAnalytics(
      orgContext.organizationId,
      daysNum,
    );
  }

  @Get('warehouse-performance')
  async getWarehousePerformance(
    @Query('days') days?: string,
    @OrgContext() orgContext?: any,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getWarehousePerformance(
      orgContext.organizationId,
      daysNum,
    );
  }

  @Get('stock-movement')
  async getStockMovement(
    @Query('productId') productId?: string,
    @Query('days') days?: string,
    @OrgContext() orgContext?: any,
  ) {
    const productIdNum = productId ? parseInt(productId, 10) : undefined;
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getStockMovement(
      orgContext.organizationId,
      productIdNum,
      daysNum,
    );
  }

  @Get('bill-analytics')
  async getBillAnalytics(
    @Query('days') days?: string,
    @OrgContext() orgContext?: any,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportingService.getBillAnalytics(
      orgContext.organizationId,
      daysNum,
    );
  }

  @Get('inventory-snapshot')
  async getInventorySnapshot(
    @OrgContext() orgContext?: any,
  ) {
    return this.reportingService.getInventorySnapshot(
      orgContext.organizationId,
    );
  }
}
