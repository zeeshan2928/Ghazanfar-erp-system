import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ProductCategoriesService } from '../services/product-categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/create-category.dto';

@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly service: ProductCategoriesService) {}

  @Post()
  @Public()
  async create(
    @Body() createDto: CreateCategoryDto,
    @OrgContext() orgContext: any,
  ) {
    const orgId = orgContext?.organizationId || orgContext;
    return this.service.create(orgId, createDto);
  }

  @Get()
  @Public()
  async findAll(
    @Query('includeInactive') includeInactive?: boolean,
    @OrgContext() orgContext?: any,
  ) {
    const orgId = orgContext?.organizationId || orgContext;
    return this.service.findAll(orgId, includeInactive);
  }

  @Get(':id')
  @Public()
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @OrgContext() orgContext?: any,
  ) {
    const orgId = orgContext?.organizationId || orgContext;
    return this.service.findOne(orgId, id);
  }

  @Patch(':id')
  @Public()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCategoryDto,
    @OrgContext() orgContext?: any,
  ) {
    const orgId = orgContext?.organizationId || orgContext;
    return this.service.update(orgId, id, updateDto);
  }

  @Delete(':id')
  @Public()
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @OrgContext() orgContext?: any,
  ) {
    const orgId = orgContext?.organizationId || orgContext;
    return this.service.remove(orgId, id);
  }
}
