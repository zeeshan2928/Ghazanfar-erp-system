import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SalesCommissionService } from './services/sales-commission.service';

@Module({
  imports: [DatabaseModule],
  providers: [SalesCommissionService],
  exports: [SalesCommissionService],
})
export class SalesCommissionModule {}
