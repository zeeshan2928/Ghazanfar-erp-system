import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './services/products.service';
import { ProductsSearchService } from './services/products-search.service';
import { ProductMediaService } from './services/product-media.service';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { stripProductCost, stripProductCostList } from '@common/utils/financial-visibility.util';

@Controller('products')
@UseGuards(JwtGuard)
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private productsSearchService: ProductsSearchService,
    private productMediaService: ProductMediaService,
  ) {}

  @Post()
  async createProduct(@Body() data: CreateProductDto, @OrgContext() orgContext: any) {
    const product = await this.productsService.createProduct(orgContext.organizationId, data);
    // cost_price is Decimal - serializes to JSON as a string ("90000") unless
    // converted; keep the response shape a real number.
    return stripProductCost({ ...product, cost_price: Number(product.cost_price) }, orgContext.canViewFinancials);
  }

  @Get(':productId')
  async getById(@Param('productId') productId: string, @OrgContext() orgContext: any) {
    const product = await this.productsService.getById(orgContext.organizationId, parseInt(productId, 10));
    return stripProductCost(product, orgContext.canViewFinancials);
  }

  @Get(':productId/purchase-history')
  async getPurchaseHistory(@Param('productId') productId: string, @OrgContext() orgContext: any) {
    const history = await this.productsService.getPurchaseHistory(
      orgContext.organizationId,
      parseInt(productId, 10),
      5,
    );
    if (orgContext.canViewFinancials) return history;
    return history.map((h: any) => {
      const { costPrice, ...rest } = h;
      return rest;
    });
  }

  @Post('search')
  async search(@Body() query: SearchRequestDto, @OrgContext() orgContext: any) {
    const result = await this.productsSearchService.search(orgContext.organizationId, query);
    return { ...result, data: stripProductCostList(result.data, orgContext.canViewFinancials) };
  }

  @Get('filters/columns/:columnName')
  async getColumnValues(@Param('columnName') columnName: string, @OrgContext() orgContext: any) {
    return this.productsSearchService.getColumnValues(orgContext.organizationId, columnName);
  }

  @Post(':productId/media')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadMedia(
    @Param('productId', ParseIntPipe) productId: number,
    @UploadedFile() file: Express.Multer.File,
    @OrgContext() orgContext: any,
  ) {
    return this.productMediaService.upload(orgContext.organizationId, productId, file);
  }

  @Get(':productId/media')
  async listMedia(@Param('productId', ParseIntPipe) productId: number, @OrgContext() orgContext: any) {
    return this.productMediaService.list(orgContext.organizationId, productId);
  }

  @Post(':productId/media/:mediaId/set-primary')
  async setPrimaryMedia(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @OrgContext() orgContext: any,
  ) {
    return this.productMediaService.setPrimary(orgContext.organizationId, productId, mediaId);
  }

  @Delete(':productId/media/:mediaId')
  async deleteMedia(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @OrgContext() orgContext: any,
  ) {
    await this.productMediaService.remove(orgContext.organizationId, productId, mediaId);
    return { success: true };
  }
}
