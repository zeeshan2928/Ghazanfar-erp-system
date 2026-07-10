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
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class PurchaseOrderItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantityOrdered: number;
}

export class ReceiveItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantityReceived: number;

  @IsNumber()
  warehouseId: number;
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

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsNumber()
  vendorId?: number;

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  manualReference?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class SetProductReorderParamsDto {
  @IsNumber()
  minimumQuantity: number;

  @IsNumber()
  reorderQuantity: number;

  @IsNumber()
  @IsOptional()
  primaryVendorId?: number;
}

export class ManualCreatePOItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  vendorId: number;

  @IsNumber()
  quantity: number;
}

export class ManualCreatePOsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualCreatePOItemDto)
  items: ManualCreatePOItemDto[];
}
