import { IsNumber, IsOptional, IsString } from 'class-validator';

export class MatchBillDto {
  @IsNumber()
  billId: number;

  @IsNumber()
  entryId: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
