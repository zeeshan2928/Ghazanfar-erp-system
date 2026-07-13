import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '@common/guards/jwt.guard';
import { FinancialAccessGuard } from '@common/guards/financial-access.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { ColumnMapping, Structure } from '@common/adaptive-import/adaptive-import.types';
import { SalesAnalysisService } from './services/sales-analysis.service';
import { PartsClassificationService } from './services/parts-classification.service';
import { AssembledCostService } from './services/assembled-cost.service';

const UPLOAD_LIMIT = { limits: { fileSize: 25 * 1024 * 1024 } };

@Controller('sales-analysis')
@UseGuards(JwtGuard)
export class SalesAnalysisController {
  constructor(
    private salesAnalysisService: SalesAnalysisService,
    private partsClassification: PartsClassificationService,
    private assembledCost: AssembledCostService,
  ) {}

  // Step 1: study the uploaded file, return a proposed column mapping +
  // preview (no DB writes) for the user to confirm.
  @Post('analyze')
  @UseGuards(FinancialAccessGuard)
  @UseInterceptors(FileInterceptor('file', UPLOAD_LIMIT))
  async analyze(@UploadedFile() file: Express.Multer.File, @OrgContext() orgContext: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.salesAnalysisService.analyzeUpload(orgContext.organizationId, file);
  }

  // Step 2: import with the confirmed mapping. `mapping` + `structure` +
  // `headerRowIndex` arrive as form fields alongside the re-sent file.
  @Post('import')
  @UseGuards(FinancialAccessGuard)
  @UseInterceptors(FileInterceptor('file', UPLOAD_LIMIT))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { mapping?: string; structure?: string; headerRowIndex?: string },
    @OrgContext() orgContext: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    let mapping: ColumnMapping;
    try {
      mapping = JSON.parse(body.mapping || '{}');
    } catch {
      throw new BadRequestException('Invalid mapping');
    }
    const structure = (body.structure === 'MULTI_ROW' ? 'MULTI_ROW' : 'FLAT') as Structure;
    const headerRowIndex = parseInt(body.headerRowIndex || '0', 10) || 0;
    return this.salesAnalysisService.importUpload(
      orgContext.organizationId,
      orgContext.userId,
      file,
      headerRowIndex,
      mapping,
      structure,
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
    return this.salesAnalysisService.getGrossProfitSummary(orgContext.organizationId, fromDate, toDate);
  }

  // ---- Parts classification (vendor-supplied components vs genuine sales) ----
  @Get('parts/candidates')
  @UseGuards(FinancialAccessGuard)
  async partsCandidates(@OrgContext() orgContext: any) {
    return this.partsClassification.getCandidates(orgContext.organizationId);
  }

  @Post('parts/classify')
  @UseGuards(FinancialAccessGuard)
  async classifyParts(
    @Body() body: { items: { itemName: string; kind: 'PART' | 'SALE' }[] },
    @OrgContext() orgContext: any,
  ) {
    if (!body || !Array.isArray(body.items)) throw new BadRequestException('items array required');
    return this.partsClassification.saveClassifications(orgContext.organizationId, body.items);
  }

  @Get('parts/report')
  @UseGuards(FinancialAccessGuard)
  async partsReport(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    return this.partsClassification.getPartsReport(orgContext.organizationId, fromDate, toDate);
  }

  // ---- Assembled-model costs (BOM) : items we build, so no purchase price ----
  @Get('assembled-costs/candidates')
  @UseGuards(FinancialAccessGuard)
  async assembledCandidates(@Query('limit') limit: string | undefined, @OrgContext() orgContext: any) {
    const n = limit ? parseInt(limit, 10) : 200;
    return this.assembledCost.getCandidates(
      orgContext.organizationId,
      Number.isFinite(n) && n > 0 ? n : 200,
    );
  }

  @Get('assembled-costs/formulas')
  @UseGuards(FinancialAccessGuard)
  async assembledFormulas(@OrgContext() orgContext: any) {
    return { formulas: await this.assembledCost.getFormulas(orgContext.organizationId) };
  }

  @Post('assembled-costs/map')
  @UseGuards(FinancialAccessGuard)
  async mapAssembledCosts(
    @Body() body: { items: { itemName: string; formulaId?: number | null; manualCost?: number | null }[] },
    @OrgContext() orgContext: any,
  ) {
    if (!body || !Array.isArray(body.items)) throw new BadRequestException('items array required');
    return this.assembledCost.saveMappings(orgContext.organizationId, body.items);
  }

  // Source-file rows whose stated total contradicts quantity x price.
  @Get('data-anomalies')
  @UseGuards(FinancialAccessGuard)
  async dataAnomalies(@OrgContext() orgContext: any) {
    return this.assembledCost.getDataAnomalies(orgContext.organizationId);
  }

  @Get('performance/category')
  @UseGuards(FinancialAccessGuard)
  async categoryPerformance(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    return this.salesAnalysisService.getCategoryPerformance(orgContext.organizationId, fromDate, toDate);
  }

  @Get('performance/brand')
  @UseGuards(FinancialAccessGuard)
  async brandPerformance(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    return this.salesAnalysisService.getBrandPerformance(orgContext.organizationId, fromDate, toDate);
  }

  @Get('discount-summary')
  @UseGuards(FinancialAccessGuard)
  async discountSummary(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    return this.salesAnalysisService.getDiscountSummary(orgContext.organizationId, fromDate, toDate);
  }

  private resolveRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(0);
    return { fromDate, toDate };
  }
}
