/**
 * Load Testing Suite using Artillery.io
 *
 * Tests the system under concurrent load to identify bottlenecks
 * Run with: npm run perf:load
 */

import * as fs from 'fs';
import * as path from 'path';

export const loadTestConfig = {
  config: {
    target: 'http://localhost:3000',
    phases: [
      { duration: 60, arrivalRate: 10, name: 'Warm up' },
      { duration: 120, arrivalRate: 50, name: 'Ramp up' },
      { duration: 60, arrivalRate: 100, name: 'Sustained load' },
      { duration: 60, arrivalRate: 50, name: 'Cool down' },
    ],
    defaults: {
      headers: {
        'User-Agent': 'Artillery Load Test',
        'Content-Type': 'application/json',
      },
    },
  },
  scenarios: [
    {
      name: 'Product Search Load Test',
      description:
        'Test product search endpoint under load (100 concurrent users)',
      flow: [
        {
          think: 2,
        },
        {
          get: {
            url: '/api/products?search=test&page=1&limit=20',
            expect: [
              { statusCode: 200 },
              {
                contentType: 'json',
              },
            ],
            capture: {
              json: '$.data',
              as: 'products',
            },
          },
        },
      ],
      metrics: {
        responseTime: { min: 100, max: 500, p99: 400 },
        successRate: 95,
      },
    },
    {
      name: 'Bill Creation Load Test',
      description: 'Test bill creation endpoint under load (50 concurrent)',
      flow: [
        {
          think: 1,
        },
        {
          post: {
            url: '/api/bills',
            json: {
              customerId: 1,
              channel: 'WALK_IN',
              paymentMethod: 'CASH',
              discountAmount: 0,
              lines: [
                {
                  productId: 1,
                  warehouseId: 1,
                  quantity: 5,
                  unitPrice: 1000,
                },
              ],
            },
            expect: [
              { statusCode: 201 },
              {
                contentType: 'json',
              },
            ],
            capture: {
              json: '$.id',
              as: 'billId',
            },
          },
        },
      ],
      metrics: {
        responseTime: { min: 200, max: 800, p99: 700 },
        successRate: 90,
      },
    },
    {
      name: 'Report Generation Load Test',
      description: 'Test report generation under load (30 concurrent)',
      flow: [
        {
          think: 2,
        },
        {
          get: {
            url: '/api/reports/sales?startDate=2024-01-01&endDate=2024-01-31',
            expect: [
              { statusCode: 200 },
              {
                contentType: 'json',
              },
            ],
          },
        },
      ],
      metrics: {
        responseTime: { min: 300, max: 2000, p99: 1500 },
        successRate: 85,
      },
    },
    {
      name: 'WebSocket Real-Time Load Test',
      description: 'Test WebSocket connections under load',
      flow: [
        {
          think: 1,
        },
        {
          ws: {
            url: 'ws://localhost:3000/api/realtime',
            actions: [
              {
                type: 'connect',
              },
              {
                type: 'send',
                json: {
                  action: 'subscribe',
                  channel: 'kpis',
                },
              },
              {
                type: 'think',
                duration: 5,
              },
              {
                type: 'close',
              },
            ],
          },
        },
      ],
      metrics: {
        connectionTime: { p99: 50 },
        messageLatency: { p99: 100 },
      },
    },
  ],
};

/**
 * Performance test suite targeting specific endpoints
 */
export const performanceTests = {
  search: {
    name: 'Product Search Performance',
    description: 'Measure search latency with various filter operators',
    tests: [
      {
        name: 'Search - equals operator',
        endpoint: '/api/products',
        method: 'GET',
        params: { filter: 'status=ACTIVE', page: 1, limit: 20 },
        expectedResponseTime: 200,
      },
      {
        name: 'Search - contains operator',
        endpoint: '/api/products',
        method: 'GET',
        params: { filter: 'name~Test', page: 1, limit: 20 },
        expectedResponseTime: 250,
      },
      {
        name: 'Search - IN operator',
        endpoint: '/api/products',
        method: 'GET',
        params: {
          filter: 'status IN (ACTIVE,INACTIVE)',
          page: 1,
          limit: 20,
        },
        expectedResponseTime: 250,
      },
      {
        name: 'Search - BETWEEN operator',
        endpoint: '/api/bills',
        method: 'GET',
        params: {
          filter: 'totalAmount BETWEEN 1000 AND 10000',
          page: 1,
          limit: 20,
        },
        expectedResponseTime: 300,
      },
    ],
  },

  crud: {
    name: 'CRUD Operations Performance',
    description: 'Measure create, read, update, delete latency',
    tests: [
      {
        name: 'Create Bill',
        endpoint: '/api/bills',
        method: 'POST',
        body: {
          customerId: 1,
          channel: 'WALK_IN',
          paymentMethod: 'CASH',
          lines: [{ productId: 1, quantity: 5, unitPrice: 1000 }],
        },
        expectedResponseTime: 500,
      },
      {
        name: 'Read Bill',
        endpoint: '/api/bills/1',
        method: 'GET',
        expectedResponseTime: 150,
      },
      {
        name: 'Update Bill',
        endpoint: '/api/bills/1',
        method: 'PUT',
        body: {
          remarks: 'Updated remarks',
        },
        expectedResponseTime: 300,
      },
      {
        name: 'Delete Bill',
        endpoint: '/api/bills/1',
        method: 'DELETE',
        expectedResponseTime: 200,
      },
    ],
  },

  aggregation: {
    name: 'Aggregation Performance',
    description: 'Measure report generation and aggregation latency',
    tests: [
      {
        name: 'Sales Report (7 days)',
        endpoint: '/api/reports/sales',
        method: 'GET',
        params: { startDate: '2024-01-01', endDate: '2024-01-07' },
        expectedResponseTime: 1000,
      },
      {
        name: 'Sales Report (30 days)',
        endpoint: '/api/reports/sales',
        method: 'GET',
        params: { startDate: '2024-01-01', endDate: '2024-01-31' },
        expectedResponseTime: 2000,
      },
      {
        name: 'Vendor Report',
        endpoint: '/api/reports/vendors',
        method: 'GET',
        params: { startDate: '2024-01-01', endDate: '2024-01-31' },
        expectedResponseTime: 1500,
      },
      {
        name: 'Inventory Valuation',
        endpoint: '/api/reports/inventory',
        method: 'GET',
        expectedResponseTime: 2000,
      },
    ],
  },
};

/**
 * Memory profiling test suite
 */
export const memoryProfilingTests = {
  bulkOperations: [
    {
      name: 'Bulk Create 1000 Products',
      description: 'Create 1000 products and measure memory usage',
      operations: 1000,
      endpoint: '/api/products',
      method: 'POST',
      batchSize: 100,
    },
    {
      name: 'Bulk Create 10000 Bills',
      description: 'Create 10000 bills and measure memory usage',
      operations: 10000,
      endpoint: '/api/bills',
      method: 'POST',
      batchSize: 100,
    },
    {
      name: 'Large Query Result Set',
      description: 'Fetch 10000+ records and measure memory usage',
      endpoint: '/api/bills',
      method: 'GET',
      params: { limit: 10000 },
    },
  ],

  memleak: [
    {
      name: 'Connection Pool Leak Detection',
      description:
        'Create and close 1000 database connections to detect leaks',
      cycles: 1000,
      checkInterval: 100,
      thresholdMB: 50,
    },
    {
      name: 'Cache Leak Detection',
      description: 'Add and remove items from cache to detect memory leaks',
      cycles: 10000,
      checkInterval: 100,
      thresholdMB: 100,
    },
  ],
};

/**
 * CPU profiling test suite
 */
export const cpuProfilingTests = {
  heavyComputations: [
    {
      name: 'Bill Total Calculation',
      description: 'Profile CPU usage when calculating bill totals',
      iterations: 10000,
      billLines: 100,
    },
    {
      name: 'Report Generation',
      description: 'Profile CPU usage during report aggregation',
      iterations: 1000,
      dateRange: 365,
    },
    {
      name: 'Fuzzy Search',
      description: 'Profile CPU usage during fuzzy search operations',
      iterations: 5000,
      searchTermLength: 10,
    },
  ],
};

/**
 * Database query performance tests
 */
export const databasePerformanceTests = {
  queries: [
    {
      name: 'Simple SELECT',
      query: 'SELECT * FROM bills LIMIT 20',
      expectedTime: 50,
    },
    {
      name: 'JOIN with multiple tables',
      query: `
        SELECT b.*, c.name, COUNT(bl.id) as lineCount
        FROM bills b
        JOIN customers c ON b.customerId = c.id
        LEFT JOIN billLines bl ON b.id = bl.billId
        GROUP BY b.id
        LIMIT 20
      `,
      expectedTime: 150,
    },
    {
      name: 'Aggregation query',
      query: `
        SELECT
          DATE(billDate) as date,
          COUNT(*) as billCount,
          SUM(totalAmount) as totalAmount,
          AVG(totalAmount) as avgAmount
        FROM bills
        WHERE billDate >= NOW() - INTERVAL 30 DAY
        GROUP BY DATE(billDate)
      `,
      expectedTime: 300,
    },
    {
      name: 'Complex JOIN with aggregation',
      query: `
        SELECT
          v.name as vendor,
          COUNT(po.id) as poCount,
          SUM(po.totalAmount) as totalSpent,
          AVG(po.totalAmount) as avgOrder
        FROM purchaseOrders po
        JOIN vendors v ON po.vendorId = v.id
        WHERE po.createdAt >= NOW() - INTERVAL 90 DAY
        GROUP BY v.id, v.name
        ORDER BY totalSpent DESC
      `,
      expectedTime: 500,
    },
  ],

  indexes: [
    {
      name: 'Index: bills(organizationId, status)',
      query: 'SELECT * FROM bills WHERE organizationId = 1 AND status = ?',
      withoutIndex: 500,
      withIndex: 50,
    },
    {
      name: 'Index: billLines(billId)',
      query: 'SELECT * FROM billLines WHERE billId = ?',
      withoutIndex: 200,
      withIndex: 10,
    },
    {
      name: 'Index: bills(billDate)',
      query:
        'SELECT * FROM bills WHERE billDate BETWEEN ? AND ? ORDER BY billDate',
      withoutIndex: 1000,
      withIndex: 100,
    },
  ],
};
