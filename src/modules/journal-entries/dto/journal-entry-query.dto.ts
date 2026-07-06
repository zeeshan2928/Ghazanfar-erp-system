import { IsOptional, IsString, IsEnum, IsISO8601 } from 'class-validator';
import { JournalEntryStatus } from '@prisma/client';

export class JournalEntryQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @IsOptional()
  @IsString()
  reference?: string;
}
