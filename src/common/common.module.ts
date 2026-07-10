import { Module } from '@nestjs/common';
import { AppLoggerService } from './logging/logger.service';
import { TransactionService } from './services/transaction.service';
import { OrganizationContextService } from './services/organization-context.service';
import { FilterService } from './services/filter.service';
import { TransactionSequenceService } from './services/transaction-sequence.service';
import { MailerService } from './services/mailer.service';
import { MediaStorageService } from './services/media-storage.service';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [AppLoggerService, TransactionService, OrganizationContextService, FilterService, TransactionSequenceService, MailerService, MediaStorageService],
  exports: [AppLoggerService, TransactionService, OrganizationContextService, FilterService, TransactionSequenceService, MailerService, MediaStorageService],
})
export class CommonModule {}
