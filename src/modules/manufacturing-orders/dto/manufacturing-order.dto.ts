import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateManufacturingOrderDto {
  // The recipe (must be its CURRENT active version - see ManufacturingOrdersService.create).
  @IsNumber()
  bomId: number;

  @IsNumber()
  @Min(1)
  quantityPlanned: number;

  @IsNumber()
  warehouseId: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class LineConsumptionDto {
  @IsNumber()
  lineId: number;

  @IsNumber()
  @Min(0)
  quantityConsumed: number;
}

export class CompleteManufacturingOrderDto {
  // Can be LESS than quantityPlanned (QC failures) - 0 is a valid (if
  // unfortunate) outcome: every unit consumed, nothing usable produced.
  @IsNumber()
  @Min(0)
  quantityProduced: number;

  // Only for lines where reality differed from the recipe's plan. Omitted
  // lines default to consuming exactly quantityRequired. The gap between
  // what's entered here and quantityRequired IS the scrap - measured after
  // the fact, never a number typed into the recipe in advance.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineConsumptionDto)
  lineConsumption?: LineConsumptionDto[];
}

export class ManufacturingOrderSearchDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @IsNumber()
  skip?: number;

  @IsOptional()
  @IsNumber()
  take?: number;
}
