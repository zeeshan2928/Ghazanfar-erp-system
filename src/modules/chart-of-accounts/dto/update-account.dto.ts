import { IsString, IsEnum, IsOptional, IsInt, MinLength } from 'class-validator';
import { AccountType } from '@prisma/client';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  accountCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  accountName?: string;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsInt()
  parentAccountId?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
