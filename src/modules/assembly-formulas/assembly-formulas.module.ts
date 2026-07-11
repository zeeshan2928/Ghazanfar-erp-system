import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { AssemblyFormulasController } from './assembly-formulas.controller';
import { AssemblyFormulasService } from './services/assembly-formulas.service';
import { AssemblyFormulaParserService } from './services/assembly-formula-parser.service';
import { AssemblyFormulaImportService } from './services/assembly-formula-import.service';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [AssemblyFormulasController],
  providers: [AssemblyFormulasService, AssemblyFormulaParserService, AssemblyFormulaImportService],
  exports: [AssemblyFormulasService, AssemblyFormulaParserService, AssemblyFormulaImportService],
})
export class AssemblyFormulasModule {}
