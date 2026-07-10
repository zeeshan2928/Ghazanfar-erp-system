import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { SalesOrdersService } from '../services/sales-orders.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { ConvertToInvoiceDto } from '../dto/convert-to-invoice.dto';
import { SalesOrderStatus } from '@prisma/client';

@Controller('sales-orders')
@UseGuards(JwtGuard)
export class SalesOrdersController {
  constructor(private readonly service: SalesOrdersService) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('sales_orders.create')
  async create(@Body() dto: CreateSalesOrderDto, @OrgContext() { organizationId, userId }: any) {
    return this.service.create(organizationId, userId, dto);
  }

  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('sales_orders.view')
  async findAll(@Query('status') status: SalesOrderStatus | undefined, @OrgContext() { organizationId }: any) {
    return this.service.findAll(organizationId, status);
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('sales_orders.view')
  async findOne(@Param('id') id: string, @OrgContext() { organizationId }: any) {
    return this.service.findOne(organizationId, parseInt(id, 10));
  }

  @Post(':id/cancel')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('sales_orders.cancel')
  async cancel(@Param('id') id: string, @OrgContext() { organizationId }: any) {
    return this.service.cancel(organizationId, parseInt(id, 10));
  }

  @Post(':id/convert-to-invoice')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('sales_orders.convert')
  async convertToInvoice(
    @Param('id') id: string,
    @Body() dto: ConvertToInvoiceDto,
    @OrgContext() { organizationId, userId }: any,
  ) {
    return this.service.convertToInvoice(organizationId, userId, parseInt(id, 10), dto);
  }
}
