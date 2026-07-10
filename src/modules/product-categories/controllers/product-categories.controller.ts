import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ActionPermissionGuard } from '../../../common/guards/action-permission.guard';
import { RequireAction } from '../../../common/decorators/require-action.decorator';
import { ProductCategoriesService } from '../services/product-categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/create-category.dto';

@Controller('product-categories')
@UseGuards(JwtGuard)
export class ProductCategoriesController {
  constructor(private readonly service: ProductCategoriesService) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('product_categories.create')
  async create(
    @Body() createDto: CreateCategoryDto,
    @OrgContext() orgContext: any,
  ) {
    return this.service.create(orgContext.organizationId, createDto);
  }

  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('product_categories.view')
  async findAll(
    @Query('includeInactive') includeInactive?: boolean,
    @OrgContext() orgContext?: any,
  ) {
    return this.service.findAll(orgContext.organizationId, includeInactive);
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('product_categories.view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @OrgContext() orgContext?: any,
  ) {
    return this.service.findOne(orgContext.organizationId, id);
  }

  @Patch(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('product_categories.edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCategoryDto,
    @OrgContext() orgContext?: any,
  ) {
    return this.service.update(orgContext.organizationId, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('product_categories.delete')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @OrgContext() orgContext?: any,
  ) {
    return this.service.remove(orgContext.organizationId, id);
  }
}
