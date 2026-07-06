import { Controller, Get, Post, Query, HttpCode } from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ArApAgingService } from '../services/ar-ap-aging.service';

@Controller('ar-ap-aging')
export class ArApAgingController {
  constructor(private agingService: ArApAgingService) {}

  @Post('generate/ar')
  @HttpCode(200)
  @Public()
  async generateArAging(
    @OrgContext() organizationId: number,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    await this.agingService.generateArAging(organizationId, date);
    return { message: 'AR aging generated successfully', asOfDate: date.toISOString() };
  }

  @Post('generate/ap')
  @HttpCode(200)
  @Public()
  async generateApAging(
    @OrgContext() organizationId: number,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    await this.agingService.generateApAging(organizationId, date);
    return { message: 'AP aging generated successfully', asOfDate: date.toISOString() };
  }

  @Get('report/ar')
  @Public()
  async getArAgingReport(
    @OrgContext() organizationId: number,
    @Query('customerId') customerId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const cId = customerId ? parseInt(customerId) : undefined;
    const report = await this.agingService.getArAgingReport(organizationId, cId, date);
    return { summaries: report, asOfDate: date.toISOString() };
  }

  @Get('report/ap')
  @Public()
  async getApAgingReport(
    @OrgContext() organizationId: number,
    @Query('vendorId') vendorId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const vId = vendorId ? parseInt(vendorId) : undefined;
    const report = await this.agingService.getApAgingReport(organizationId, vId, date);
    return { summaries: report, asOfDate: date.toISOString() };
  }

  @Get('report/combined')
  @Public()
  async getCombinedAgingReport(
    @OrgContext() organizationId: number,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    return this.agingService.getArApAgingReport(organizationId, date);
  }
}
