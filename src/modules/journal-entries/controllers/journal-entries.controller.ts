import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ActionPermissionGuard } from '../../../common/guards/action-permission.guard';
import { RequireAction } from '../../../common/decorators/require-action.decorator';
import { JournalEntriesService } from '../services/journal-entries.service';
import { CreateJournalEntryDto } from '../dto/create-journal-entry.dto';
import { ReverseEntryDto } from '../dto/reverse-entry.dto';

@Controller('journal-entries')
@UseGuards(JwtGuard)
export class JournalEntriesController {
  constructor(private readonly service: JournalEntriesService) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('journal_entries.create')
  async create(
    @OrgContext() { organizationId, userId }: any,
    @Body() createDto: CreateJournalEntryDto,
  ) {
    return this.service.create(organizationId, userId, createDto);
  }

  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('journal_entries.view')
  async findAll(
    @OrgContext() { organizationId }: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(
      organizationId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      status,
    );
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('journal_entries.view')
  async findOne(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(organizationId, id);
  }

  @Post(':id/post')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('journal_entries.post')
  async post(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.post(organizationId, id);
  }

  @Post(':id/reverse')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('journal_entries.reverse')
  async reverse(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() reverseDto: ReverseEntryDto,
  ) {
    return this.service.reverse(organizationId, id, reverseDto);
  }

  @Get('reports/trial-balance')
  async getTrialBalance(
    @OrgContext() { organizationId }: any,
    @Query('asOf') asOf?: string,
  ) {
    return this.service.getTrialBalance(
      organizationId,
      asOf ? new Date(asOf) : new Date(),
    );
  }
}
