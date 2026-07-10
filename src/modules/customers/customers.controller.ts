import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { CustomersService } from './services/customers.service';
import { CustomersSearchService } from './services/customers-search.service';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('customers')
@UseGuards(JwtGuard)
export class CustomersController {
  constructor(
    private customersService: CustomersService,
    private customersSearchService: CustomersSearchService,
  ) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('customers.create')
  async createCustomer(@Body() data: any, @OrgContext() orgContext: any) {
    const organizationId = orgContext?.organizationId || 1;
    return this.customersService.createCustomer(organizationId, data);
  }

  @Get(':customerId/ledger')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('customers.view')
  async getLedger(@Param('customerId') customerId: string, @OrgContext() orgContext: any) {
    return this.customersService.getLedger(orgContext.organizationId, parseInt(customerId, 10));
  }

  @Get(':customerId/credit-status')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('customers.view')
  async getCreditStatus(@Param('customerId') customerId: string, @OrgContext() orgContext: any) {
    return this.customersService.getCreditStatus(orgContext.organizationId, parseInt(customerId, 10));
  }

  @Get(':customerId/sale-history')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('customers.view')
  async getSaleHistory(@Param('customerId') customerId: string, @OrgContext() orgContext: any) {
    return this.customersService.getSaleHistory(
      orgContext.organizationId,
      parseInt(customerId, 10),
      10,
    );
  }

  @Get(':customerId/products/:productId/purchase-history')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('customers.view')
  async getProductPurchaseHistory(
    @Param('customerId') customerId: string,
    @Param('productId') productId: string,
    @OrgContext() orgContext: any,
  ) {
    return this.customersService.getProductPurchaseHistory(
      orgContext.organizationId,
      parseInt(customerId, 10),
      parseInt(productId, 10),
      5,
    );
  }

  @Post('search')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('customers.view')
  async search(@Body() query: SearchRequestDto, @OrgContext() orgContext: any) {
    return this.customersSearchService.search(orgContext.organizationId, query);
  }

  @Get('filters/columns/:columnName')
  async getColumnValues(@Param('columnName') columnName: string, @OrgContext() orgContext: any) {
    return this.customersSearchService.getColumnValues(orgContext.organizationId, columnName);
  }
}
