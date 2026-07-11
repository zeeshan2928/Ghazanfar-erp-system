import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { PurchaseAnalysisController } from './purchase-analysis.controller';
import { PurchaseAnalysisService } from './services/purchase-analysis.service';
import { PurchaseAnalysisParserService } from './services/purchase-analysis-parser.service';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [PurchaseAnalysisController],
  providers: [PurchaseAnalysisService, PurchaseAnalysisParserService],
  exports: [PurchaseAnalysisService],
})
export class PurchaseAnalysisModule {}
