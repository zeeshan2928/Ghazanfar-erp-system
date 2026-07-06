import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '../services/transaction.service';

/**
 * Test utility functions for consistent test setup and mocking
 */

export class TestUtils {
  /**
   * Create a test module with common mocks
   */
  static async createTestModule(
    providers: any[] = [],
    imports: any[] = [],
  ): Promise<TestingModule> {
    const defaultProviders = [
      {
        provide: PrismaService,
        useValue: this.createPrismaMock(),
      },
      {
        provide: TransactionService,
        useValue: this.createTransactionMock(),
      },
    ];

    return Test.createTestingModule({
      providers: [...defaultProviders, ...providers],
      imports,
    }).compile();
  }

  /**
   * Create a mock PrismaService with common models
   */
  static createPrismaMock(): any {
    return {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      bill: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      purchaseOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      inventory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
  }

  /**
   * Create a mock TransactionService
   */
  static createTransactionMock(): any {
    return {
      run: jest.fn(callback => callback(this.createPrismaMock())),
    };
  }

  /**
   * Generate test data for a user
   */
  static generateUser(overrides: any = {}): any {
    return {
      id: 1,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'hashed_password',
      role: 'STAFF',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate test data for a bill
   */
  static generateBill(overrides: any = {}): any {
    return {
      id: 1,
      organizationId: 1,
      billNumber: 'BILL-2024-000001',
      customerId: 1,
      billDate: new Date(),
      channel: 'WALK_IN',
      paymentMethod: 'CASH',
      subtotal: 5000,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 5000,
      status: 'DRAFT',
      remarks: 'Test bill',
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Generate test data for a product
   */
  static generateProduct(overrides: any = {}): any {
    return {
      id: 1,
      organizationId: 1,
      code: 'PROD-001',
      name: 'Test Product',
      description: 'Test description',
      category: 'TEST',
      unit: 'PIECE',
      costPrice: 500,
      sellingPrice: 1000,
      stockLevel: 100,
      reorderLevel: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Generate test data for a customer
   */
  static generateCustomer(overrides: any = {}): any {
    return {
      id: 1,
      organizationId: 1,
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '1234567890',
      address: '123 Test Street',
      city: 'Test City',
      country: 'Test Country',
      taxId: 'TAX123',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Generate test data for a purchase order
   */
  static generatePurchaseOrder(overrides: any = {}): any {
    return {
      id: 1,
      organizationId: 1,
      poNumber: 'PO-2024-000001',
      vendorId: 1,
      poDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'DRAFT',
      totalAmount: 10000,
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Assert that an object contains certain properties
   */
  static assertHasProperties(obj: any, properties: string[]): void {
    properties.forEach(prop => {
      expect(obj).toHaveProperty(prop);
    });
  }

  /**
   * Assert pagination response structure
   */
  static assertPaginatedResponse(response: any): void {
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('total');
    expect(response).toHaveProperty('page');
    expect(response).toHaveProperty('pageSize');
    expect(response).toHaveProperty('hasMore');
    expect(Array.isArray(response.data)).toBe(true);
    expect(typeof response.total).toBe('number');
    expect(typeof response.page).toBe('number');
    expect(typeof response.pageSize).toBe('number');
    expect(typeof response.hasMore).toBe('boolean');
  }

  /**
   * Clean up all mocks
   */
  static clearAllMocks(mocks: any[]): void {
    mocks.forEach(mock => {
      if (mock && typeof mock === 'object') {
        Object.values(mock).forEach((value: any) => {
          if (value && typeof value.mockClear === 'function') {
            value.mockClear();
          }
        });
      }
    });
  }
}

/**
 * Database fixtures for integration tests
 */
export class DatabaseFixtures {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  /**
   * Create test organization
   */
  async createOrganization(data: any = {}): Promise<any> {
    return this.prisma.organization.create({
      data: {
        name: 'Test Organization',
        ...data,
      },
    });
  }

  /**
   * Create test user
   */
  async createUser(organizationId: number, data: any = {}): Promise<any> {
    return this.prisma.user.create({
      data: {
        organizationId,
        email: `test-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        password: 'hashed_password',
        role: 'STAFF',
        ...data,
      },
    });
  }

  /**
   * Create test product
   */
  async createProduct(organizationId: number, data: any = {}): Promise<any> {
    return this.prisma.product.create({
      data: {
        organizationId,
        code: `PROD-${Date.now()}`,
        name: 'Test Product',
        description: 'Test',
        category: 'TEST',
        unit: 'PIECE',
        costPrice: 500,
        sellingPrice: 1000,
        ...data,
      },
    });
  }

  /**
   * Create test customer
   */
  async createCustomer(organizationId: number, data: any = {}): Promise<any> {
    return this.prisma.customer.create({
      data: {
        organizationId,
        name: `Test Customer ${Date.now()}`,
        email: `customer-${Date.now()}@example.com`,
        phone: '1234567890',
        ...data,
      },
    });
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    // Delete in order of dependencies
    await this.prisma.billLine.deleteMany({});
    await this.prisma.bill.deleteMany({});
    await this.prisma.purchaseOrderItem.deleteMany({});
    await this.prisma.purchaseOrder.deleteMany({});
    await this.prisma.customer.deleteMany({});
    await this.prisma.product.deleteMany({});
    await this.prisma.user.deleteMany({});
    await this.prisma.organization.deleteMany({});
  }
}
