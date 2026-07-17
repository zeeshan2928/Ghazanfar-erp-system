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
import { SalesmanProductCommissionService } from '../services/salesman-product-commission.service';
import {
  CreateCommissionRuleDto,
  CalculateCommissionDto,
  ApproveCommissionDto,
  SetProductCommissionDto,
} from '../dto/sales-commission.dto';
import {
  CreateSalesmanProductCommissionDto,
  UpdateSalesmanProductCommissionDto,
} from '../dto/salesman-product-commission.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

// NOTE: this controller previously had no @UseGuards/@Public anywhere, so
// req.user was always undefined and every existing endpoint below threw on
// its first line - same bug class flagged in CLAUDE.md for
// vendors.controller.ts. Adding the guard here fixes that as a byproduct;
// it does not change any endpoint's intended behavior, only makes req.user
// actually get populated the way these methods already assumed.
@Controller('commission')
@UseGuards(JwtGuard)
export class SalesCommissionController {
  constructor(
    private readonly service: SalesCommissionService,
    private readonly assignmentService: SalesmanProductCommissionService,
  ) {}

  @Post('assignments')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.create')
  async createAssignment(@OrgContext() orgContext: any, @Body() dto: CreateSalesmanProductCommissionDto) {
    return this.assignmentService.createAssignment(orgContext.organizationId, dto);
  }

  @Get('assignments')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.view')
  async listAssignments(@OrgContext() orgContext: any, @Query('salesmanId') salesmanId?: string) {
    return this.assignmentService.listAssignments(
      orgContext.organizationId,
      salesmanId ? parseInt(salesmanId, 10) : undefined,
    );
  }

  @Patch('assignments/:id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.edit')
  async updateAssignment(
    @OrgContext() orgContext: any,
    @Param('id') id: string,
    @Body() dto: UpdateSalesmanProductCommissionDto,
  ) {
    return this.assignmentService.updateAssignment(orgContext.organizationId, parseInt(id, 10), dto);
  }

  @Post('assignments/:id/deactivate')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.deactivate')
  async deactivateAssignment(@OrgContext() orgContext: any, @Param('id') id: string) {
    return this.assignmentService.deactivateAssignment(orgContext.organizationId, parseInt(id, 10));
  }

  @Post('assignments/:id/mark-paid')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.mark_paid')
  async markPaid(@OrgContext() orgContext: any, @Param('id') id: string) {
    return this.assignmentService.markPaid(orgContext.organizationId, parseInt(id, 10), orgContext.userId);
  }

  @Post('rules')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.create')
  async createRule(@Request() req: any, @Body() createDto: CreateCommissionRuleDto) {
    return this.service.createCommissionRule(req.user.organizationId, createDto);
  }

  @Get('rules')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.view')
  async getRules(
    @Request() req: any,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
  ) {
    return this.service.getCommissionRules(req.user.organizationId, parseInt(skip), parseInt(take));
  }

  @Get('rules/:ruleId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.view')
  async getRule(@Request() req: any, @Param('ruleId') ruleId: string) {
    return this.service.getCommissionRuleById(req.user.organizationId, parseInt(ruleId));
  }

  @Patch('rules/:ruleId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.edit')
  async updateRule(
    @Request() req: any,
    @Param('ruleId') ruleId: string,
    @Body() updateDto: Partial<CreateCommissionRuleDto>,
  ) {
    return this.service.updateCommissionRule(req.user.organizationId, parseInt(ruleId), updateDto);
  }

  @Post('calculate')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.view')
  async calculateCommission(@Request() req: any, @Body() calculateDto: CalculateCommissionDto) {
    return this.service.calculateCommission(req.user.organizationId, req.user.sub, calculateDto);
  }

  @Patch(':commissionId/approve')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.approve')
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

  // Mark an approved commission PAID and post it to the ledger (Dr Commission
  // Expense / Cr Cash) so it reaches P&L.
  @Post(':commissionId/pay')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.mark_paid')
  async payCommission(@Request() req: any, @Param('commissionId') commissionId: string) {
    return this.service.markAsPaid(req.user.organizationId, req.user.sub, parseInt(commissionId, 10));
  }

  @Get('history/:salesPersonId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.view')
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
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.view')
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
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.create')
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
  @UseGuards(ActionPermissionGuard)
  @RequireAction('commission.view')
  async getProductCommissions(@Request() req: any, @Param('productId') productId: string) {
    return this.service.getProductCommissions(req.user.organizationId, parseInt(productId));
  }
}
