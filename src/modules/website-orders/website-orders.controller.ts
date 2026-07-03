import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { WebsiteOrdersService } from './services/website-orders.service';
import { ApproveWebsiteOrderDto, RejectWebsiteOrderDto } from './dto/website-order.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('website-orders')
@UseGuards(JwtGuard)
export class WebsiteOrdersController {
  constructor(private websiteOrdersService: WebsiteOrdersService) {}

  @Get('pending')
  async getPending(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;

    return this.websiteOrdersService.getPending(
      orgContext.organizationId,
      skipNum,
      takeNum,
    );
  }

  @Get(':orderId')
  async getById(
    @Param('orderId') orderId: string,
    @OrgContext() orgContext: any,
  ) {
    return this.websiteOrdersService.getById(
      orgContext.organizationId,
      orderId,
    );
  }

  @Post(':orderId/approve')
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
