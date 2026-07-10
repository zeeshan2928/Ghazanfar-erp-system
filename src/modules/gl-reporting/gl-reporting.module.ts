import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { BalanceSheetService } from './services/balance-sheet.service';
import { IncomeStatementService } from './services/income-statement.service';
import { GeneralLedgerService } from './services/general-ledger.service';
import { CashJournalsService } from './services/cash-journals.service';
import { GLReportingController } from './controllers/gl-reporting.controller';

@Module({
  imports: [DatabaseModule, JournalEntriesModule],
  providers: [BalanceSheetService, IncomeStatementService, GeneralLedgerService, CashJournalsService],
  controllers: [GLReportingController],
  exports: [BalanceSheetService, IncomeStatementService, GeneralLedgerService, CashJournalsService],
})
export class GLReportingModule {}
