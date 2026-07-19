import { IsString, IsEmail, IsOptional, IsNumber, IsInt, IsArray, ValidateIf } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  name: string;

  // @IsOptional() only skips validation for null/undefined, not '' - a
  // blank email field submits '', which @IsEmail() then rejected, silently
  // breaking vendor creation whenever email was left empty (same bug fixed
  // on CreateCustomerDto). ValidateIf treats '' the same as "not provided".
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // Governed reference data (src/modules/locations) - a real City row, not
  // free text. Same field shape as Customer.cityId.
  @IsOptional()
  @IsInt()
  cityId?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  name?: string;

  // Same empty-string-vs-undefined fix as CreateVendorDto - see the comment
  // there.
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // Governed reference data (src/modules/locations) - a real City row, not
  // free text. Same field shape as Customer.cityId.
  @IsOptional()
  @IsInt()
  cityId?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class AddProductToVendorDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  @IsOptional()
  leadTimeDays?: number;
}
