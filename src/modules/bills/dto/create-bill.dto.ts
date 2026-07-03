import { IsNumber, IsString, IsEnum, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Channel } from '@prisma/client';

export class CreateBillLineDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unit_price: number;

  @IsNumber()
  warehouseId: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateBillDto {
  @IsNumber()
  customerId: number;

  @IsEnum(Channel)
  channel: Channel;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsNumber()
  discount_amount?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillLineDto)
  lines: CreateBillLineDto[];
}
