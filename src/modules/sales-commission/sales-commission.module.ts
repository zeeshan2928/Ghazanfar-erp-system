import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SalesCommissionService } from './services/sales-commission.service';
import { SalesCommissionController } from './controllers/sales-commission.controller';

@Module({
  imports: [DatabaseModule],
  providers: [SalesCommissionService],
  controllers: [SalesCommissionController],
  exports: [SalesCommissionService],
})
export class SalesCommissionModule {}
