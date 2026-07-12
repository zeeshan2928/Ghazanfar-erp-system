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
import { PurchaseAnalysisService } from './services/purchase-analysis.service';

const UPLOAD_LIMIT = { limits: { fileSize: 25 * 1024 * 1024 } };

@Controller('purchase-analysis')
@UseGuards(JwtGuard)
export class PurchaseAnalysisController {
  constructor(private purchaseAnalysisService: PurchaseAnalysisService) {}

  @Post('analyze')
  @UseGuards(FinancialAccessGuard)
  @UseInterceptors(FileInterceptor('file', UPLOAD_LIMIT))
  async analyze(@UploadedFile() file: Express.Multer.File, @OrgContext() orgContext: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.purchaseAnalysisService.analyzeUpload(orgContext.organizationId, file);
  }

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
    return this.purchaseAnalysisService.importUpload(
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
    return this.purchaseAnalysisService.getUploads(orgContext.organizationId);
  }

  @Get('performance/vendors')
  @UseGuards(FinancialAccessGuard)
  async vendorsPerformance(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    return this.purchaseAnalysisService.getVendorsPerformance(orgContext.organizationId, fromDate, toDate);
  }

  @Get('performance/products')
  @UseGuards(FinancialAccessGuard)
  async productsPerformance(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @OrgContext() orgContext: any,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    return this.purchaseAnalysisService.getProductsPerformance(orgContext.organizationId, fromDate, toDate);
  }

  private resolveRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(0);
    return { fromDate, toDate };
  }
}
