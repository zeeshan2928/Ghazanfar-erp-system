import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('manufacturing.view')
  async getById(@Param('id') id: string, @OrgContext() orgContext: any) {
    return this.manufacturingOrdersService.getById(orgContext.organizationId, parseInt(id, 10));
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
