import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { InventoryModule } from '../inventory/inventory.module';
import { WarehouseTransfersController } from './warehouse-transfers.controller';
import { WarehouseTransfersService } from './services/warehouse-transfers.service';

@Module({
  imports: [DatabaseModule, CommonModule, InventoryModule],
  controllers: [WarehouseTransfersController],
  providers: [WarehouseTransfersService],
  exports: [WarehouseTransfersService],
})
export class WarehouseTransfersModule {}
