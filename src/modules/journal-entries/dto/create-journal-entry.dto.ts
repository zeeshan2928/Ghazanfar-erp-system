import { IsString, IsISO8601, IsOptional, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class JournalEntryLineDto {
  @IsInt()
  accountId: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  debitAmount: number; // Amount in cents

  @IsInt()
  @Min(0)
  creditAmount: number; // Amount in cents

  @IsInt()
  @Min(1)
  lineNumber: number; // Order within entry
}

export class CreateJournalEntryDto {
  @IsISO8601()
  entryDate: string; // ISO format date

  @IsOptional()
  @IsString()
  reference?: string; // e.g., INV-001, CHK-123

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  memo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines: JournalEntryLineDto[];
}
