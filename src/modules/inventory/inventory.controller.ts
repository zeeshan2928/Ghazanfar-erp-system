import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { InventorySearchService } from './services/inventory-search.service';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('inventory')
@UseGuards(JwtGuard)
export class InventoryController {
  constructor(private inventorySearchService: InventorySearchService) {}

  @Post('search')
  async search(
    @Body() query: SearchRequestDto,
    @OrgContext() orgContext: any,
  ) {
    return this.inventorySearchService.search(orgContext.organizationId, query);
  }

  @Get('filters/columns/:columnName')
  async getColumnValues(
    @Param('columnName') columnName: string,
    @OrgContext() orgContext: any,
  ) {
    return this.inventorySearchService.getColumnValues(
      orgContext.organizationId,
      columnName,
    );
  }
}
