import { IsNumber, IsString, IsOptional, IsEnum, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CashBookCategory, PaymentMethod, EntryStatus } from '../entities/cash-book-entry.entity';

export class UpdateCashBookEntryDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CashBookCategory)
  category?: CashBookCategory;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsNumber()
  linkedBillId?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(EntryStatus)
  status?: EntryStatus;
}
