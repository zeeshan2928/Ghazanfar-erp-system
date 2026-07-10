import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { WebsiteOrdersService } from './services/website-orders.service';
import { ApproveWebsiteOrderDto, RejectWebsiteOrderDto } from './dto/website-order.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('website-orders')
@UseGuards(JwtGuard)
export class WebsiteOrdersController {
  constructor(private websiteOrdersService: WebsiteOrdersService) {}

  @Get('pending')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('website_orders.view')
  async getPending(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;

    return this.websiteOrdersService.getPending(orgContext.organizationId, skipNum, takeNum);
  }

  @Get(':orderId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('website_orders.view')
  async getById(@Param('orderId') orderId: string, @OrgContext() orgContext: any) {
    return this.websiteOrdersService.getById(orgContext.organizationId, orderId);
  }

  @Post(':orderId/approve')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('website_orders.approve')
  async approve(
    @Param('orderId') orderId: string,
    @Body() approveDto: ApproveWebsiteOrderDto,
    @OrgContext() orgContext: any,
  ) {
    return this.websiteOrdersService.approve(
      orgContext.organizationId,
      orderId,
      orgContext.userId,
      approveDto,
    );
  }

  @Post(':orderId/reject')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('website_orders.reject')
  async reject(
    @Param('orderId') orderId: string,
    @Body() rejectDto: RejectWebsiteOrderDto,
    @OrgContext() orgContext: any,
  ) {
    return this.websiteOrdersService.reject(
      orgContext.organizationId,
      orderId,
      orgContext.userId,
      rejectDto,
    );
  }
}
