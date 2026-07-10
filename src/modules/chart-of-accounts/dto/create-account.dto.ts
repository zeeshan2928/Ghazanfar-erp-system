import { IsString, IsEnum, IsOptional, IsInt, IsBoolean, MinLength } from 'class-validator';
import { AccountType, AccountCategory } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  @MinLength(1)
  accountCode: string;

  @IsString()
  @MinLength(1)
  accountName: string;

  @IsEnum(AccountType)
  accountType: AccountType;

  @IsOptional()
  @IsEnum(AccountCategory)
  accountCategory?: AccountCategory;

  @IsOptional()
  @IsBoolean()
  isCashAccount?: boolean;

  @IsOptional()
  @IsInt()
  parentAccountId?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
