import { IsString, IsNumber, IsISO8601, IsNotEmpty } from 'class-validator';

export class CreateBankStatementDto {
  @IsISO8601()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  referenceNumber: string;
}
