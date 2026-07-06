import { Controller, Get, Query } from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { BalanceSheetService } from '../services/balance-sheet.service';
import { IncomeStatementService } from '../services/income-statement.service';

@Controller('gl-reporting')
export class GLReportingController {
  constructor(
    private balanceSheetService: BalanceSheetService,
    private incomeStatementService: IncomeStatementService,
  ) {}

  @Get('balance-sheet')
  @Public()
  async getBalanceSheet(
    @OrgContext() organizationId: number,
    @Query('asOf') asOf?: string,
  ) {
    return this.balanceSheetService.getBalanceSheet(
      organizationId,
      asOf ? new Date(asOf) : new Date(),
    );
  }

  @Get('income-statement')
  @Public()
  async getIncomeStatement(
    @OrgContext() organizationId: number,
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
}
