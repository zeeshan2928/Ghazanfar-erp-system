import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { ProductCostController } from './product-cost.controller';
import { ProductCostService } from './product-cost.service';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [ProductCostController],
  providers: [ProductCostService],
  exports: [ProductCostService],
})
export class ProductCostModule {}
