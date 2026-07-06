import { IsNumber, IsString, IsOptional, IsEnum, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CashBookCategory, PaymentMethod } from '../entities/cash-book-entry.entity';

export class CreateCashBookEntryDto {
  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsString()
  description: string;

  @IsEnum(CashBookCategory)
  category: CashBookCategory;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  referenceNumber: string;

  @IsOptional()
  @IsNumber()
  linkedBillId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
