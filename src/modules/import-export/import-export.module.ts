import { Module } from '@nestjs/common';
import { ImportExportService } from './services/import-export.service';
import { ImportExportController } from './import-export.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [ImportExportController],
  providers: [ImportExportService],
  exports: [ImportExportService],
})
export class ImportExportModule {}
