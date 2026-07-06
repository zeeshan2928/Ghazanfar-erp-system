import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WarehousesService } from './services/warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('warehouses')
@UseGuards(JwtGuard)
export class WarehousesController {
  constructor(private warehousesService: WarehousesService) {}

  @Post()
  async create(@Body() createWarehouseDto: CreateWarehouseDto, @OrgContext() orgContext: any) {
    return this.warehousesService.create(orgContext.organizationId, createWarehouseDto);
  }

  @Get('product/:productId/stock')
  async getProductStock(@Param('productId') productId: string, @OrgContext() orgContext: any) {
    return this.warehousesService.getStockByProduct(
      orgContext.organizationId,
      parseInt(productId, 10),
    );
  }

  @Get()
  async getAll(@OrgContext() orgContext: any) {
    return this.warehousesService.getAll(orgContext.organizationId);
  }
}
