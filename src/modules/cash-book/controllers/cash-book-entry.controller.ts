import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CashBookEntryService } from '../services/cash-book-entry.service';
import { CreateCashBookEntryDto } from '../dto/create-entry.dto';
import { UpdateCashBookEntryDto } from '../dto/update-entry.dto';
import { LinkBillDto } from '../dto/link-bill.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('cash-book/entries')
@UseGuards(JwtGuard)
export class CashBookEntryController {
  constructor(private readonly service: CashBookEntryService) {}

  /**
   * POST /cash-book/entries
   * Create a new cash book entry
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateCashBookEntryDto, @OrgContext() orgContext: any) {
    return this.service.createEntry(orgContext.organizationId, orgContext.userId, createDto);
  }

  /**
   * GET /cash-book/entries
   * Get all entries with filters and pagination
   */
  @Get()
  async findAll(
    @OrgContext() orgContext: any,
    @Query('category') category?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('linkedBillId') linkedBillId?: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
  ) {
    const filters = {
      category: category || undefined,
      paymentMethod: paymentMethod || undefined,
      status: status || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      linkedBillId: linkedBillId ? parseInt(linkedBillId, 10) : undefined,
    };

    return this.service.getEntries(
      orgContext.organizationId,
      filters,
      parseInt(skip, 10),
      parseInt(take, 10),
    );
  }

  /**
   * GET /cash-book/entries/:id
   * Get a single entry by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @OrgContext() orgContext: any) {
    return this.service.getEntryById(orgContext.organizationId, parseInt(id, 10));
  }

  /**
   * PUT /cash-book/entries/:id
   * Update a cash book entry
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCashBookEntryDto,
    @OrgContext() orgContext: any,
  ) {
    return this.service.updateEntry(orgContext.organizationId, parseInt(id, 10), updateDto);
  }

  /**
   * DELETE /cash-book/entries/:id
   * Delete a cash book entry (only DRAFT entries)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @OrgContext() orgContext: any) {
    await this.service.deleteEntry(orgContext.organizationId, parseInt(id, 10));
  }

  /**
   * POST /cash-book/entries/:id/link-bill
   * Link an entry to a bill for reconciliation
   */
  @Post(':id/link-bill')
  async linkBill(
    @Param('id') id: string,
    @Body() linkDto: LinkBillDto,
    @OrgContext() orgContext: any,
  ) {
    return this.service.linkBill(orgContext.organizationId, parseInt(id, 10), linkDto);
  }

  /**
   * POST /cash-book/entries/:id/post
   * Post/finalize an entry
   */
  @Post(':id/post')
  async postEntry(@Param('id') id: string, @OrgContext() orgContext: any) {
    return this.service.postEntry(orgContext.organizationId, parseInt(id, 10));
  }

  /**
   * GET /cash-book/entries/summary
   * Get cash book summary/dashboard data
   */
  @Get('summary/data')
  async getSummary(
    @OrgContext() orgContext: any,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getSummary(
      orgContext.organizationId,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }
}
