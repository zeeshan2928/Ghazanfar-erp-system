export enum FilterOperator {
  EQUALS = 'equals',
  DOES_NOT_EQUAL = 'doesNotEqual',
  CONTAINS = 'contains',
  DOES_NOT_CONTAIN = 'doesNotContain',
  IS_LIKE = 'isLike',
  IS_NOT_LIKE = 'isNotLike',
  BEGINS_WITH = 'beginsWith',
  ENDS_WITH = 'endsWith',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  BETWEEN = 'between',
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

export interface FilterOperatorDto {
  field: string;
  operator: FilterOperator;
  value: any;
  dataType: DataType;
}

export interface SearchRequestDto {
  primaryFilter?: FilterOperatorDto;
  columnFilters?: FilterOperatorDto[];
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ColumnValueDto {
  value: string | number;
  label: string;
  count?: number;
}

export interface FilterResponseDto<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

export interface ScreenFilterConfig {
  [screen: string]: {
    [field: string]: FilterOperator[];
  };
}
