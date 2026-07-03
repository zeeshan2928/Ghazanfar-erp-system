import { Module } from '@nestjs/common';
import { AppLoggerService } from './logging/logger.service';
import { TransactionService } from './services/transaction.service';
import { OrganizationContextService } from './services/organization-context.service';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [AppLoggerService, TransactionService, OrganizationContextService],
  exports: [AppLoggerService, TransactionService, OrganizationContextService],
})
export class CommonModule {}
