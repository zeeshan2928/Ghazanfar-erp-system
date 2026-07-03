import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  ConfirmReceiptDto,
  SetProductReorderParamsDto,
} from './dto/purchase-order.dto';
import { OrgContext } from 'src/common/decorators/org-context.decorator';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  create(
    @OrgContext() { organizationId, userId }: any,
    @Body() createDto: CreatePurchaseOrderDto,
  ) {
    return this.poService.create(organizationId, userId, createDto);
  }

  @Get('draft')
  getDraft(
    @OrgContext() { organizationId }: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip = 0,
    @Query('take', new ParseIntPipe({ optional: true })) take = 10,
  ) {
    return this.poService.getDraft(organizationId, skip, take);
  }

  @Get('sent')
  getSent(
    @OrgContext() { organizationId }: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip = 0,
    @Query('take', new ParseIntPipe({ optional: true })) take = 10,
  ) {
    return this.poService.getSent(organizationId, skip, take);
  }

  @Get('received')
  getReceived(
    @OrgContext() { organizationId }: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip = 0,
    @Query('take', new ParseIntPipe({ optional: true })) take = 10,
  ) {
    return this.poService.getReceived(organizationId, skip, take);
  }

  @Get('alerts/low-stock')
  getLowStockAlerts(
    @OrgContext() { organizationId }: any,
  ) {
    return this.poService.getLowStockAlerts(organizationId);
  }

  @Post('alerts/auto-create-pos')
  autoCreatePOs(
    @OrgContext() { organizationId, userId }: any,
  ) {
    return this.poService.autoCreatePOsForLowStock(organizationId, userId);
  }

  @Get(':id')
  getById(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) poId: number,
  ) {
    return this.poService.getById(organizationId, poId);
  }

  @Post(':id/send')
  send(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) poId: number,
  ) {
    return this.poService.send(organizationId, poId);
  }

  @Post(':id/confirm-receipt')
  confirmReceipt(
    @OrgContext() { organizationId, userId }: any,
    @Param('id', ParseIntPipe) poId: number,
    @Body() confirmDto: ConfirmReceiptDto,
  ) {
    return this.poService.confirmReceipt(organizationId, poId, userId, confirmDto);
  }

  @Post('products/:productId/set-reorder-params')
  setProductReorderParams(
    @OrgContext() { organizationId }: any,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() setDto: SetProductReorderParamsDto,
  ) {
    return this.poService.setProductReorderParams(organizationId, productId, setDto);
  }
}
