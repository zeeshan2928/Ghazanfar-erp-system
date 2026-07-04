import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum ImportExportEntityType {
  PRODUCTS = 'products',
  BILLS = 'bills',
  PURCHASE_ORDERS = 'purchaseOrders',
  CUSTOMERS = 'customers',
  VENDORS = 'vendors',
}

export class ImportRequestDto {
  @IsEnum(ImportExportEntityType)
  entityType: ImportExportEntityType;

  @IsOptional()
  @IsString()
  csvData?: string; // Raw CSV data

  @IsOptional()
  @IsString()
  filename?: string;
}

export class ImportResponseDto {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
  timestamp: Date;
}

export class ExportResponseDto {
  data: string; // CSV content as string
  filename: string;
  timestamp: Date;
  rowCount: number;
}
