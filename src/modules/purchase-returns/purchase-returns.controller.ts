import { Controller, Post, Get, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PurchaseReturnsService } from './services/purchase-returns.service';
import { CreatePurchaseReturnDto } from './dto/purchase-return.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from 'src/common/decorators/org-context.decorator';

@Controller('purchase-returns')
@UseGuards(JwtGuard)
export class PurchaseReturnsController {
  constructor(private readonly returnsService: PurchaseReturnsService) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_returns.create')
  create(@OrgContext() { organizationId, userId }: any, @Body() dto: CreatePurchaseReturnDto) {
    return this.returnsService.create(organizationId, userId, dto);
  }

  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_returns.view')
  list(
    @OrgContext() { organizationId }: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip = 0,
    @Query('take', new ParseIntPipe({ optional: true })) take = 20,
  ) {
    return this.returnsService.list(organizationId, skip, take);
  }

  @Get('vendor/:vendorId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_returns.view')
  getByVendor(@OrgContext() { organizationId }: any, @Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.returnsService.getByVendor(organizationId, vendorId);
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('purchase_returns.view')
  getById(@OrgContext() { organizationId }: any, @Param('id', ParseIntPipe) id: number) {
    return this.returnsService.getById(organizationId, id);
  }
}
