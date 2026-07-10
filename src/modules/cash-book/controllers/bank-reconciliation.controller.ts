import { Controller, Post, Get, Body, UseGuards, Param, Query } from '@nestjs/common';
import { BankReconciliationService } from '../services/bank-reconciliation.service';
import { CreateBankStatementDto } from '../dto/create-bank-statement.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('cash-book/reconciliation')
@UseGuards(JwtGuard)
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  /**
   * POST /cash-book/reconciliation/upload
   * Upload bank statements
   */
  @Post('upload')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.reconcile')
  async uploadBankStatements(
    @Body() statements: CreateBankStatementDto[],
    @OrgContext() orgContext: any,
  ) {
    return this.service.uploadBankStatements(orgContext.organizationId, statements);
  }

  /**
   * POST /cash-book/reconciliation/process
   * Process reconciliation matching
   */
  @Post('process')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.reconcile')
  async processReconciliation(@OrgContext() orgContext: any) {
    return this.service.processReconciliation(orgContext.organizationId);
  }

  /**
   * POST /cash-book/reconciliation/complete
   * Complete reconciliation
   */
  @Post('complete')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.reconcile')
  async completeReconciliation(@OrgContext() orgContext: any) {
    return this.service.completeReconciliation(orgContext.organizationId);
  }

  /**
   * GET /cash-book/reconciliation/unmatched
   * Get unmatched bank statements
   */
  @Get('unmatched')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.view')
  async getUnmatchedStatements(
    @OrgContext() orgContext: any,
    @Query('daysOld') daysOld: string = '30',
  ) {
    return this.service.getUnmatchedStatements(orgContext.organizationId, parseInt(daysOld, 10));
  }
}
