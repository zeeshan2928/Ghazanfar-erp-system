import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { BalanceSheetService } from './services/balance-sheet.service';
import { IncomeStatementService } from './services/income-statement.service';
import { GLReportingController } from './controllers/gl-reporting.controller';

@Module({
  imports: [DatabaseModule, JournalEntriesModule],
  providers: [BalanceSheetService, IncomeStatementService],
  controllers: [GLReportingController],
  exports: [BalanceSheetService, IncomeStatementService],
})
export class GLReportingModule {}
