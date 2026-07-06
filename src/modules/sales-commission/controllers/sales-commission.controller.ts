import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SalesCommissionService } from '../services/sales-commission.service';
import {
  CreateCommissionRuleDto,
  CalculateCommissionDto,
  ApproveCommissionDto,
  SetProductCommissionDto,
} from '../dto/sales-commission.dto';

@Controller('commission')
export class SalesCommissionController {
  constructor(private readonly service: SalesCommissionService) {}

  @Post('rules')
  async createRule(@Request() req: any, @Body() createDto: CreateCommissionRuleDto) {
    return this.service.createCommissionRule(req.user.organizationId, createDto);
  }

  @Get('rules')
  async getRules(
    @Request() req: any,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
  ) {
    return this.service.getCommissionRules(req.user.organizationId, parseInt(skip), parseInt(take));
  }

  @Get('rules/:ruleId')
  async getRule(@Request() req: any, @Param('ruleId') ruleId: string) {
    return this.service.getCommissionRuleById(req.user.organizationId, parseInt(ruleId));
  }

  @Patch('rules/:ruleId')
  async updateRule(
    @Request() req: any,
    @Param('ruleId') ruleId: string,
    @Body() updateDto: Partial<CreateCommissionRuleDto>,
  ) {
    return this.service.updateCommissionRule(req.user.organizationId, parseInt(ruleId), updateDto);
  }

  @Post('calculate')
  async calculateCommission(@Request() req: any, @Body() calculateDto: CalculateCommissionDto) {
    return this.service.calculateCommission(req.user.organizationId, req.user.sub, calculateDto);
  }

  @Patch(':commissionId/approve')
  async approveCommission(
    @Request() req: any,
    @Param('commissionId') commissionId: string,
    @Body() approveDto: ApproveCommissionDto,
  ) {
    return this.service.approveCommission(
      req.user.organizationId,
      parseInt(commissionId),
      req.user.sub,
      approveDto,
    );
  }

  @Get('history/:salesPersonId')
  async getHistory(
    @Request() req: any,
    @Param('salesPersonId') salesPersonId: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
  ) {
    return this.service.getCommissionHistory(
      req.user.organizationId,
      parseInt(salesPersonId),
      parseInt(skip),
      parseInt(take),
    );
  }

  @Get('summary/:startDate/:endDate')
  async getSummary(
    @Request() req: any,
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.service.getPeriodCommissionSummary(
      req.user.organizationId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('product-commission')
  async setProductCommission(@Request() req: any, @Body() setDto: SetProductCommissionDto) {
    return this.service.setProductCommission(
      req.user.organizationId,
      setDto.productId,
      setDto.commissionRate,
      setDto.effectiveFrom,
      setDto.effectiveTo,
    );
  }

  @Get('product/:productId')
  async getProductCommissions(@Request() req: any, @Param('productId') productId: string) {
    return this.service.getProductCommissions(req.user.organizationId, parseInt(productId));
  }
}
