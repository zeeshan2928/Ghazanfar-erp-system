import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ManufacturingOrdersController } from './manufacturing-orders.controller';
import { ManufacturingOrdersService } from './services/manufacturing-orders.service';

@Module({
  imports: [DatabaseModule, CommonModule, InventoryModule],
  controllers: [ManufacturingOrdersController],
  providers: [ManufacturingOrdersService],
  exports: [ManufacturingOrdersService],
})
export class ManufacturingOrdersModule {}
