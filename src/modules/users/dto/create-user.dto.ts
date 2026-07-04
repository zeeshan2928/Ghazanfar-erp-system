import { IsEmail, IsString, MinLength, IsOptional, IsNumber } from 'class-validator';

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
}
