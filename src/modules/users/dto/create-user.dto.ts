import { IsEmail, IsString, MinLength, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsNumber()
  @IsOptional()
  organizationId?: number;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  // Only an ADMIN caller may set this - enforced in UsersService, not here.
  @IsBoolean()
  @IsOptional()
  canViewFinancials?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  // Only an ADMIN caller may set this - enforced in UsersService, not here.
  @IsBoolean()
  @IsOptional()
  canViewFinancials?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
