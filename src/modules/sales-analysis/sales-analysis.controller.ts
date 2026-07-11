import {
  Controller,
  Post,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '@common/guards/jwt.guard';
import { FinancialAccessGuard } from '@common/guards/financial-access.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { SalesAnalysisService } from './services/sales-analysis.service';
import { ProfitResolutionService } from './services/profit-resolution.service';

@Controller('sales-analysis')
@UseGuards(JwtGuard)
export class SalesAnalysisController {
  constructor(
    private salesAnalysisService: SalesAnalysisService,
    private profitResolution: ProfitResolutionService,
  ) {}

  @Post('upload')
  @UseGuards(FinancialAccessGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File, @OrgContext() orgContext: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.salesAnalysisService.ingestUpload(
      orgContext.organizationId,
      orgContext.userId,
      file,
    );
  }

  @Get('uploads')
  @UseGuards(FinancialAccessGuard)
  async uploads(@OrgContext() orgContext: any) {
    return this.salesAnalysisService.getUploads(orgContext.organizationId);
  }

  @Get('performance/salesmen')
  @UseGuards(FinancialAccessGuard)
  async salesmenPerformance(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    return this.salesAnalysisService.getSalesmenPerformance(
      orgContext.organizationId,
      fromDate,
      toDate,
    );
  }

  @Get('performance/products')
  @UseGuards(FinancialAccessGuard)
  async productsPerformance(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    return this.salesAnalysisService.getProductsPerformance(
      orgContext.organizationId,
      fromDate,
      toDate,
    );
  }

  @Get('performance/customers')
  @UseGuards(FinancialAccessGuard)
  async customersPerformance(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    return this.salesAnalysisService.getCustomersPerformance(
      orgContext.organizationId,
      fromDate,
      toDate,
    );
  }

  @Get('gross-profit-summary')
  @UseGuards(FinancialAccessGuard)
  async grossProfitSummary(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    return this.profitResolution.getGrossProfitSummary(orgContext.organizationId, fromDate, toDate);
  }

  private resolveRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(0);
    return { fromDate, toDate };
  }
}
