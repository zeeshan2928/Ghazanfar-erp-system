import { FilterOperator, ScreenFilterConfig } from '../dto/filter.dto';

/**
 * Screen-specific filter configurations
 * Each screen defines which operators are available for each field
 * This makes the system extensible - new screens can be added by just adding config
 */

export const SCREEN_FILTER_CONFIGS: ScreenFilterConfig = {
  // Bills/Invoices Screen
  bills: {
    bill_number: [
      FilterOperator.EQUALS,
      FilterOperator.DOES_NOT_EQUAL,
      FilterOperator.CONTAINS,
      FilterOperator.BEGINS_WITH,
      FilterOperator.ENDS_WITH,
    ],
    customer_name: [
      FilterOperator.EQUALS,
      FilterOperator.DOES_NOT_EQUAL,
      FilterOperator.CONTAINS,
      FilterOperator.DOES_NOT_CONTAIN,
      FilterOperator.IS_LIKE,
      FilterOperator.IS_NOT_LIKE,
      FilterOperator.BEGINS_WITH,
    ],
    amount: [
      FilterOperator.EQUALS,
      FilterOperator.DOES_NOT_EQUAL,
      FilterOperator.GT,
      FilterOperator.GTE,
      FilterOperator.LT,
      FilterOperator.LTE,
      FilterOperator.BETWEEN,
    ],
    bill_date: [FilterOperator.EQUALS, FilterOperator.BETWEEN],
    status: [FilterOperator.IN, FilterOperator.NOT_IN],
    payment_method: [FilterOperator.IN, FilterOperator.NOT_IN],
    employee_name: [FilterOperator.EQUALS, FilterOperator.IN, FilterOperator.CONTAINS],
  },

  // Products Screen
  products: {
    name: [
      FilterOperator.IS_LIKE,
      FilterOperator.IS_NOT_LIKE,
      FilterOperator.EQUALS,
      FilterOperator.DOES_NOT_EQUAL,
      FilterOperator.CONTAINS,
      FilterOperator.BEGINS_WITH,
    ],
    code: [
      FilterOperator.EQUALS,
      FilterOperator.DOES_NOT_EQUAL,
      FilterOperator.CONTAINS,
      FilterOperator.BEGINS_WITH,
    ],
    brand: [FilterOperator.IN, FilterOperator.NOT_IN, FilterOperator.EQUALS],
    category: [FilterOperator.IN, FilterOperator.NOT_IN, FilterOperator.EQUALS],
    cost_price: [
      FilterOperator.EQUALS,
      FilterOperator.GT,
      FilterOperator.GTE,
      FilterOperator.LT,
      FilterOperator.LTE,
      FilterOperator.BETWEEN,
    ],
    stock_level: [FilterOperator.IN, FilterOperator.NOT_IN],
  },

  // Manage Stock Screen
  stock: {
    stock_id: [
      FilterOperator.EQUALS,
      FilterOperator.CONTAINS,
      FilterOperator.BEGINS_WITH,
      FilterOperator.ENDS_WITH,
    ],
    bill_number: [FilterOperator.EQUALS, FilterOperator.CONTAINS, FilterOperator.BEGINS_WITH],
    account: [FilterOperator.IN, FilterOperator.NOT_IN, FilterOperator.EQUALS],
    date_received: [FilterOperator.EQUALS, FilterOperator.BETWEEN],
    warehouse: [FilterOperator.IN, FilterOperator.NOT_IN, FilterOperator.EQUALS],
    product_name: [FilterOperator.IS_LIKE, FilterOperator.CONTAINS, FilterOperator.EQUALS],
    quantity: [
      FilterOperator.EQUALS,
      FilterOperator.GT,
      FilterOperator.GTE,
      FilterOperator.LT,
      FilterOperator.LTE,
      FilterOperator.BETWEEN,
    ],
  },

  // Customers Screen
  customers: {
    name: [
      FilterOperator.IS_LIKE,
      FilterOperator.IS_NOT_LIKE,
      FilterOperator.EQUALS,
      FilterOperator.DOES_NOT_EQUAL,
      FilterOperator.CONTAINS,
      FilterOperator.BEGINS_WITH,
    ],
    customer_type: [FilterOperator.IN, FilterOperator.NOT_IN, FilterOperator.EQUALS],
    phone: [FilterOperator.EQUALS, FilterOperator.CONTAINS, FilterOperator.BEGINS_WITH],
    email: [FilterOperator.EQUALS, FilterOperator.CONTAINS, FilterOperator.IS_LIKE],
    credit_limit: [
      FilterOperator.GT,
      FilterOperator.GTE,
      FilterOperator.LT,
      FilterOperator.LTE,
      FilterOperator.BETWEEN,
    ],
  },

  // Purchase Orders Screen
  purchase_orders: {
    po_number: [
      FilterOperator.EQUALS,
      FilterOperator.DOES_NOT_EQUAL,
      FilterOperator.CONTAINS,
      FilterOperator.BEGINS_WITH,
    ],
    vendor_name: [
      FilterOperator.IS_LIKE,
      FilterOperator.EQUALS,
      FilterOperator.CONTAINS,
      FilterOperator.BEGINS_WITH,
    ],
    status: [FilterOperator.IN, FilterOperator.NOT_IN, FilterOperator.EQUALS],
    created_date: [FilterOperator.EQUALS, FilterOperator.BETWEEN],
    amount: [
      FilterOperator.EQUALS,
      FilterOperator.GT,
      FilterOperator.GTE,
      FilterOperator.LT,
      FilterOperator.LTE,
      FilterOperator.BETWEEN,
    ],
  },
};

/**
 * Get allowed operators for a specific screen and field
 * Usage: getAllowedOperators('bills', 'customer_name')
 * Returns: [EQUALS, CONTAINS, IS_LIKE, ...]
 */
export function getAllowedOperators(screenName: string, fieldName: string): FilterOperator[] {
  const screenConfig = SCREEN_FILTER_CONFIGS[screenName];
  if (!screenConfig) {
    throw new Error(`Screen configuration not found: ${screenName}`);
  }

  const fieldOperators = screenConfig[fieldName];
  if (!fieldOperators) {
    throw new Error(`Field configuration not found for screen '${screenName}': ${fieldName}`);
  }

  return fieldOperators;
}

/**
 * Check if a field is allowed on a screen
 */
export function isFieldAllowed(screenName: string, fieldName: string): boolean {
  const screenConfig = SCREEN_FILTER_CONFIGS[screenName];
  return screenConfig && fieldName in screenConfig;
}

/**
 * Get all field names available for a screen
 */
export function getScreenFields(screenName: string): string[] {
  const screenConfig = SCREEN_FILTER_CONFIGS[screenName];
  if (!screenConfig) {
    throw new Error(`Screen configuration not found: ${screenName}`);
  }
  return Object.keys(screenConfig);
}

/**
 * List all configured screens
 */
export function getConfiguredScreens(): string[] {
  return Object.keys(SCREEN_FILTER_CONFIGS);
}
