import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { AdaptiveImportModule } from '@common/adaptive-import/adaptive-import.module';
import { SalesAnalysisController } from './sales-analysis.controller';
import { SalesAnalysisService } from './services/sales-analysis.service';
import { ProfitResolutionService } from './services/profit-resolution.service';
import { PartsClassificationService } from './services/parts-classification.service';
import { AssembledCostService } from './services/assembled-cost.service';

@Module({
  imports: [DatabaseModule, CommonModule, AdaptiveImportModule],
  controllers: [SalesAnalysisController],
  providers: [SalesAnalysisService, ProfitResolutionService, PartsClassificationService, AssembledCostService],
  exports: [SalesAnalysisService, ProfitResolutionService],
})
export class SalesAnalysisModule {}
