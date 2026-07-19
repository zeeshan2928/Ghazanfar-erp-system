import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  provinceId: number;
}

export class UpdateCityDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  provinceId?: number;
}

export class SearchCitiesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  provinceId?: number;
}
