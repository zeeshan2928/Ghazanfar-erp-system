import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { BomsController } from './boms.controller';
import { BomsService } from './services/boms.service';
import { BomImportService } from './services/bom-import.service';
import { FormulaMigrationService } from './services/formula-migration.service';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [BomsController],
  providers: [BomsService, BomImportService, FormulaMigrationService],
  exports: [BomsService, BomImportService, FormulaMigrationService],
})
export class BomsModule {}
