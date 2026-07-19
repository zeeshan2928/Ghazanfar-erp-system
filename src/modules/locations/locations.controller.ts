import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LocationsService } from './services/locations.service';
import { CreateCityDto, SearchCitiesDto, UpdateCityDto } from './dto/location.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('locations')
@UseGuards(JwtGuard)
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Get('provinces')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('locations.view')
  async listProvinces() {
    return this.locationsService.listProvinces();
  }

  @Get('cities')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('locations.view')
  async searchCities(@Query() dto: SearchCitiesDto) {
    return this.locationsService.searchCities(dto);
  }

  @Post('cities')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createCity(@Body() dto: CreateCityDto) {
    return this.locationsService.createApproved(dto);
  }

  @Post('cities/request')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('locations.view')
  async requestCity(@Body() dto: CreateCityDto, @OrgContext() orgContext: any) {
    return this.locationsService.requestCity(orgContext.organizationId, orgContext.userId, dto);
  }

  @Get('cities/pending')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async listPending() {
    return this.locationsService.listPending();
  }

  @Post('cities/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async approve(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.approve(id);
  }

  @Patch('cities/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCityDto) {
    return this.locationsService.update(id, dto);
  }
}
