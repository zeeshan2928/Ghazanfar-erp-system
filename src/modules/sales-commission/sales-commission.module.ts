import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SalesCommissionService } from './services/sales-commission.service';
import { SalesmanProductCommissionService } from './services/salesman-product-commission.service';
import { SalesCommissionController } from './controllers/sales-commission.controller';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';

@Module({
  imports: [DatabaseModule, ChartOfAccountsModule, JournalEntriesModule],
  providers: [SalesCommissionService, SalesmanProductCommissionService],
  controllers: [SalesCommissionController],
  exports: [SalesCommissionService, SalesmanProductCommissionService],
})
export class SalesCommissionModule {}
