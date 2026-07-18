import { IsNumber, Min, IsOptional, IsString, MaxLength, IsDateString } from 'class-validator';

// A deliberate price change, effective from a date.
export class ChangeCostDto {
  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// Fix a typo in the latest entry (no date - it just restates the current value).
export class CorrectCostDto {
  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
