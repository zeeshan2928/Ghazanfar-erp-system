import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProductCategoriesService } from './services/product-categories.service';
import { ProductCategoriesController } from './controllers/product-categories.controller';

@Module({
  imports: [DatabaseModule],
  providers: [ProductCategoriesService],
  controllers: [ProductCategoriesController],
  exports: [ProductCategoriesService],
})
export class ProductCategoriesModule {}
