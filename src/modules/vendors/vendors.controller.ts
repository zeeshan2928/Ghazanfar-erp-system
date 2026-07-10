import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { VendorsService } from './services/vendors.service';
import { CreateVendorDto, UpdateVendorDto, AddProductToVendorDto } from './dto/vendor.dto';
import { OrgContext } from 'src/common/decorators/org-context.decorator';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { FinancialAccessGuard } from 'src/common/guards/financial-access.guard';
import { ActionPermissionGuard } from 'src/common/guards/action-permission.guard';
import { RequireAction } from 'src/common/decorators/require-action.decorator';

@Controller('vendors')
@UseGuards(JwtGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('vendors.create')
  create(@OrgContext() { organizationId }: any, @Body() createDto: CreateVendorDto) {
    return this.vendorsService.create(organizationId, createDto);
  }

  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('vendors.view')
  list(
    @OrgContext() { organizationId }: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip = 0,
    @Query('take', new ParseIntPipe({ optional: true })) take = 10,
  ) {
    return this.vendorsService.list(organizationId, skip, take);
  }

  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('vendors.view')
  getById(@OrgContext() { organizationId }: any, @Param('id', ParseIntPipe) vendorId: number) {
    return this.vendorsService.getById(organizationId, vendorId);
  }

  @Put(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('vendors.edit')
  update(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) vendorId: number,
    @Body() updateDto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(organizationId, vendorId, updateDto);
  }

  @Post(':id/products')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('vendors.edit')
  addProduct(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) vendorId: number,
    @Body() addDto: AddProductToVendorDto,
  ) {
    return this.vendorsService.addProduct(organizationId, vendorId, addDto);
  }

  @Delete(':vendorId/products/:productId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('vendors.edit')
  removeProduct(
    @OrgContext() { organizationId }: any,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.vendorsService.removeProduct(organizationId, vendorId, productId);
  }

  @Delete(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('vendors.deactivate')
  deactivate(@OrgContext() { organizationId }: any, @Param('id', ParseIntPipe) vendorId: number) {
    return this.vendorsService.deactivate(organizationId, vendorId);
  }

  @Get(':id/scorecard')
  @UseGuards(FinancialAccessGuard)
  getScorecard(@OrgContext() { organizationId }: any, @Param('id', ParseIntPipe) vendorId: number) {
    return this.vendorsService.getScorecard(organizationId, vendorId);
  }
}
