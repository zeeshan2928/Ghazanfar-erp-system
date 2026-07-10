import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { ProductsSearchService } from './services/products-search.service';
import { ProductMediaService } from './services/product-media.service';
import { ProductsController } from './products.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsSearchService, ProductMediaService],
  exports: [ProductsService, ProductsSearchService, ProductMediaService],
})
export class ProductsModule {}
