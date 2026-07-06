import {
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Channel } from '@prisma/client';

// Not a Prisma enum - Bill.discountType is a plain String? column. Kept as a
// real enum here so the DTO validates it instead of accepting any string.
export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

// Not a Prisma enum - Bill.transactionType is a plain String column.
export enum TransactionType {
  SALE = 'SALE',
  RETURN = 'RETURN',
}

export class CreateBillLineDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  warehouseId: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateBillDto {
  @IsNumber()
  customerId: number;

  // MANDATORY - invoice cannot be saved without a way to reach the customer.
  // Kept separate from Customer.phone (which is optional on the customer
  // record itself) so an invoice can also update/confirm the number at the
  // point of sale, per the walk-in-customer identification requirement.
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsNumber()
  salesmanId: number; // MANDATORY - for commission calculation

  @IsEnum(Channel)
  channel: Channel;

  // Defaults to SALE. RETURN skips reservation/gate-pass creation entirely
  // and instead increments inventory back in at returnWarehouseId.
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  // Required when transactionType is RETURN - the single warehouse the
  // returned items are going back into. Not used for SALE (each line has
  // its own dispatch warehouse instead).
  @IsOptional()
  @IsNumber()
  returnWarehouseId?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  // Discount is one-or-the-other via this dropdown, not both at once.
  // Defaults to PERCENTAGE if not supplied.
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryCharges?: number;

  // Free-text, user-entered cashbook reference - not system-generated.
  @IsOptional()
  @IsNumber()
  cashbookNumber?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillLineDto)
  lines: CreateBillLineDto[];
}

export class UpdateBillDto {
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsNumber()
  salesmanId?: number;

  @IsOptional()
  @IsEnum(Channel)
  channel?: Channel;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryCharges?: number;

  @IsOptional()
  @IsNumber()
  cashbookNumber?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  // Only meaningful when the bill is a RETURN - the destination warehouse
  // for all lines, same convention as CreateBillDto.
  @IsOptional()
  @IsNumber()
  returnWarehouseId?: number;

  // transactionType itself cannot be changed via edit (SALE <-> RETURN is a
  // structurally different flow - void and recreate instead).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillLineDto)
  lines?: CreateBillLineDto[];
}

export class ChangeStatusDto {
  @IsString()
  status: string;
}
