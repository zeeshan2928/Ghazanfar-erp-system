import { IsString, IsEmail, IsOptional, IsNumber } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  contact_person?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  contact_person?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class AddProductToVendorDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  unit_price: number;

  @IsNumber()
  @IsOptional()
  lead_time_days?: number;
}
