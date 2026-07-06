import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ChartOfAccountsService } from '../services/chart-of-accounts.service';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { SeedCoAResponseDto } from '../dto/seed-coa.dto';

@Controller('chart-of-accounts')
export class ChartOfAccountsController {
  constructor(private readonly service: ChartOfAccountsService) {}

  @Post()
  @Public()
  async create(
    @OrgContext() organizationId: number,
    @Body() createDto: CreateAccountDto,
  ) {
    return this.service.create(organizationId, createDto);
  }

  @Get()
  @Public()
  async findAll(@OrgContext() organizationId: number) {
    return this.service.findAll(organizationId);
  }

  @Get(':id')
  @Public()
  async findOne(
    @OrgContext() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(organizationId, id);
  }

  @Patch(':id')
  @Public()
  async update(
    @OrgContext() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAccountDto,
  ) {
    return this.service.update(organizationId, id, updateDto);
  }

  @Delete(':id')
  @Public()
  async remove(
    @OrgContext() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(organizationId, id);
  }

  @Post('seed/starter')
  @Public()
  async seedStarter(
    @OrgContext() organizationId: number,
  ): Promise<SeedCoAResponseDto> {
    const result = await this.service.seedStarterCoA(organizationId);
    return {
      ...result,
      message: `Seeded ${result.created} accounts`,
    };
  }

  @Get('tree/hierarchy')
  @Public()
  async getHierarchy(@OrgContext() organizationId: number) {
    return this.service.getAccountsForOrganization(organizationId);
  }
}
