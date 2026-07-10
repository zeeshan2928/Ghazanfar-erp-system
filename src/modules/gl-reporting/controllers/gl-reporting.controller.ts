import { Controller, Get, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { FinancialAccessGuard } from '../../../common/guards/financial-access.guard';
import { BalanceSheetService } from '../services/balance-sheet.service';
import { IncomeStatementService } from '../services/income-statement.service';
import { GeneralLedgerService } from '../services/general-ledger.service';
import { CashJournalsService } from '../services/cash-journals.service';

@Controller('gl-reporting')
@UseGuards(JwtGuard)
export class GLReportingController {
  constructor(
    private balanceSheetService: BalanceSheetService,
    private incomeStatementService: IncomeStatementService,
    private generalLedgerService: GeneralLedgerService,
    private cashJournalsService: CashJournalsService,
  ) {}

  @Get('balance-sheet')
  @UseGuards(FinancialAccessGuard)
  async getBalanceSheet(
    @OrgContext() { organizationId }: any,
    @Query('asOf') asOf?: string,
  ) {
    return this.balanceSheetService.getBalanceSheet(
      organizationId,
      asOf ? new Date(asOf) : new Date(),
    );
  }

  @Get('income-statement')
  @UseGuards(FinancialAccessGuard)
  async getIncomeStatement(
    @OrgContext() { organizationId }: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    return this.incomeStatementService.getIncomeStatement(
      organizationId,
      fromDate,
      toDate,
    );
  }

  @Get('general-ledger')
  async getGeneralLedger(
    @OrgContext() { organizationId }: any,
    @Query('accountId', ParseIntPipe) accountId: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    return this.generalLedgerService.getAccountLedger(
      organizationId,
      accountId,
      fromDate,
      toDate,
    );
  }

  @Get('cash-receipts-journal')
  async getCashReceiptsJournal(
    @OrgContext() { organizationId }: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    return this.cashJournalsService.getCashReceiptsJournal(organizationId, fromDate, toDate);
  }

  @Get('cash-disbursements-journal')
  async getCashDisbursementsJournal(
    @OrgContext() { organizationId }: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    return this.cashJournalsService.getCashDisbursementsJournal(organizationId, fromDate, toDate);
  }
}
