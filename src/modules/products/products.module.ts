import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { ProductsSearchService } from './services/products-search.service';
import { ProductMediaService } from './services/product-media.service';
import { ProductSeedService } from './services/product-seed.service';
import { ProductsController } from './products.controller';
import { ProductSeedController } from './product-seed.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [ProductsController, ProductSeedController],
  providers: [ProductsService, ProductsSearchService, ProductMediaService, ProductSeedService],
  exports: [ProductsService, ProductsSearchService, ProductMediaService, ProductSeedService],
})
export class ProductsModule {}
