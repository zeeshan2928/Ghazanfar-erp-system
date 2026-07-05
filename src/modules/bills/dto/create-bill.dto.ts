import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBillLineDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  warehouseId: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateBillDto {
  @IsNumber()
  customerId: number;

  @IsNumber()
  salesmanId: number;  // MANDATORY - for commission calculation

  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillLineDto)
  lines: CreateBillLineDto[];
}

export class UpdateBillDto {
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillLineDto)
  lines?: CreateBillLineDto[];
}

export class ChangeStatusDto {
  @IsString()
  status: string;
}
