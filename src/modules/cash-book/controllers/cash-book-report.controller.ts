import { Controller, Get, Query, UseGuards, BadRequestException, Res } from '@nestjs/common';
import { Response } from 'express';
import { CashBookReportService } from '../services/cash-book-report.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('cash-book')
@UseGuards(JwtGuard)
export class CashBookReportController {
  constructor(private reportService: CashBookReportService) {}

  /**
   * GET /cash-book/kpis - Get KPIs for reconciliation
   */
  @Get('kpis')
  async getKPIs(
    @OrgContext() orgContext: any,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    if (!fromDate || !toDate) {
      throw new BadRequestException('fromDate and toDate are required');
    }

    try {
      const kpis = await this.reportService.getKPIs(orgContext.organizationId, fromDate, toDate);
      return kpis;
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /cash-book/cash-flow - Get cash flow analysis
   */
  @Get('cash-flow')
  async getCashFlow(
    @OrgContext() orgContext: any,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    try {
      const cashFlow = await this.reportService.getCashFlow(
        orgContext.organizationId,
        groupBy,
        fromDate,
        toDate,
      );
      return cashFlow;
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /cash-book/discrepancies - Get discrepancies
   */
  @Get('discrepancies')
  async getDiscrepancies(
    @OrgContext() orgContext: any,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('category') category?: string,
  ) {
    try {
      const discrepancies = await this.reportService.getDiscrepancies(
        orgContext.organizationId,
        fromDate,
        toDate,
        category,
      );
      return discrepancies;
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /cash-book/unmatched-items - Get unmatched items by age
   */
  @Get('unmatched-items')
  async getUnmatchedItems(
    @OrgContext() orgContext: any,
    @Query('ageingDays') ageingDays: number = 30,
  ) {
    try {
      const items = await this.reportService.getUnmatchedItems(
        orgContext.organizationId,
        ageingDays,
      );
      return items;
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /cash-book/export - Export report as PDF or Excel
   */
  @Get('export')
  async exportReport(
    @OrgContext() orgContext: any,
    @Query('format') format: 'pdf' | 'excel',
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Res() res: Response,
  ) {
    if (!format || !fromDate || !toDate) {
      throw new BadRequestException('format, fromDate, and toDate are required');
    }

    if (!['pdf', 'excel'].includes(format)) {
      throw new BadRequestException('format must be pdf or excel');
    }

    try {
      const buffer = await this.reportService.exportReport(
        orgContext.organizationId,
        format,
        fromDate,
        toDate,
      );

      const mimeType =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const filename =
        format === 'pdf'
          ? `cash-book-report-${fromDate}-${toDate}.pdf`
          : `cash-book-report-${fromDate}-${toDate}.xlsx`;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
