import {
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseReturnItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  warehouseId: number;

  @IsNumber()
  quantityReturned: number;

  // Cost per unit in whole Rupees - converted to paisa (cents) in the
  // service, matching this project's money-storage convention (see
  // CLAUDE.md / PurchaseOrderItem.unit_cost).
  @IsNumber()
  unitCost: number;
}

export class CreatePurchaseReturnDto {
  @IsNumber()
  vendorId: number;

  @IsOptional()
  @IsNumber()
  poId?: number;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseReturnItemDto)
  items: PurchaseReturnItemDto[];

  @IsOptional()
  @IsString()
  remarks?: string;
}
