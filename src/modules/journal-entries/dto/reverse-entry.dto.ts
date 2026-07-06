import { IsString, IsISO8601 } from 'class-validator';

export class ReverseEntryDto {
  @IsISO8601()
  reversalDate: string;

  @IsString()
  reason: string;
}
