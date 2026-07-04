import { IsNumber, IsArray, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;
}

export class CreateWarehouseTransferDto {
  @IsNumber()
  fromWarehouseId: number;

  @IsNumber()
  toWarehouseId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class ConfirmTransferReceiptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class ReceiveItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantityReceived: number;
}

export class RejectTransferDto {
  @IsString()
  reason: string;
}
