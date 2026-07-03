import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  providers: [PurchaseOrdersService],
  controllers: [PurchaseOrdersController],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
