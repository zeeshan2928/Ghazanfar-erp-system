import { Module } from '@nestjs/common';
import { WarehousesService } from './services/warehouses.service';
import { WarehousesController } from './warehouses.controller';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WarehousesController],
  providers: [WarehousesService],
  exports: [WarehousesService],
})
export class WarehousesModule {}
