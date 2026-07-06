import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { OrgContext } from '../../../common/decorators/org-context.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { BrandsService } from '../services/brands.service';
import { CreateBrandDto, UpdateBrandDto } from '../dto/create-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Post()
  @Public()
  async create(
    @Body() createDto: CreateBrandDto,
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
    @Body() updateDto: UpdateBrandDto,
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
