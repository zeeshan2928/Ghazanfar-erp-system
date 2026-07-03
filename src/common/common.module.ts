import { Module } from '@nestjs/common';
import { AppLoggerService } from './logging/logger.service';
import { TransactionService } from './services/transaction.service';
import { OrganizationContextService } from './services/organization-context.service';
import { FilterService } from './services/filter.service';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [AppLoggerService, TransactionService, OrganizationContextService, FilterService],
  exports: [AppLoggerService, TransactionService, OrganizationContextService, FilterService],
})
export class CommonModule {}
