import { IsString, IsOptional, IsNumber, IsNotEmpty, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

// These previously had NO validation decorators. With the app's global
// whitelist ValidationPipe, an undecorated property is stripped from the body -
// so every field arrived `undefined` and creating a rule / calculation failed.
// Decorators make the pipe keep and validate them.

export class CreateCommissionRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  ruleType: string; // PERCENTAGE, FIXED, TIERED

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsNumber()
  fixedAmount?: number;

  @IsOptional()
  @IsNumber()
  minSales?: number;

  @IsOptional()
  @IsNumber()
  maxSales?: number;
}

export class CalculateCommissionDto {
  @IsNumber()
  ruleId: number;

  @IsString()
  @IsNotEmpty()
  period: string; // MONTHLY, QUARTERLY, ANNUAL

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsNumber()
  @Min(0)
  baseSales: number;
}

export class ApproveCommissionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetProductCommissionDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  commissionRate: number;

  @Type(() => Date)
  @IsDate()
  effectiveFrom: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;
}
