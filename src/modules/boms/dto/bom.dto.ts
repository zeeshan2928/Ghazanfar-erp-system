import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BomLineAlternateDto {
  @IsNumber()
  productId: number;
}

export class BomLineInputDto {
  // The generic slot name shown on screen - "Motor", "Body", "Jug" - not the
  // specific product. Which product currently fills the slot is
  // componentProductId; other valid choices for the same slot are alternates.
  @IsString()
  slotName: string;

  @IsNumber()
  componentProductId: number;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomLineAlternateDto)
  alternates?: BomLineAlternateDto[];
}

export class CreateBomDto {
  // The ASSEMBLED_GOOD this recipe makes.
  @IsNumber()
  productId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  outputQuantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomLineInputDto)
  lines: BomLineInputDto[];
}

// In-place edit of the CURRENT version - use POST /boms/:id/new-version first
// if the point is to preserve the old recipe for batches already built with it.
export class UpdateBomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  outputQuantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomLineInputDto)
  lines?: BomLineInputDto[];
}

export class BomSearchDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsNumber()
  skip?: number;

  @IsOptional()
  @IsNumber()
  take?: number;
}
