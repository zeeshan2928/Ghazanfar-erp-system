import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { WarehousesService } from './services/warehouses.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('warehouses')
@UseGuards(JwtGuard)
export class WarehousesController {
  constructor(private warehousesService: WarehousesService) {}

  @Get('product/:productId/stock')
  async getProductStock(
    @Param('productId') productId: string,
    @OrgContext() orgContext: any,
  ) {
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
