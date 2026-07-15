import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BomsService } from './services/boms.service';
import { BomImportService } from './services/bom-import.service';
import { FormulaMigrationService } from './services/formula-migration.service';
import { BomSearchDto, CreateBomDto, UpdateBomDto } from './dto/bom.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('boms')
@UseGuards(JwtGuard)
export class BomsController {
  constructor(
    private bomsService: BomsService,
    private bomImportService: BomImportService,
    private formulaMigrationService: FormulaMigrationService,
  ) {}

  // Legacy AssemblyFormula -> new Bom migration. Read-only suggestion list;
  // the actual migration is per-formula and always human-confirmed - see
  // FormulaMigrationService for why this can never be automatic.
  @Get('migration/pending')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.create')
  async listPendingMigrations(@OrgContext() orgContext: any) {
    return this.formulaMigrationService.listPending(orgContext.organizationId);
  }

  @Post('migration/:formulaId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.create')
  async migrateFormula(
    @Param('formulaId') formulaId: string,
    @Body() body: { outputProductId: number; lineMappings: { formulaLineId: number; componentProductId: number }[] },
    @OrgContext() orgContext: any,
  ) {
    return this.formulaMigrationService.migrateOne(
      orgContext.organizationId,
      orgContext.userId,
      parseInt(formulaId, 10),
      body.outputProductId,
      body.lineMappings,
    );
  }

  // Dry-run: parses + validates against the real product master, WRITES
  // NOTHING. A row referencing an unknown product/component code is reported
  // here, never silently skipped past this step.
  @Post('import/analyze')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async analyzeImport(@UploadedFile() file: Express.Multer.File, @OrgContext() orgContext: any) {
    if (!file) throw new BadRequestException('Recipe file is required');
    return this.bomImportService.analyze(orgContext.organizationId, file.buffer);
  }

  @Post('import/commit')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async commitImport(@UploadedFile() file: Express.Multer.File, @OrgContext() orgContext: any) {
    if (!file) throw new BadRequestException('Recipe file is required');
    return this.bomImportService.commit(orgContext.organizationId, orgContext.userId, file.buffer);
  }

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.create')
  async create(@Body() dto: CreateBomDto, @OrgContext() orgContext: any) {
    return this.bomsService.create(orgContext.organizationId, orgContext.userId, dto);
  }

  @Post('search')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.view')
  async search(@Body() dto: BomSearchDto, @OrgContext() orgContext: any) {
    return this.bomsService.search(orgContext.organizationId, dto);
  }

  @Get('product/:productId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.view')
  async getActiveForProduct(@Param('productId') productId: string, @OrgContext() orgContext: any) {
    return this.bomsService.getActiveForProduct(orgContext.organizationId, parseInt(productId, 10));
  }

  @Get('where-used/:productId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.view')
  async whereUsed(@Param('productId') productId: string, @OrgContext() orgContext: any) {
    return this.bomsService.whereUsed(orgContext.organizationId, parseInt(productId, 10));
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.view')
  async getById(@Param('id') id: string, @OrgContext() orgContext: any) {
    return this.bomsService.getById(orgContext.organizationId, parseInt(id, 10));
  }

  @Patch(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.edit')
  async update(@Param('id') id: string, @Body() dto: UpdateBomDto, @OrgContext() orgContext: any) {
    return this.bomsService.update(orgContext.organizationId, parseInt(id, 10), dto);
  }

  @Post(':id/new-version')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.edit')
  async createNewVersion(@Param('id') id: string, @OrgContext() orgContext: any) {
    return this.bomsService.createNewVersion(orgContext.organizationId, parseInt(id, 10), orgContext.userId);
  }

  @Post(':id/deactivate')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('boms.edit')
  async deactivate(@Param('id') id: string, @OrgContext() orgContext: any) {
    await this.bomsService.deactivate(orgContext.organizationId, parseInt(id, 10));
    return { success: true };
  }
}
