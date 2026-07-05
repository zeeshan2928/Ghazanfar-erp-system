import { Module } from '@nestjs/common';
import { InventorySearchService } from './services/inventory-search.service';
import { InventoryReservationService } from './services/inventory-reservation.service';
import { InventoryController } from './controllers/inventory.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [InventoryController],
  providers: [InventorySearchService, InventoryReservationService],
  exports: [InventorySearchService, InventoryReservationService],
})
export class InventoryModule {}
