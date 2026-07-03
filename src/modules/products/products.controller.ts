import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('products')
@UseGuards(JwtGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

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
}
