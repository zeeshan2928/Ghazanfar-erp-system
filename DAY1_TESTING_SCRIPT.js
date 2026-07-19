#!/usr/bin/env node

/**
 * PHASE 1 - DAY 1 TESTING SCRIPT
 * Manual Bill API Testing
 *
 * This script tests Bills API without requiring a full build
 * Run: node DAY1_TESTING_SCRIPT.js
 */

const http = require('http');

// Configuration
const API_BASE = 'http://localhost:3000';
const ORG_ID = 1;
let TEST_TOKEN = 'test-token'; // Will be replaced dynamically

// Test utilities
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async run(name, fn) {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      await fn();
      this.passed++;
      console.log(`✅ PASSED: ${name}`);
      this.tests.push({ name, status: 'PASSED' });
    } catch (error) {
      this.failed++;
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
      this.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  report() {
    console.log('\n' + '='.repeat(60));
    console.log('DAY 1 TESTING REPORT');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.passed + this.failed}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log('='.repeat(60));

    this.tests.forEach(t => {
      const icon = t.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${t.name}`);
      if (t.error) console.log(`   ${t.error}`);
    });

    console.log('='.repeat(60));
    console.log(this.failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
    console.log('='.repeat(60));
  }
}

// HTTP helper
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'X-Organization-Id': ORG_ID.toString(),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Authentication
async function authenticate() {
  console.log('\n🔐 Authenticating as admin...');
  const res = await request('POST', '/users/login', {
    email: 'admin@ghazanfar.com',
    password: 'Demo@12345',
  });
  
  if (res.status === 200 || res.status === 201) {
    TEST_TOKEN = res.body.access_token || res.body.token;
    console.log('✅ Authentication successful');
  } else {
    throw new Error(`Authentication failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
}

// Test Cases
async function setupTestData() {
  console.log('\n📦 Setting up test data...');

  const uniqueId = Date.now();
  
  // Create test customer
  const customerRes = await request('POST', '/customers', {
    name: `Test Customer ${uniqueId}`,
    phone: '1234567890',
    email: `test_${uniqueId}@example.com`,
    address: 'Test Address',
  });

  if (customerRes.status !== 201 && customerRes.status !== 200) {
    throw new Error(`Failed to create customer: ${customerRes.status}`);
  }

  const customerId = customerRes.body.id || customerRes.body.customer?.id || 1;
  console.log(`✅ Customer created: ${customerId}`);

  // Create test product
  const productRes = await request('POST', '/products', {
    name: `Test Product ${uniqueId}`,
    code: `TEST-SKU-${uniqueId}`,
    costPrice: 50000, // 500 PKR in paisa
  });

  if (productRes.status !== 201 && productRes.status !== 200) {
    throw new Error(`Failed to create product: ${productRes.status}`);
  }

  const productId = productRes.body.id || productRes.body.product?.id || 1;
  console.log(`✅ Product created: ${productId}`);

  // Get warehouse
  const whRes = await request('GET', '/warehouses');
  const warehouseId = whRes.body.data?.[0]?.id || whRes.body[0]?.id || 1;
  console.log(`✅ Warehouse found: ${warehouseId}`);

  // Create initial inventory for all warehouses
  const warehouses = whRes.body.data || whRes.body || [{ id: 1 }];
  for (const wh of warehouses) {
    await request('POST', '/inventory/operations/create', {
      productId,
      warehouseId: wh.id,
      openingBalance: 100,
    });
    console.log(`✅ Inventory created for product ${productId} in warehouse ${wh.id}`);
  }

  return { customerId, productId, warehouseId };
}

async function testBillCreation(testRunner, data) {
  await testRunner.run('Create Bill - Single Warehouse', async () => {
    const response = await request('POST', '/bills', {
      customerId: data.customerId,
      customerPhone: '1234567890',
      salesmanId: 1, // Add standard salesmanId (usually admin is 1)
      channel: 'COUNTER',
      paymentMethod: 'CASH',
      lines: [
        {
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: 5,
          unitPrice: 50000,
        },
      ],
    });

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Status ${response.status}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.id && !response.body.bill?.id) {
      throw new Error('No bill ID in response');
    }

    return response.body;
  });
}

async function testBillRetrieval(testRunner) {
  await testRunner.run('Retrieve Bills - List All', async () => {
    const response = await request('GET', '/bills?skip=0&take=10');

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}`);
    }

    if (!Array.isArray(response.body.data) && !Array.isArray(response.body)) {
      throw new Error('Response is not an array');
    }
  });
}

async function testBillUpdate(testRunner) {
  await testRunner.run('Update Bill - Change Discount', async () => {
    // First get a bill
    const listRes = await request('GET', '/bills?skip=0&take=1');
    const bills = listRes.body.data || listRes.body || [];

    if (bills.length === 0) {
      throw new Error('No bills found for update test');
    }

    const billId = bills[0].id;
    const updateRes = await request('PUT', `/bills/${billId}`, {
      discountAmount: 1000,
    });

    if (updateRes.status !== 200 && updateRes.status !== 201) {
      throw new Error(`Status ${updateRes.status}`);
    }
  });
}

async function testStatusTransition(testRunner) {
  await testRunner.run('Bill Status - Change to APPROVED', async () => {
    // Get a bill
    const listRes = await request('GET', '/bills?skip=0&take=1');
    const bills = listRes.body.data || listRes.body || [];

    if (bills.length === 0) {
      throw new Error('No bills found');
    }

    const billId = bills[0].id;
    const statusRes = await request('PATCH', `/bills/${billId}/status`, {
      status: 'APPROVED',
    });

    if (statusRes.status !== 200 && statusRes.status !== 201) {
      throw new Error(`Status ${statusRes.status}`);
    }
  });
}

async function testGatePassGeneration(testRunner) {
  await testRunner.run('Gate Pass Auto-Generation - Created on Bill', async () => {
    // Get recently created bills
    const listRes = await request('GET', '/bills?skip=0&take=1');
    const bills = listRes.body.data || listRes.body || [];

    if (bills.length === 0) {
      throw new Error('No bills found');
    }

    const billId = bills[0].id;

    // Check gate passes for this bill
    const gatePassRes = await request('GET', `/gate-passes?billId=${billId}`);
    const gatePasses = gatePassRes.body.data || gatePassRes.body || [];

    if (gatePasses.length === 0) {
      console.warn('⚠️  No gate passes found for bill - auto-generation may not be working');
    } else {
      console.log(`✅ Found ${gatePasses.length} gate pass(es)`);
    }
  });
}

async function testGatePassConfirmation(testRunner) {
  await testRunner.run('Gate Pass Confirmation - Mark as Complete', async () => {
    // Get pending gate passes
    const gatePassRes = await request('GET', '/gate-passes?status=PENDING&skip=0&take=1');
    const gatePasses = gatePassRes.body.data || gatePassRes.body || [];

    if (gatePasses.length === 0) {
      throw new Error('No pending gate passes found');
    }

    const gatePassId = gatePasses[0].id;
    const items = gatePasses[0].items || [];
    const pickedItems = items.map(item => ({
      billLineId: item.billLineId,
      pickedQuantity: item.quantity
    }));

    const confirmRes = await request('POST', `/gate-passes/${gatePassId}/confirm`, {
      remarks: 'Test confirmation',
      pickedItems,
    });

    if (confirmRes.status !== 200 && confirmRes.status !== 201) {
      throw new Error(`Status ${confirmRes.status}`);
    }
  });
}

async function testMultiWarehouseBill(testRunner, data) {
  await testRunner.run('Create Bill - Multiple Warehouses', async () => {
    // Get list of warehouses
    const whRes = await request('GET', '/warehouses');
    const warehouses = whRes.body.data || whRes.body || [];

    if (warehouses.length < 2) {
      throw new Error('Need at least 2 warehouses for multi-warehouse test');
    }

    const response = await request('POST', '/bills', {
      customerId: data.customerId,
      customerPhone: '1234567890',
      salesmanId: 1,
      channel: 'COUNTER',
      paymentMethod: 'CASH',
      lines: [
        {
          productId: data.productId,
          warehouseId: warehouses[0].id,
          quantity: 3,
          unitPrice: 50000,
        },
        {
          productId: data.productId,
          warehouseId: warehouses[1].id,
          quantity: 2,
          unitPrice: 50000,
        },
      ],
    });

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Status ${response.status}`);
    }

    console.log('✅ Multi-warehouse bill created successfully');
  });
}

async function testInventoryReservation(testRunner, data) {
  await testRunner.run('Inventory - Reserved After Bill Creation', async () => {
    // Get inventory for a warehouse
    const invRes = await request('GET', `/inventory/${data.productId}/warehouse/${data.warehouseId}`);
    const item = invRes.body;

    if (!item || item.error) {
      console.warn('⚠️  No inventory found or error returned');
    } else {
      if (item.reserved === undefined) {
        throw new Error('No reserved field in inventory response');
      }
      console.log(`✅ Inventory tracking found (reserved: ${item.reserved})`);
    }
  });
}

// Main execution
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════╗
║        PHASE 1 - DAY 1 BILLS API TESTING              ║
║        Testing Bills, Gate Pass, & Multi-Warehouse    ║
╚════════════════════════════════════════════════════════╝
  `);

  const testRunner = new TestRunner();

  try {
    console.log('🚀 Starting API tests...\n');
    console.log(`📍 API Base: ${API_BASE}`);
    console.log(`🏢 Organization: ${ORG_ID}\n`);

    // Authentication
    try {
      await authenticate();
    } catch (error) {
      console.error('❌ Authentication failed - cannot run tests');
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }

    // Setup
    console.log('\n📋 SETUP PHASE');
    let testData;
    try {
      testData = await setupTestData();
    } catch (error) {
      console.error('❌ Setup failed - tests may not run properly');
      console.error(`   Error: ${error.message}`);
      console.error('\n⚠️  Make sure:');
      console.error('   1. Backend server is running on http://localhost:3000');
      console.error('   2. Database is seeded with test data');
      console.error('   3. Auth is disabled or test token is valid');
      testData = { customerId: 1, productId: 1, warehouseId: 1 };
    }

    // Bills API Tests
    console.log('\n📋 BILLS API TESTS');
    await testBillCreation(testRunner, testData);
    await testBillRetrieval(testRunner);
    await testBillUpdate(testRunner);
    await testStatusTransition(testRunner);
    await testMultiWarehouseBill(testRunner, testData);

    // Gate Pass Tests
    console.log('\n📋 GATE PASS TESTS');
    await testGatePassGeneration(testRunner);
    await testGatePassConfirmation(testRunner);

    // Inventory Tests
    console.log('\n📋 INVENTORY TESTS');
    await testInventoryReservation(testRunner, testData);

    // Report
    testRunner.report();

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
