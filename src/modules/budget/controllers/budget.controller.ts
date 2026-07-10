import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ActionPermissionGuard } from '../../../common/guards/action-permission.guard';
import { RequireAction } from '../../../common/decorators/require-action.decorator';
import { BudgetService } from '../services/budget.service';
import { CreateBudgetDto, UpdateBudgetDto } from '../dto/create-budget.dto';

@Controller('budget')
@UseGuards(JwtGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('budget.create')
  async create(
    @OrgContext() { organizationId }: any,
    @Body() createDto: CreateBudgetDto,
  ) {
    return this.budgetService.createBudget(organizationId, createDto);
  }

  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('budget.view')
  async findAll(
    @OrgContext() { organizationId }: any,
    @Query('fiscalYear', new ParseIntPipe({ optional: true })) fiscalYear?: number,
  ) {
    return this.budgetService.getBudgets(organizationId, fiscalYear);
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('budget.view')
  async findOne(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.budgetService.getBudget(organizationId, id);
  }

  @Patch(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('budget.edit')
  async update(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBudgetDto,
  ) {
    return this.budgetService.updateBudget(organizationId, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('budget.delete')
  async remove(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.budgetService.deleteBudget(organizationId, id);
  }

  @Get('variance/:fiscalYear')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('budget.view')
  async getVariance(
    @OrgContext() { organizationId }: any,
    @Param('fiscalYear', ParseIntPipe) fiscalYear: number,
  ) {
    return this.budgetService.getVarianceReport(organizationId, fiscalYear);
  }
}
