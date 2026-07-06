import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { ProductsSearchService } from './services/products-search.service';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('products')
@UseGuards(JwtGuard)
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private productsSearchService: ProductsSearchService,
  ) {}

  @Post()
  async createProduct(@Body() data: any, @OrgContext() orgContext: any) {
    const organizationId = orgContext?.organizationId || 1; // Default to org 1 if missing
    console.log('Creating product for org:', organizationId, 'data:', data);
    return this.productsService.createProduct(organizationId, data);
  }

  @Get(':productId/purchase-history')
  async getPurchaseHistory(@Param('productId') productId: string, @OrgContext() orgContext: any) {
    return this.productsService.getPurchaseHistory(
      orgContext.organizationId,
      parseInt(productId, 10),
      5,
    );
  }

  @Post('search')
  async search(@Body() query: SearchRequestDto, @OrgContext() orgContext: any) {
    return this.productsSearchService.search(orgContext.organizationId, query);
  }

  @Get('filters/columns/:columnName')
  async getColumnValues(@Param('columnName') columnName: string, @OrgContext() orgContext: any) {
    return this.productsSearchService.getColumnValues(orgContext.organizationId, columnName);
  }
}
