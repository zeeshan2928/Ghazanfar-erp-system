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

@Controller('vendors')
@UseGuards(JwtGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  create(@OrgContext() { organizationId }: any, @Body() createDto: CreateVendorDto) {
    return this.vendorsService.create(organizationId, createDto);
  }

  @Get()
  list(
    @OrgContext() { organizationId }: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip = 0,
    @Query('take', new ParseIntPipe({ optional: true })) take = 10,
  ) {
    return this.vendorsService.list(organizationId, skip, take);
  }

  @Get(':id')
  getById(@OrgContext() { organizationId }: any, @Param('id', ParseIntPipe) vendorId: number) {
    return this.vendorsService.getById(organizationId, vendorId);
  }

  @Put(':id')
  update(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) vendorId: number,
    @Body() updateDto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(organizationId, vendorId, updateDto);
  }

  @Post(':id/products')
  addProduct(
    @OrgContext() { organizationId }: any,
    @Param('id', ParseIntPipe) vendorId: number,
    @Body() addDto: AddProductToVendorDto,
  ) {
    return this.vendorsService.addProduct(organizationId, vendorId, addDto);
  }

  @Delete(':vendorId/products/:productId')
  removeProduct(
    @OrgContext() { organizationId }: any,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.vendorsService.removeProduct(organizationId, vendorId, productId);
  }

  @Delete(':id')
  deactivate(@OrgContext() { organizationId }: any, @Param('id', ParseIntPipe) vendorId: number) {
    return this.vendorsService.deactivate(organizationId, vendorId);
  }
}
