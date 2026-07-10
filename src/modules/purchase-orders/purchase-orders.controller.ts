import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { PurchaseOrdersSearchService } from './services/purchase-orders-search.service';
import {
  CreatePurchaseOrderDto,
  ConfirmReceiptDto,
  SetProductReorderParamsDto,
  UpdatePurchaseOrderDto,
  ManualCreatePOsDto,
} from './dto/purchase-order.dto';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from 'src/common/decorators/org-context.decorator';
import { Public } from '@common/decorators/public.decorator';
import { stripPOCost, stripPOCostList, stripVendorPricing } from '@common/utils/financial-visibility.util';

@Controller('purchase-orders')
@UseGuards(JwtGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly poService: PurchaseOrdersService,
    private readonly poSearchService: PurchaseOrdersSearchService,
  ) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.create')
  create(@OrgContext() { organizationId, userId }: any, @Body() createDto: CreatePurchaseOrderDto) {
    return this.poService.create(organizationId, userId, createDto);
  }

  @Get('draft')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.view')
  async getDraft(
    @OrgContext() { organizationId, canViewFinancials }: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip = 0,
    @Query('take', new ParseIntPipe({ optional: true })) take = 10,
  ) {
    const result = await this.poService.getDraft(organizationId, skip, take);
    return { ...result, data: stripPOCostList(result.data, canViewFinancials) };
  }

  @Get('sent')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.view')
  async getSent(
    @OrgContext() { organizationId, canViewFinancials }: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip = 0,
    @Query('take', new ParseIntPipe({ optional: true })) take = 10,
  ) {
    const result = await this.poService.getSent(organizationId, skip, take);
    return { ...result, data: stripPOCostList(result.data, canViewFinancials) };
  }

  @Get('received')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.view')
  async getReceived(
    @OrgContext() { organizationId, canViewFinancials }: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip = 0,
    @Query('take', new ParseIntPipe({ optional: true })) take = 10,
  ) {
    const result = await this.poService.getReceived(organizationId, skip, take);
    return { ...result, data: stripPOCostList(result.data, canViewFinancials) };
  }

  @Get('alerts/low-stock')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.view')
  async getLowStockAlerts(@OrgContext() { organizationId, userId, canViewFinancials }: any) {
    const result = await this.poService.getLowStockAlerts(organizationId, userId);
    if (canViewFinancials) return result;
    return {
      ...result,
      alerts: result.alerts.map((alert: any) => ({
        ...alert,
        vendors: stripVendorPricing(alert.vendors, canViewFinancials),
      })),
    };
  }

  @Post('alerts/auto-create-pos')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.auto_generate')
  autoCreatePOs(@OrgContext() { organizationId, userId }: any) {
    return this.poService.autoCreatePOsForLowStock(organizationId, userId);
  }

  @Post('alerts/manual-create-pos')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.auto_generate')
  manualCreatePOs(@OrgContext() { organizationId, userId }: any, @Body() dto: ManualCreatePOsDto) {
    return this.poService.manualCreatePOsForLowStock(organizationId, userId, dto);
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.view')
  async getById(@OrgContext() { organizationId, canViewFinancials }: any, @Param('id', ParseIntPipe) poId: number) {
    const po = await this.poService.getById(organizationId, poId);
    return stripPOCost(po, canViewFinancials);
  }

  @Put(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.edit')
  updatePO(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) poId: number,
    @Body() updateData: UpdatePurchaseOrderDto,
  ) {
    return this.poService.updatePO(organizationId, poId, updateData);
  }

  @Delete(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.delete')
  deletePO(@OrgContext() { organizationId }: any, @Param('id', ParseIntPipe) poId: number) {
    return this.poService.deletePO(organizationId, poId);
  }

  @Post(':id/send')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.send')
  send(@OrgContext() { organizationId }: any, @Param('id', ParseIntPipe) poId: number) {
    return this.poService.send(organizationId, poId);
  }

  @Get('vendor/:vendorId/metrics')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.view')
  async getVendorMetrics(
    @OrgContext() { organizationId, canViewFinancials }: any,
    @Param('vendorId', ParseIntPipe) vendorId: number,
  ) {
    const metrics = await this.poService.getVendorMetrics(organizationId, vendorId);
    if (canViewFinancials) return metrics;
    const { totalValue, averageOrderValue, ...rest } = metrics;
    return rest;
  }

  @Post(':id/confirm-receipt')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.confirm_receipt')
  confirmReceipt(
    @OrgContext() { organizationId, userId }: any,
    @Param('id', ParseIntPipe) poId: number,
    @Body() confirmDto: ConfirmReceiptDto,
  ) {
    return this.poService.confirmReceipt(organizationId, poId, userId, confirmDto);
  }

  @Post('products/:productId/set-reorder-params')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_orders.edit')
  setProductReorderParams(
    @OrgContext() { organizationId }: any,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() setDto: SetProductReorderParamsDto,
  ) {
    return this.poService.setProductReorderParams(organizationId, productId, setDto);
  }

  @Public()
  @Post('search')
  async search(@Body() query: SearchRequestDto) {
    return this.poSearchService.search(2, query);
  }

  @Public()
  @Get('filters/columns/:columnName')
  async getColumnValues(@Param('columnName') columnName: string) {
    return this.poSearchService.getColumnValues(2, columnName);
  }
}
