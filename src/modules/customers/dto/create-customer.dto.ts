import { IsString, IsNotEmpty, IsOptional, IsEmail, IsInt, IsNumber, Min, IsEnum, ValidateIf } from 'class-validator';
import { CustomerType, CustomerAccountType } from '@prisma/client';

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

  // Governed reference data (src/modules/locations) - a real City row, not
  // free text. null/omitted means "not set yet", searchable/editable later.
  @IsOptional()
  @IsInt()
  cityId?: number;

  // The credit-relationship axis (KHATA vs WALK_IN) - separate from
  // customerType below (the business-tier axis). See the Customer model
  // comment in schema.prisma for why these are two different fields.
  @IsOptional()
  @IsEnum(CustomerAccountType)
  accountType?: CustomerAccountType;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;
}
