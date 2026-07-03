import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { CustomersService } from './services/customers.service';
import { CustomersSearchService } from './services/customers-search.service';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('customers')
@UseGuards(JwtGuard)
export class CustomersController {
  constructor(
    private customersService: CustomersService,
    private customersSearchService: CustomersSearchService,
  ) {}

  @Get(':customerId/sale-history')
  async getSaleHistory(
    @Param('customerId') customerId: string,
    @OrgContext() orgContext: any,
  ) {
    return this.customersService.getSaleHistory(
      orgContext.organizationId,
      parseInt(customerId, 10),
      10,
    );
  }

  @Post('search')
  async search(
    @Body() query: SearchRequestDto,
    @OrgContext() orgContext: any,
  ) {
    return this.customersSearchService.search(orgContext.organizationId, query);
  }

  @Get('filters/columns/:columnName')
  async getColumnValues(
    @Param('columnName') columnName: string,
    @OrgContext() orgContext: any,
  ) {
    return this.customersSearchService.getColumnValues(
      orgContext.organizationId,
      columnName,
    );
  }
}
