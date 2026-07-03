import {
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderDto {
  @IsNumber()
  vendorId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsOptional()
  @IsDateString()
  expected_delivery_date?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class PurchaseOrderItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity_ordered: number;
}

export class ReceiveItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity_received: number;

  @IsNumber()
  warehouse_id: number;
}

export class ConfirmReceiptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class SetProductReorderParamsDto {
  @IsNumber()
  minimum_quantity: number;

  @IsNumber()
  reorder_quantity: number;

  @IsNumber()
  @IsOptional()
  primary_vendor_id?: number;
}
