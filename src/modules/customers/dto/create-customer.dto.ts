import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber, Min, IsEnum, ValidateIf } from 'class-validator';
import { CustomerType } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // @IsOptional() only skips validation for null/undefined, not ''. The
  // Add-Customer form always sends email: '' when the field is left blank
  // (the common case for walk-ins), which @IsEmail() then rejected - this
  // silently broke customer creation for anyone without an email. ValidateIf
  // treats an empty string the same as "not provided".
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
