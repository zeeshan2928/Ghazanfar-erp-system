import { IsString, IsEnum, IsOptional, IsInt, MinLength } from 'class-validator';
import { AccountType } from '@prisma/client';

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
  @IsInt()
  parentAccountId?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
