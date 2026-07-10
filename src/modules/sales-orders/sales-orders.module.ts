import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { BillsModule } from '../bills/bills.module';
import { SalesOrdersService } from './services/sales-orders.service';
import { SalesOrdersController } from './controllers/sales-orders.controller';

@Module({
  imports: [DatabaseModule, CommonModule, BillsModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
