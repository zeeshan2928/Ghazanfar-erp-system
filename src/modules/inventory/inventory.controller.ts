import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { InventorySearchService } from './services/inventory-search.service';
import { InventoryOperationsService } from './services/inventory-operations.service';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { Public } from '@common/decorators/public.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('inventory')
@UseGuards(JwtGuard)
export class InventoryController {
  constructor(
    private inventorySearchService: InventorySearchService,
    private inventoryOperationsService: InventoryOperationsService,
  ) {}

  @Post()
  async createInventory(@Body() data: any, @OrgContext() orgContext: any) {
    const organizationId = orgContext?.organizationId || 1;
    return this.inventoryOperationsService.createInventory(
      organizationId,
      data.productId,
      data.warehouseId,
      data.opening_balance || data.openingBalance || 0,
    );
  }

  @Public()
  @Post('search')
  async search(@Body() query: SearchRequestDto) {
    return this.inventorySearchService.search(2, query);
  }

  @Public()
  @Get('filters/columns/:columnName')
  async getColumnValues(@Param('columnName') columnName: string) {
    return this.inventorySearchService.getColumnValues(2, columnName);
  }
}
