import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { ProductsSearchService } from './services/products-search.service';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { Public } from '@common/decorators/public.decorator';

@Controller('products')
@UseGuards(JwtGuard)
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private productsSearchService: ProductsSearchService,
  ) {}

  @Get(':productId/purchase-history')
  async getPurchaseHistory(
    @Param('productId') productId: string,
    @OrgContext() orgContext: any,
  ) {
    return this.productsService.getPurchaseHistory(
      orgContext.organizationId,
      parseInt(productId, 10),
      5,
    );
  }

  @Public()
  @Post('search')
  async search(
    @Body() query: SearchRequestDto,
  ) {
    return this.productsSearchService.search(2, query);
  }

  @Public()
  @Get('filters/columns/:columnName')
  async getColumnValues(
    @Param('columnName') columnName: string,
  ) {
    return this.productsSearchService.getColumnValues(
      2,
      columnName,
    );
  }
}
