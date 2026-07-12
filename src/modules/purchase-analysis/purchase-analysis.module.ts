import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { AdaptiveImportModule } from '@common/adaptive-import/adaptive-import.module';
import { PurchaseAnalysisController } from './purchase-analysis.controller';
import { PurchaseAnalysisService } from './services/purchase-analysis.service';

@Module({
  imports: [DatabaseModule, CommonModule, AdaptiveImportModule],
  controllers: [PurchaseAnalysisController],
  providers: [PurchaseAnalysisService],
  exports: [PurchaseAnalysisService],
})
export class PurchaseAnalysisModule {}
