import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ActionPermissionGuard } from '../../../common/guards/action-permission.guard';
import { RequireAction } from '../../../common/decorators/require-action.decorator';
import { ChartOfAccountsService } from '../services/chart-of-accounts.service';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { SeedCoAResponseDto } from '../dto/seed-coa.dto';

@Controller('chart-of-accounts')
@UseGuards(JwtGuard)
export class ChartOfAccountsController {
  constructor(private readonly service: ChartOfAccountsService) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('chart_of_accounts.edit')
  async create(
    @OrgContext() { organizationId }: any,
    @Body() createDto: CreateAccountDto,
  ) {
    return this.service.create(organizationId, createDto);
  }

  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('chart_of_accounts.view')
  async findAll(@OrgContext() { organizationId }: any) {
    return this.service.findAll(organizationId);
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('chart_of_accounts.view')
  async findOne(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(organizationId, id);
  }

  @Patch(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('chart_of_accounts.edit')
  async update(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAccountDto,
  ) {
    return this.service.update(organizationId, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('chart_of_accounts.delete')
  async remove(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(organizationId, id);
  }

  @Post('seed/starter')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('chart_of_accounts.edit')
  async seedStarter(
    @OrgContext() { organizationId }: any,
  ): Promise<SeedCoAResponseDto> {
    const result = await this.service.seedStarterCoA(organizationId);
    return {
      ...result,
      message: `Seeded ${result.created} accounts`,
    };
  }

  @Get('tree/hierarchy')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('chart_of_accounts.view')
  async getHierarchy(@OrgContext() { organizationId }: any) {
    return this.service.getAccountsForOrganization(organizationId);
  }
}
