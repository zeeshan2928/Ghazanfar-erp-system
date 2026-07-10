import {
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Channel } from '@prisma/client';

// Warehouse dispatch is decided at the point of actual invoicing/fulfillment,
// not at order time - a Sales Order line only fixes product/quantity/price.
export class ConvertLineWarehouseDto {
  @IsNumber()
  salesOrderLineId: number;

  @IsNumber()
  warehouseId: number;
}

export class ConvertToInvoiceDto {
  @IsEnum(Channel)
  channel: Channel;

  // Falls back to the customer's phone on file if not provided here.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerPhone?: string;

  // Falls back to the Sales Order's own salesmanId if not provided here.
  @IsOptional()
  @IsNumber()
  salesmanId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConvertLineWarehouseDto)
  lineWarehouses: ConvertLineWarehouseDto[];
}
