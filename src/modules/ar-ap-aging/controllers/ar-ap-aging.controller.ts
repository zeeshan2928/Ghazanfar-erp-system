import { Controller, Get, Post, Query, HttpCode, UseGuards } from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ArApAgingService } from '../services/ar-ap-aging.service';

@Controller('ar-ap-aging')
@UseGuards(JwtGuard)
export class ArApAgingController {
  constructor(private agingService: ArApAgingService) {}

  @Post('generate/ar')
  @HttpCode(200)
  async generateArAging(
    @OrgContext() { organizationId }: any,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    await this.agingService.generateArAging(organizationId, date);
    return { message: 'AR aging generated successfully', asOfDate: date.toISOString() };
  }

  @Post('generate/ap')
  @HttpCode(200)
  async generateApAging(
    @OrgContext() { organizationId }: any,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    await this.agingService.generateApAging(organizationId, date);
    return { message: 'AP aging generated successfully', asOfDate: date.toISOString() };
  }

  @Get('report/ar')
  async getArAgingReport(
    @OrgContext() { organizationId }: any,
    @Query('customerId') customerId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const cId = customerId ? parseInt(customerId) : undefined;
    const report = await this.agingService.getArAgingReport(organizationId, cId, date);
    return { summaries: report, asOfDate: date.toISOString() };
  }

  @Get('report/ap')
  async getApAgingReport(
    @OrgContext() { organizationId }: any,
    @Query('vendorId') vendorId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const vId = vendorId ? parseInt(vendorId) : undefined;
    const report = await this.agingService.getApAgingReport(organizationId, vId, date);
    return { summaries: report, asOfDate: date.toISOString() };
  }

  @Get('report/combined')
  async getCombinedAgingReport(
    @OrgContext() { organizationId }: any,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    return this.agingService.getArApAgingReport(organizationId, date);
  }
}
