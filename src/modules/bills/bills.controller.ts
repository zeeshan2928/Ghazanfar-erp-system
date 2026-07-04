import { Controller, Post, Get, Param, Body, UseGuards, Query } from '@nestjs/common';
import { BillsService } from './services/bills.service';
import { BillsSearchService } from './services/bills-search.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { Public } from '@common/decorators/public.decorator';

@Controller('bills')
@UseGuards(JwtGuard)
export class BillsController {
  constructor(
    private billsService: BillsService,
    private billsSearchService: BillsSearchService,
  ) {}

  @Post()
  async create(
    @Body() createBillDto: CreateBillDto,
    @OrgContext() orgContext: any,
  ) {
    return this.billsService.create(
      orgContext.organizationId,
      orgContext.userId,
      createBillDto,
    );
  }

  @Get()
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;

    return this.billsService.findAll(
      orgContext.organizationId,
      skipNum,
      takeNum,
    );
  }

  @Get(':billId')
  async findById(
    @Param('billId') billId: string,
    @OrgContext() orgContext: any,
  ) {
    return this.billsService.findById(
      orgContext.organizationId,
      parseInt(billId, 10),
    );
  }

  @Public()
  @Post('search')
  async search(
    @Body() query: SearchRequestDto,
  ) {
    return this.billsSearchService.search(2, query);
  }

  @Public()
  @Get('filters/columns/:columnName')
  async getColumnValues(
    @Param('columnName') columnName: string,
  ) {
    return this.billsSearchService.getColumnValues(
      2,
      columnName,
    );
  }
}
