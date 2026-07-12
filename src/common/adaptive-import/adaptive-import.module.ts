import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AdaptiveImportService } from './adaptive-import.service';
import { ImportTemplateService } from './import-template.service';

// Shared engine usable by any module that ingests arbitrary spreadsheets
// (sales, purchase, and future importers): column detection + row reading
// (AdaptiveImportService) and remembered layout mappings (ImportTemplateService).
@Module({
  imports: [DatabaseModule],
  providers: [AdaptiveImportService, ImportTemplateService],
  exports: [AdaptiveImportService, ImportTemplateService],
})
export class AdaptiveImportModule {}
