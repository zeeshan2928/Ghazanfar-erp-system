import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { BudgetService } from '../services/budget.service';
import { CreateBudgetDto, UpdateBudgetDto } from '../dto/create-budget.dto';

@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @Public()
  async create(
    @OrgContext() organizationId: number,
    @Body() createDto: CreateBudgetDto,
  ) {
    return this.budgetService.createBudget(organizationId, createDto);
  }

  @Get()
  @Public()
  async findAll(
    @OrgContext() organizationId: number,
    @Query('fiscalYear', new ParseIntPipe({ optional: true })) fiscalYear?: number,
  ) {
    return this.budgetService.getBudgets(organizationId, fiscalYear);
  }

  @Get(':id')
  @Public()
  async findOne(
    @OrgContext() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.budgetService.getBudget(organizationId, id);
  }

  @Patch(':id')
  @Public()
  async update(
    @OrgContext() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBudgetDto,
  ) {
    return this.budgetService.updateBudget(organizationId, id, updateDto);
  }

  @Delete(':id')
  @Public()
  async remove(
    @OrgContext() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.budgetService.deleteBudget(organizationId, id);
  }

  @Get('variance/:fiscalYear')
  @Public()
  async getVariance(
    @OrgContext() organizationId: number,
    @Param('fiscalYear', ParseIntPipe) fiscalYear: number,
  ) {
    return this.budgetService.getVarianceReport(organizationId, fiscalYear);
  }
}
