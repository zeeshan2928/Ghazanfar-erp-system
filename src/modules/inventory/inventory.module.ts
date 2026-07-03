import { Module } from '@nestjs/common';
import { InventorySearchService } from './services/inventory-search.service';
import { InventoryController } from './inventory.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [InventoryController],
  providers: [InventorySearchService],
  exports: [InventorySearchService],
})
export class InventoryModule {}
