import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ManufacturingOrdersService } from './services/manufacturing-orders.service';
import {
  CompleteManufacturingOrderDto,
  CreateManufacturingOrderDto,
  ManufacturingOrderSearchDto,
} from './dto/manufacturing-order.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('manufacturing-orders')
@UseGuards(JwtGuard)
export class ManufacturingOrdersController {
  constructor(private manufacturingOrdersService: ManufacturingOrdersService) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.create')
  async create(@Body() dto: CreateManufacturingOrderDto, @OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.create(orgContext.organizationId, orgContext.userId, dto);
  }

  @Post('search')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.view')
  async search(@Body() dto: ManufacturingOrderSearchDto, @OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.search(orgContext.organizationId, dto);
  }

  // Declared BEFORE the ':id' route - Express matches in order, so putting
  // 'reports/product-cost' after would let "reports" be parsed as an id.
  @Get('reports/product-cost')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.view')
  async productCostSummary(@OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.getProductCostSummary(
      orgContext.organizationId,
      !!orgContext.canViewFinancials,
    );
  }

  // Received batches for a component (feeds the completion batch picker).
  // Declared before ':id' so "component-batches" isn't parsed as an id.
  @Get('component-batches/:productId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.view')
  async componentBatches(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    return this.manufacturingOrdersService.getComponentBatches(
      orgContext.organizationId,
      parseInt(productId, 10),
      warehouseId ? parseInt(warehouseId, 10) : undefined,
    );
  }

  // Forward recall: which builds consumed a given vendor batch.
  @Get('reports/batch/:batchNumber')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.view')
  async whereBatchUsed(@Param('batchNumber') batchNumber: string, @OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.whereBatchUsed(orgContext.organizationId, batchNumber);
  }

  @Get('reports/yield-scrap')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.view')
  async yieldScrap(@OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.getYieldScrapReport(
      orgContext.organizationId,
      !!orgContext.canViewFinancials,
    );
  }

  @Get('reports/vendor-defects')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.view')
  async vendorDefects(@OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.getVendorDefectScorecard(
      orgContext.organizationId,
      !!orgContext.canViewFinancials,
    );
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.view')
  async getById(@Param('id') id: string, @OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.getById(orgContext.organizationId, parseInt(id, 10));
  }

  @Get(':id/trace')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.view')
  async trace(@Param('id') id: string, @OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.getBatchTrace(orgContext.organizationId, parseInt(id, 10));
  }

  @Get(':id/variance')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.view')
  async variance(@Param('id') id: string, @OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.getVariance(orgContext.organizationId, parseInt(id, 10));
  }

  @Post(':id/start')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.start')
  async start(@Param('id') id: string, @OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.start(orgContext.organizationId, parseInt(id, 10), orgContext.userId);
  }

  @Post(':id/complete')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.complete')
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteManufacturingOrderDto,
    @OrgContext() orgContext: any,
  ) {
    return this.manufacturingOrdersService.complete(orgContext.organizationId, parseInt(id, 10), orgContext.userId, dto);
  }

  @Post(':id/cancel')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.cancel')
  async cancel(@Param('id') id: string, @OrgContext() orgContext: any) {
    await this.manufacturingOrdersService.cancel(orgContext.organizationId, parseInt(id, 10));
    return { success: true };
  }
}
