import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CustomersService } from './services/customers.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('customers')
@UseGuards(JwtGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

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
}
