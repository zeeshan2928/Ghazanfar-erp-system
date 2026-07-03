import { IsNumber, IsArray, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PickedItemDto {
  @IsNumber()
  billLineId: number;

  @IsNumber()
  pickedQuantity: number;
}

export class ConfirmGatePassDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickedItemDto)
  pickedItems: PickedItemDto[];

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class RejectGatePassDto {
  @IsString()
  reason: string;
}
