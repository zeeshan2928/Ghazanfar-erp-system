import { Module } from '@nestjs/common';
import { InventorySearchService } from './services/inventory-search.service';
import { InventoryReservationService } from './services/inventory-reservation.service';
import { InventoryOperationsService } from './services/inventory-operations.service';
import { InventoryCriticalFeaturesService } from './services/inventory-critical-features.service';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryOperationsController } from './controllers/inventory-operations.controller';
import { InventoryCriticalController } from './controllers/inventory-critical.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [InventoryController, InventoryOperationsController, InventoryCriticalController],
  providers: [
    InventorySearchService,
    InventoryReservationService,
    InventoryOperationsService,
    InventoryCriticalFeaturesService,
  ],
  exports: [
    InventorySearchService,
    InventoryReservationService,
    InventoryOperationsService,
    InventoryCriticalFeaturesService,
  ],
})
export class InventoryModule {}
