import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { InventorySearchService } from './services/inventory-search.service';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { Public } from '@common/decorators/public.decorator';

@Controller('inventory')
@UseGuards(JwtGuard)
export class InventoryController {
  constructor(private inventorySearchService: InventorySearchService) {}

  @Public()
  @Post('search')
  async search(
    @Body() query: SearchRequestDto,
  ) {
    return this.inventorySearchService.search(2, query);
  }

  @Public()
  @Get('filters/columns/:columnName')
  async getColumnValues(
    @Param('columnName') columnName: string,
  ) {
    return this.inventorySearchService.getColumnValues(
      2,
      columnName,
    );
  }
}
