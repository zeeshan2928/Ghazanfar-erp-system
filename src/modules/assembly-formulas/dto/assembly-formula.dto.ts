import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePartCostDto {
  @IsNumber()
  @Min(0)
  unitCost: number;
}

// Rename a model, or note what it is. Both optional: the user may be doing
// only one of the two.
export class UpdateFormulaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
