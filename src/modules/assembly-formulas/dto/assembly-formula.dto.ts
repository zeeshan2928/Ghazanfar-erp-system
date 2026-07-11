import { IsNumber, Min } from 'class-validator';

export class UpdatePartCostDto {
  @IsNumber()
  @Min(0)
  unitCost: number;
}
