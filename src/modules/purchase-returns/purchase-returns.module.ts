import { Module } from '@nestjs/common';
import { PurchaseReturnsService } from './services/purchase-returns.service';
import { PurchaseReturnsController } from './purchase-returns.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CommonModule } from 'src/common/common.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [DatabaseModule, CommonModule, InventoryModule],
  providers: [PurchaseReturnsService],
  controllers: [PurchaseReturnsController],
  exports: [PurchaseReturnsService],
})
export class PurchaseReturnsModule {}
