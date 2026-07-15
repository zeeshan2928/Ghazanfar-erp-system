import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { PurchaseOrdersSearchService } from './services/purchase-orders-search.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CommonModule } from 'src/common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [DatabaseModule, CommonModule, NotificationsModule, InventoryModule],
  providers: [PurchaseOrdersService, PurchaseOrdersSearchService],
  controllers: [PurchaseOrdersController],
  exports: [PurchaseOrdersService, PurchaseOrdersSearchService],
})
export class PurchaseOrdersModule {}
