import { IsOptional, IsString, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum FilterOperator {
  // Text operators
  EQUALS = 'equals',
  DOES_NOT_EQUAL = 'doesNotEqual',
  CONTAINS = 'contains',
  DOES_NOT_CONTAIN = 'doesNotContain',
  IS_LIKE = 'isLike', // Fuzzy match
  IS_NOT_LIKE = 'isNotLike',
  BEGINS_WITH = 'beginsWith',
  ENDS_WITH = 'endsWith',

  // Numeric operators
  GT = 'gt', // Greater than
  GTE = 'gte', // Greater than or equal
  LT = 'lt', // Less than
  LTE = 'lte', // Less than or equal
  BETWEEN = 'between',

  // List operators
  IN = 'in',
  NOT_IN = 'notIn',
}

export enum DataType {
  TEXT = 'text',
  NUMERIC = 'numeric',
  DATE = 'date',
  ENUM = 'enum',
  BOOLEAN = 'boolean',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class FilterOperatorDto {
  @IsString()
  field: string;

  @IsEnum(FilterOperator)
  operator: FilterOperator;

  @IsOptional()
  value?: string | number | boolean | Date | (string | number)[];

  @IsEnum(DataType)
  dataType: DataType;
}

export class SearchRequestDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => FilterOperatorDto)
  primaryFilter?: FilterOperatorDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterOperatorDto)
  columnFilters?: FilterOperatorDto[];

  @IsOptional()
  @IsNumber()
  skip?: number;

  @IsOptional()
  @IsNumber()
  take?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}

export class FilterResponseDto<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

// Column value response for filter dropdowns
export class ColumnValueDto {
  value: string | number | boolean;
  label: string;
  count?: number; // Optional count for UI display
}

// Screen-specific filter configuration
export interface FilterConfig {
  [fieldName: string]: FilterOperator[];
}

// Model-level configuration for screens
export interface ScreenFilterConfig {
  [screenName: string]: FilterConfig;
}
