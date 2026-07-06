import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { JournalEntriesService } from '../services/journal-entries.service';
import { CreateJournalEntryDto } from '../dto/create-journal-entry.dto';
import { ReverseEntryDto } from '../dto/reverse-entry.dto';
import { JournalEntryQueryDto } from '../dto/journal-entry-query.dto';

@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly service: JournalEntriesService) {}

  @Post()
  @Public()
  async create(
    @OrgContext() organizationId: number,
    @Body() createDto: CreateJournalEntryDto,
  ) {
    return this.service.create(organizationId, 1, createDto); // Default userId=1 for now
  }

  @Get()
  @Public()
  async findAll(
    @OrgContext() organizationId: number,
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
  @Public()
  async findOne(
    @OrgContext() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(organizationId, id);
  }

  @Post(':id/post')
  @Public()
  async post(
    @OrgContext() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.post(organizationId, id);
  }

  @Post(':id/reverse')
  @Public()
  async reverse(
    @OrgContext() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() reverseDto: ReverseEntryDto,
  ) {
    return this.service.reverse(organizationId, id, reverseDto);
  }

  @Get('reports/trial-balance')
  @Public()
  async getTrialBalance(
    @OrgContext() organizationId: number,
    @Query('asOf') asOf?: string,
  ) {
    return this.service.getTrialBalance(
      organizationId,
      asOf ? new Date(asOf) : new Date(),
    );
  }
}
