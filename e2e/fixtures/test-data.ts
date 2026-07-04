/**
 * E2E Test Fixtures
 *
 * Test data and fixtures for E2E testing with Playwright
 */

export const TEST_USERS = {
  ADMIN: {
    email: 'admin@test.com',
    password: 'Test@123456',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  },
  MANAGER: {
    email: 'manager@test.com',
    password: 'Test@123456',
    firstName: 'Manager',
    lastName: 'User',
    role: 'MANAGER',
  },
  STAFF: {
    email: 'staff@test.com',
    password: 'Test@123456',
    firstName: 'Staff',
    lastName: 'User',
    role: 'STAFF',
  },
  VIEWER: {
    email: 'viewer@test.com',
    password: 'Test@123456',
    firstName: 'Viewer',
    lastName: 'User',
    role: 'VIEWER',
  },
};

export const TEST_PRODUCTS = [
  {
    id: 1,
    code: 'PROD-001',
    name: 'Test Product 1',
    category: 'TEST',
    unit: 'PIECE',
    costPrice: 500,
    sellingPrice: 1000,
    stockLevel: 100,
    reorderLevel: 10,
  },
  {
    id: 2,
    code: 'PROD-002',
    name: 'Test Product 2',
    category: 'TEST',
    unit: 'PIECE',
    costPrice: 800,
    sellingPrice: 1500,
    stockLevel: 50,
    reorderLevel: 5,
  },
  {
    id: 3,
    code: 'PROD-003',
    name: 'Test Product 3',
    category: 'TEST',
    unit: 'KG',
    costPrice: 200,
    sellingPrice: 400,
    stockLevel: 200,
    reorderLevel: 20,
  },
];

export const TEST_CUSTOMERS = [
  {
    id: 1,
    name: 'Test Customer 1',
    email: 'customer1@test.com',
    phone: '+1234567890',
    address: '123 Test Street',
    city: 'Test City',
    country: 'Test Country',
  },
  {
    id: 2,
    name: 'Test Customer 2',
    email: 'customer2@test.com',
    phone: '+1234567891',
    address: '456 Test Avenue',
    city: 'Test City',
    country: 'Test Country',
  },
];

export const TEST_VENDORS = [
  {
    id: 1,
    name: 'Test Vendor 1',
    email: 'vendor1@test.com',
    phone: '+1234567890',
    address: '123 Vendor Street',
    city: 'Vendor City',
    country: 'Test Country',
  },
  {
    id: 2,
    name: 'Test Vendor 2',
    email: 'vendor2@test.com',
    phone: '+1234567891',
    address: '456 Vendor Avenue',
    city: 'Vendor City',
    country: 'Test Country',
  },
];

export const TEST_BILL = {
  customerName: 'Test Customer 1',
  billDate: new Date().toISOString().split('T')[0],
  items: [
    {
      productId: 1,
      quantity: 5,
      price: 1000,
    },
    {
      productId: 2,
      quantity: 3,
      price: 1500,
    },
  ],
  totalAmount: 9500,
  status: 'DRAFT',
  channel: 'WALK_IN',
  paymentMethod: 'CASH',
};

export const TEST_PURCHASE_ORDER = {
  vendorName: 'Test Vendor 1',
  items: [
    {
      productId: 1,
      quantity: 50,
      unitPrice: 500,
    },
    {
      productId: 2,
      quantity: 30,
      unitPrice: 800,
    },
  ],
  totalAmount: 49000,
  expectedDeliveryDate: new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(),
  status: 'DRAFT',
};

/**
 * Test data generators
 */
export class TestDataGenerator {
  static generateProduct(overrides: any = {}): any {
    return {
      code: `PROD-${Math.random().toString(36).substr(2, 9)}`,
      name: `Test Product ${Date.now()}`,
      category: 'TEST',
      unit: 'PIECE',
      costPrice: 500,
      sellingPrice: 1000,
      stockLevel: 100,
      reorderLevel: 10,
      ...overrides,
    };
  }

  static generateCustomer(overrides: any = {}): any {
    const timestamp = Date.now();
    return {
      name: `Customer ${timestamp}`,
      email: `customer${timestamp}@test.com`,
      phone: '+1234567890',
      address: '123 Test Street',
      city: 'Test City',
      country: 'Test Country',
      ...overrides,
    };
  }

  static generateBill(overrides: any = {}): any {
    return {
      customerId: 1,
      channel: 'WALK_IN',
      paymentMethod: 'CASH',
      discountAmount: 0,
      items: [
        {
          productId: 1,
          quantity: 5,
          unitPrice: 1000,
        },
      ],
      remarks: `Test bill ${Date.now()}`,
      ...overrides,
    };
  }

  static generatePurchaseOrder(overrides: any = {}): any {
    return {
      vendorId: 1,
      items: [
        {
          productId: 1,
          quantity: 50,
          unitPrice: 500,
        },
      ],
      expectedDeliveryDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ),
      ...overrides,
    };
  }

  static generateUser(overrides: any = {}): any {
    const timestamp = Date.now();
    return {
      email: `user${timestamp}@test.com`,
      firstName: 'Test',
      lastName: 'User',
      password: 'Test@123456',
      role: 'STAFF',
      ...overrides,
    };
  }
}

/**
 * Search test cases with 16 filter operators
 */
export const SEARCH_TEST_CASES = {
  EQUALS: {
    operator: '=',
    fieldName: 'status',
    value: 'DRAFT',
    expected: ['BILL-001', 'BILL-003'],
  },
  DOES_NOT_EQUAL: {
    operator: '!=',
    fieldName: 'status',
    value: 'PAID',
    expected: ['BILL-001', 'BILL-002', 'BILL-003'],
  },
  CONTAINS: {
    operator: '~',
    fieldName: 'customerName',
    value: 'Test',
    expected: ['BILL-001', 'BILL-002'],
  },
  DOES_NOT_CONTAIN: {
    operator: '!~',
    fieldName: 'customerName',
    value: 'Other',
    expected: ['BILL-001', 'BILL-002', 'BILL-003'],
  },
  BEGINS_WITH: {
    operator: '^',
    fieldName: 'billNumber',
    value: 'BILL-2024',
    expected: ['BILL-001', 'BILL-002', 'BILL-003'],
  },
  ENDS_WITH: {
    operator: '$',
    fieldName: 'email',
    value: '@test.com',
    expected: ['user1@test.com', 'user2@test.com'],
  },
  FUZZY_MATCH: {
    operator: 'LIKE',
    fieldName: 'name',
    value: 'test cust',
    expected: ['Test Customer 1', 'Test Customer 2'],
  },
  GREATER_THAN: {
    operator: '>',
    fieldName: 'totalAmount',
    value: 5000,
    expected: ['BILL-002', 'BILL-003'],
  },
  GREATER_THAN_EQUAL: {
    operator: '>=',
    fieldName: 'totalAmount',
    value: 5000,
    expected: ['BILL-001', 'BILL-002', 'BILL-003'],
  },
  LESS_THAN: {
    operator: '<',
    fieldName: 'totalAmount',
    value: 5000,
    expected: ['BILL-001'],
  },
  LESS_THAN_EQUAL: {
    operator: '<=',
    fieldName: 'totalAmount',
    value: 5000,
    expected: ['BILL-001', 'BILL-002'],
  },
  BETWEEN: {
    operator: 'BETWEEN',
    fieldName: 'totalAmount',
    value: [1000, 5000],
    expected: ['BILL-001', 'BILL-002'],
  },
  IN: {
    operator: 'IN',
    fieldName: 'status',
    value: ['DRAFT', 'FINALIZED'],
    expected: ['BILL-001', 'BILL-002', 'BILL-003'],
  },
  NOT_IN: {
    operator: 'NOT IN',
    fieldName: 'status',
    value: ['PAID'],
    expected: ['BILL-001', 'BILL-002', 'BILL-003'],
  },
  IS_EMPTY: {
    operator: 'IS_EMPTY',
    fieldName: 'remarks',
    expected: ['BILL-001'],
  },
  IS_NOT_EMPTY: {
    operator: 'IS_NOT_EMPTY',
    fieldName: 'remarks',
    expected: ['BILL-002', 'BILL-003'],
  },
};

/**
 * Keyboard shortcut test cases
 */
export const KEYBOARD_SHORTCUTS = {
  ALT_N: {
    keys: ['Alt', 'n'],
    expectedAction: 'Create new bill',
  },
  ALT_S: {
    keys: ['Alt', 's'],
    expectedAction: 'Save current form',
  },
  ALT_E: {
    keys: ['Alt', 'e'],
    expectedAction: 'Edit selected item',
  },
  ALT_D: {
    keys: ['Alt', 'd'],
    expectedAction: 'Delete selected item',
  },
  ARROW_NEXT: {
    keys: ['Alt', 'ArrowRight'],
    expectedAction: 'Next page',
  },
  ARROW_PREV: {
    keys: ['Alt', 'ArrowLeft'],
    expectedAction: 'Previous page',
  },
  ESCAPE: {
    keys: ['Escape'],
    expectedAction: 'Close modal/dialog',
  },
  ENTER: {
    keys: ['Enter'],
    expectedAction: 'Submit form',
  },
};

/**
 * Validation test cases
 */
export const VALIDATION_TEST_CASES = {
  REQUIRED_FIELD: {
    field: 'customerId',
    value: '',
    expectedError: 'Customer is required',
  },
  INVALID_EMAIL: {
    field: 'email',
    value: 'invalid-email',
    expectedError: 'Valid email required',
  },
  NEGATIVE_QUANTITY: {
    field: 'quantity',
    value: -5,
    expectedError: 'Quantity must be positive',
  },
  INVALID_DECIMAL: {
    field: 'unitPrice',
    value: 'abc',
    expectedError: 'Price must be a number',
  },
  INVALID_DATE: {
    field: 'billDate',
    value: 'invalid-date',
    expectedError: 'Valid date required',
  },
  MAX_LENGTH: {
    field: 'remarks',
    value: 'x'.repeat(501),
    expectedError: 'Remarks must be less than 500 characters',
  },
};
