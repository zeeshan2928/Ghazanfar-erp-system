import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ActionPermissionGuard } from '../../../common/guards/action-permission.guard';
import { RequireAction } from '../../../common/decorators/require-action.decorator';
import { BrandsService } from '../services/brands.service';
import { CreateBrandDto, UpdateBrandDto } from '../dto/create-brand.dto';

@Controller('brands')
@UseGuards(JwtGuard)
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('brands.create')
  async create(
    @Body() createDto: CreateBrandDto,
    @OrgContext() orgContext: any,
  ) {
    return this.service.create(orgContext.organizationId, createDto);
  }

  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('brands.view')
  async findAll(
    @Query('includeInactive') includeInactive?: boolean,
    @OrgContext() orgContext?: any,
  ) {
    return this.service.findAll(orgContext.organizationId, includeInactive);
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('brands.view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @OrgContext() orgContext?: any,
  ) {
    return this.service.findOne(orgContext.organizationId, id);
  }

  @Patch(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('brands.edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBrandDto,
    @OrgContext() orgContext?: any,
  ) {
    return this.service.update(orgContext.organizationId, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('brands.delete')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @OrgContext() orgContext?: any,
  ) {
    return this.service.remove(orgContext.organizationId, id);
  }
}
