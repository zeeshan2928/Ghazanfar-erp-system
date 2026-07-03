import { IsString, IsOptional, IsNumber } from 'class-validator';

export class WebsiteOrderItemDto {
  productId: number;
  quantity: number;
  unit_price: number;
}

export class ApproveWebsiteOrderDto {
  @IsNumber()
  customerId: number;

  @IsNumber()
  warehouseId: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class RejectWebsiteOrderDto {
  @IsString()
  reason: string;
}
