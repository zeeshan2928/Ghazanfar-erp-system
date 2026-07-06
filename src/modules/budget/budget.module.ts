import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { BudgetService } from './services/budget.service';
import { BudgetController } from './controllers/budget.controller';

@Module({
  imports: [DatabaseModule, JournalEntriesModule],
  providers: [BudgetService],
  controllers: [BudgetController],
  exports: [BudgetService],
})
export class BudgetModule {}
