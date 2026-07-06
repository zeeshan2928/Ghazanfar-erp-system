import { IsNumber, IsOptional } from 'class-validator';

export class LinkBillDto {
  @IsNumber()
  billId: number;

  @IsOptional()
  partialAmount?: number; // For partial payments against a bill
}
