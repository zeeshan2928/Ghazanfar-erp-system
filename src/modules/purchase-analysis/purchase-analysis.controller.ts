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
import { PurchaseAnalysisService } from './services/purchase-analysis.service';

@Controller('purchase-analysis')
@UseGuards(JwtGuard)
export class PurchaseAnalysisController {
  constructor(private purchaseAnalysisService: PurchaseAnalysisService) {}

  @Post('upload')
  @UseGuards(FinancialAccessGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @OrgContext() orgContext: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.purchaseAnalysisService.ingestUpload(
      orgContext.organizationId,
      orgContext.userId,
      file,
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
