import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { SalesAnalysisController } from './sales-analysis.controller';
import { SalesAnalysisService } from './services/sales-analysis.service';
import { SalesAnalysisParserService } from './services/sales-analysis-parser.service';
import { ProfitResolutionService } from './services/profit-resolution.service';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [SalesAnalysisController],
  providers: [SalesAnalysisService, SalesAnalysisParserService, ProfitResolutionService],
  exports: [SalesAnalysisService, ProfitResolutionService],
})
export class SalesAnalysisModule {}
