import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { JwtGuard } from '@common/guards/jwt.guard';
import { FinancialAccessGuard } from '@common/guards/financial-access.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { AssemblyFormulasService } from './services/assembly-formulas.service';
import { AssemblyFormulaImportService } from './services/assembly-formula-import.service';
import { UpdateFormulaDto, UpdatePartCostDto } from './dto/assembly-formula.dto';
import { AssemblyFamily } from './services/assembly-formula-parser.service';

// Whole module is cost/financial data, so gate the entire controller behind
// FinancialAccessGuard (like sales-analysis/purchase-analysis), plus a
// per-route action permission.
@Controller('assembly-formulas')
@UseGuards(JwtGuard, FinancialAccessGuard)
export class AssemblyFormulasController {
  constructor(
    private readonly service: AssemblyFormulasService,
    private readonly importService: AssemblyFormulaImportService,
  ) {}

  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('assembly-formulas.view')
  async listFormulas(
    @Query('family') family: AssemblyFamily | undefined,
    @OrgContext() orgContext: any,
  ) {
    return this.service.listFormulas(orgContext.organizationId, family);
  }

  @Get('parts')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('assembly-formulas.view')
  async listParts(
    @Query('family') family: AssemblyFamily | undefined,
    @OrgContext() orgContext: any,
  ) {
    return this.service.listParts(orgContext.organizationId, family);
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('assembly-formulas.view')
  async getFormula(@Param('id', ParseIntPipe) id: number, @OrgContext() orgContext: any) {
    return this.service.getFormula(orgContext.organizationId, id);
  }

  // The "change one thing" action: update a shared part's price; every
  // formula that uses it recomputes its total on next read.
  @Patch('parts/:id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('assembly-formulas.edit')
  async updatePartCost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePartCostDto,
    @OrgContext() orgContext: any,
  ) {
    return this.service.updatePartCost(orgContext.organizationId, id, dto.unitCost);
  }

  // Rename a model, or note what it is. Names came from spreadsheet filenames
  // ("1764 PC+1760 PC+2225 (7025CC)") and only the user knows what they should
  // really be called.
  @Patch(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('assembly-formulas.edit')
  async updateFormula(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormulaDto,
    @OrgContext() orgContext: any,
  ) {
    return this.service.updateFormula(orgContext.organizationId, id, dto);
  }

  @Post('import')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('assembly-formulas.import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async import(@UploadedFile() file: Express.Multer.File, @OrgContext() orgContext: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.importService.importFromBuffer(orgContext.organizationId, file.buffer, file.originalname);
  }
}
