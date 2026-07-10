import { IsInt, IsNumber, IsEnum, IsISO8601, IsOptional, Min } from 'class-validator';

export enum CommissionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_PER_UNIT = 'FIXED_PER_UNIT',
}

export class CreateSalesmanProductCommissionDto {
  @IsInt()
  salesmanId: number;

  @IsInt()
  productId: number;

  @IsEnum(CommissionType)
  commissionType: CommissionType;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsInt()
  @Min(0)
  targetQuantity: number;

  @IsISO8601()
  periodStart: string;

  @IsISO8601()
  periodEnd: string;
}

export class UpdateSalesmanProductCommissionDto {
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  targetQuantity?: number;

  @IsOptional()
  @IsISO8601()
  periodStart?: string;

  @IsOptional()
  @IsISO8601()
  periodEnd?: string;
}
