import { IsString, IsOptional, IsEmail, IsNumber, Min, IsEnum, ValidateIf } from 'class-validator';
import { CustomerType } from '@prisma/client';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // Same empty-string-vs-undefined fix as CreateCustomerDto - see the comment
  // there.
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;
}
