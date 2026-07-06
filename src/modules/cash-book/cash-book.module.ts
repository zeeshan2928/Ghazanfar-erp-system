import { Module } from '@nestjs/common';
import { CashBookEntryService } from './services/cash-book-entry.service';
import { CashBookReportService } from './services/cash-book-report.service';
import { BillMatchingService } from './services/bill-matching.service';
import { BankReconciliationService } from './services/bank-reconciliation.service';
import { ApprovalService } from './services/approval.service';
import { AuditService } from './services/audit.service';
import { CashBookEntryController } from './controllers/cash-book-entry.controller';
import { CashBookReportController } from './controllers/cash-book-report.controller';
import { BillMatchingController } from './controllers/bill-matching.controller';
import { BankReconciliationController } from './controllers/bank-reconciliation.controller';
import { ApprovalController } from './controllers/approval.controller';
import { AuditController } from './controllers/audit.controller';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CashBookEntryController,
    CashBookReportController,
    BillMatchingController,
    BankReconciliationController,
    ApprovalController,
    AuditController,
  ],
  providers: [
    CashBookEntryService,
    CashBookReportService,
    BillMatchingService,
    BankReconciliationService,
    ApprovalService,
    AuditService,
  ],
  exports: [
    CashBookEntryService,
    CashBookReportService,
    BillMatchingService,
    BankReconciliationService,
    ApprovalService,
    AuditService,
  ],
})
export class CashBookModule {}
