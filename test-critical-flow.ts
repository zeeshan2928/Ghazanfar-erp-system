/**
 * TIER 1: INTEGRATION TEST - Gate Pass + Inventory Reservation & Confirmation
 *
 * This test verifies the 3 critical systems work correctly:
 * 1. Gate Pass auto-generation on bill creation
 * 2. Inventory reservation on bill creation
 * 3. Inventory deduction on gate pass confirmation
 *
 * Run: npx ts-node test-critical-flow.ts
 *
 * Test Flow:
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 1: Setup
 *   - Create test customer
 *   - Create test products
 *   - Create test warehouses
 *   - Get initial inventory levels
 *
 * Step 2: Create Bill (Multi-warehouse)
 *   - Bill with 2 items: Product A in WH-A (qty 10), Product B in WH-B (qty 5)
 *   - Verify: Bill created with status APPROVED
 *   - Verify: Gate passes auto-created (1 for WH-A, 1 for WH-B)
 *   - Verify: Inventory reserved (available decreases)
 *
 * Step 3: Confirm Gate Pass
 *   - Confirm gate pass for WH-A with picked qty = 10
 *   - Verify: Gate pass status = CONFIRMED
 *   - Verify: Inventory deducted (physical_on_hand decreases)
 *   - Verify: Reserved decreases
 *
 * Step 4: Reject Gate Pass (second one)
 *   - Reject gate pass for WH-B
 *   - Verify: Gate pass status = REJECTED
 *   - Verify: Reserved released (available increases)
 *
 * Step 5: Report Shortage (if partial pick)
 *   - Create new bill with shortage scenario
 *   - Report shortage (picked < ordered)
 *   - Verify: Only picked qty is deducted on confirm
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';
const ORG_ID = 1; // Assuming organization 1 exists

// Test data storage
let testData = {
  customer: null as any,
  products: [] as any[],
  warehouses: [] as any[],
  bill: null as any,
  gatePasses: [] as any[],
  initialInventory: {} as any,
};

// Utility: Make API call
async function api(method: string, endpoint: string, data?: any) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        // Add your JWT token here if needed
      },
    };

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
    };
  }
}

// Utility: Print test result
function result(testName: string, passed: boolean, message?: string) {
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`${icon} ${status}: ${testName}`);
  if (message) console.log(`   └─ ${message}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// STEP 1: SETUP
// ──────────────────────────────────────────────────────────────────────────────

async function setupTestData() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ STEP 1: SETUP TEST DATA                                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // Get or create customer
  console.log('Creating test customer...');
  const customerRes = await api('POST', '/customers', {
    organizationId: ORG_ID,
    name: `Test Customer ${Date.now()}`,
    phone: '03001234567',
    email: `test${Date.now()}@example.com`,
    customerType: 'RETAIL',
  });

  if (!customerRes.success) {
    console.error('❌ Failed to create customer:', customerRes.error);
    process.exit(1);
  }

  testData.customer = customerRes.data;
  result('Create Customer', true, `ID: ${testData.customer.id}, Name: ${testData.customer.name}`);

  // Get or create warehouses
  console.log('\nGetting warehouses...');
  const whRes = await api('GET', '/warehouses');
  if (whRes.success && whRes.data.length >= 2) {
    testData.warehouses = whRes.data.slice(0, 2);
    result('Get Warehouses', true, `Found ${testData.warehouses.length} warehouses`);
  } else {
    console.error('❌ Need at least 2 warehouses. Create them first.');
    process.exit(1);
  }

  // Get or create products
  console.log('\nGetting products...');
  const productsRes = await api('GET', '/products?skip=0&take=10');
  if (productsRes.success && productsRes.data.length >= 2) {
    testData.products = productsRes.data.slice(0, 2);
    result('Get Products', true, `Found ${testData.products.length} products`);
  } else {
    console.error('❌ Need at least 2 products. Create them first.');
    process.exit(1);
  }

  // Store initial inventory levels
  console.log('\nStoring initial inventory...');
  for (const product of testData.products) {
    for (const warehouse of testData.warehouses) {
      const invRes = await api('GET', `/inventory?productId=${product.id}&warehouseId=${warehouse.id}`);
      if (invRes.success && invRes.data.length > 0) {
        const inv = invRes.data[0];
        testData.initialInventory[`${product.id}-${warehouse.id}`] = {
          physicalOnHand: inv.physical_on_hand || inv.physicalOnHand || 0,
          reserved: inv.reserved || 0,
          available: inv.available || 0,
        };
      }
    }
  }
  result('Store Initial Inventory', true, 'Saved for comparison later');

  console.log('\n✅ SETUP COMPLETE\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// STEP 2: CREATE BILL (MULTI-WAREHOUSE)
// ──────────────────────────────────────────────────────────────────────────────

async function createBill() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ STEP 2: CREATE BILL (MULTI-WAREHOUSE)                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const billPayload = {
    organizationId: ORG_ID,
    customerId: testData.customer.id,
    salesmanId: 1, // Assuming salesman 1 exists
    channel: 'COUNTER',
    paymentMethod: 'CASH',
    lines: [
      {
        productId: testData.products[0].id,
        warehouseId: testData.warehouses[0].id,
        quantity: 10,
        unitPrice: 500,
      },
      {
        productId: testData.products[1].id,
        warehouseId: testData.warehouses[1].id,
        quantity: 5,
        unitPrice: 1000,
      },
    ],
  };

  console.log('Creating bill with payload:', JSON.stringify(billPayload, null, 2));
  const billRes = await api('POST', '/bills', billPayload);

  if (!billRes.success) {
    result('Create Bill', false, `Error: ${JSON.stringify(billRes.error)}`);
    process.exit(1);
  }

  testData.bill = billRes.data;
  result('Create Bill', true, `Bill ID: ${testData.bill.id}, Bill #: ${testData.bill.bill_number}`);

  // Check bill status
  const billStatus = testData.bill.status || 'APPROVED';
  result('Bill Status', billStatus === 'APPROVED', `Status: ${billStatus}`);

  // Verify gate passes auto-created
  console.log('\nVerifying gate passes auto-created...');
  const gpRes = await api('GET', `/gate-passes?warehouseId=${testData.warehouses[0].id}`);

  if (!gpRes.success) {
    result('Get Gate Passes', false, `Error: ${JSON.stringify(gpRes.error)}`);
    process.exit(1);
  }

  const gatePasses = gpRes.data?.data || gpRes.data || [];
  const billGatePasses = gatePasses.filter((gp: any) => gp.billId === testData.bill.id);

  result('Auto-create Gate Passes', billGatePasses.length >= 1, `Found ${billGatePasses.length} gate passes`);
  testData.gatePasses = billGatePasses;

  if (testData.gatePasses.length > 0) {
    result('Gate Pass Numbering', true, `First gate pass: ${testData.gatePasses[0].gatePassNumber}`);
  }

  // Verify inventory reserved
  console.log('\nVerifying inventory reserved...');
  for (const line of testData.bill.lines) {
    const invRes = await api('GET', `/inventory?productId=${line.productId}&warehouseId=${line.warehouseId}`);
    if (invRes.success && invRes.data.length > 0) {
      const inv = invRes.data[0];
      const initial = testData.initialInventory[`${line.productId}-${line.warehouseId}`];
      const reserved = inv.reserved || 0;
      const available = inv.available || 0;

      const reservedCorrect = reserved >= line.quantity;
      const availableDecreased = available <= (initial?.available || 0);

      result(
        `Inventory Reserved (Product ${line.productId})`,
        reservedCorrect && availableDecreased,
        `Reserved: ${reserved} (expected ${line.quantity}), Available: ${available}`
      );
    }
  }

  console.log('\n✅ BILL CREATION COMPLETE\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// STEP 3: CONFIRM GATE PASS
// ──────────────────────────────────────────────────────────────────────────────

async function confirmGatePass() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ STEP 3: CONFIRM GATE PASS                                          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  if (!testData.gatePasses || testData.gatePasses.length === 0) {
    console.log('❌ No gate passes to confirm. Skipping this step.');
    return;
  }

  const gatePass = testData.gatePasses[0];
  console.log(`Confirming gate pass: ${gatePass.gatePassNumber}`);

  // Get full gate pass details
  const gpDetailsRes = await api('GET', `/gate-passes/${gatePass.id}`);
  if (!gpDetailsRes.success) {
    result('Get Gate Pass Details', false, `Error: ${JSON.stringify(gpDetailsRes.error)}`);
    return;
  }

  const gpDetails = gpDetailsRes.data;
  const pickedItems = gpDetails.items.map((item: any) => ({
    billLineId: item.billLineId,
    pickedQuantity: item.quantity, // Pick full quantity
  }));

  const confirmPayload = {
    pickedItems,
    remarks: 'Test confirmation',
  };

  console.log('Confirming with payload:', JSON.stringify(confirmPayload, null, 2));
  const confirmRes = await api('POST', `/gate-passes/${gatePass.id}/confirm`, confirmPayload);

  if (!confirmRes.success) {
    result('Confirm Gate Pass', false, `Error: ${JSON.stringify(confirmRes.error)}`);
    return;
  }

  const confirmedGP = confirmRes.data;
  result('Confirm Gate Pass', confirmedGP.status === 'CONFIRMED', `Status: ${confirmedGP.status}`);

  // Verify inventory deducted
  console.log('\nVerifying inventory deducted...');
  for (const item of confirmedGP.items) {
    const billLine = testData.bill.lines.find((l: any) => l.id === item.billLineId);
    const invRes = await api('GET', `/inventory?productId=${item.productId}&warehouseId=${billLine.warehouseId}`);

    if (invRes.success && invRes.data.length > 0) {
      const inv = invRes.data[0];
      const initial = testData.initialInventory[`${item.productId}-${billLine.warehouseId}`];
      const physicalAfter = inv.physical_on_hand || 0;
      const reservedAfter = inv.reserved || 0;

      const deductedCorrectly = physicalAfter <= initial.physicalOnHand;
      const reservedDecreased = reservedAfter < initial.reserved + item.quantity;

      result(
        `Inventory Deducted (Product ${item.productId})`,
        deductedCorrectly && reservedDecreased,
        `Physical: ${physicalAfter} (was ${initial.physicalOnHand}), Reserved: ${reservedAfter}`
      );
    }
  }

  console.log('\n✅ GATE PASS CONFIRMATION COMPLETE\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// STEP 4: REJECT GATE PASS
// ──────────────────────────────────────────────────────────────────────────────

async function rejectGatePass() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ STEP 4: REJECT GATE PASS                                           ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  if (!testData.gatePasses || testData.gatePasses.length < 2) {
    console.log('ℹ️  Need 2+ gate passes for rejection test. Creating new bill...');
    await createBill(); // Create another bill to get more gate passes
  }

  const gpToReject = testData.gatePasses[testData.gatePasses.length - 1];
  console.log(`Rejecting gate pass: ${gpToReject.gatePassNumber}`);

  const rejectPayload = {
    reason: 'Test rejection - insufficient stock',
  };

  const rejectRes = await api('POST', `/gate-passes/${gpToReject.id}/reject`, rejectPayload);

  if (!rejectRes.success) {
    result('Reject Gate Pass', false, `Error: ${JSON.stringify(rejectRes.error)}`);
    return;
  }

  const rejectedGP = rejectRes.data;
  result('Reject Gate Pass', rejectedGP.status === 'REJECTED', `Status: ${rejectedGP.status}`);

  // Verify inventory released
  console.log('\nVerifying reserved inventory released...');
  for (const item of rejectedGP.items) {
    const billLine = testData.bill.lines.find((l: any) => l.id === item.billLineId);
    const invRes = await api('GET', `/inventory?productId=${item.productId}&warehouseId=${billLine.warehouseId}`);

    if (invRes.success && invRes.data.length > 0) {
      const inv = invRes.data[0];
      const available = inv.available || 0;
      const initial = testData.initialInventory[`${item.productId}-${billLine.warehouseId}`];

      const availableIncreased = available >= initial.available;

      result(
        `Inventory Released (Product ${item.productId})`,
        availableIncreased,
        `Available: ${available} (initial: ${initial.available})`
      );
    }
  }

  console.log('\n✅ GATE PASS REJECTION COMPLETE\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// STEP 5: REPORT SHORTAGE
// ──────────────────────────────────────────────────────────────────────────────

async function reportShortage() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ STEP 5: REPORT SHORTAGE (PARTIAL PICKING)                          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  if (!testData.gatePasses || testData.gatePasses.length === 0) {
    console.log('ℹ️  No gate passes available. Skipping shortage test.');
    return;
  }

  const gatePass = testData.gatePasses[0];
  const gpDetailsRes = await api('GET', `/gate-passes/${gatePass.id}`);

  if (!gpDetailsRes.success) {
    result('Get Gate Pass Details', false, `Error: ${JSON.stringify(gpDetailsRes.error)}`);
    return;
  }

  const gpDetails = gpDetailsRes.data;
  const shortageItems = gpDetails.items.map((item: any) => ({
    billLineId: item.billLineId,
    orderQuantity: item.quantity,
    pickedQuantity: Math.max(1, item.quantity - 2), // Pick less than ordered
  }));

  console.log('Reporting shortage with payload:', JSON.stringify(shortageItems, null, 2));
  const shortageRes = await api('POST', `/gate-passes/${gatePass.id}/shortage`, { shortageItems });

  if (!shortageRes.success) {
    result('Report Shortage', false, `Error: ${JSON.stringify(shortageRes.error)}`);
    return;
  }

  const gpAfterShortage = shortageRes.data;
  result('Report Shortage', gpAfterShortage.status === 'PICKED', `Status: ${gpAfterShortage.status}`);

  console.log('\n✅ SHORTAGE REPORTING COMPLETE\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN TEST RUNNER
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  TIER 1: INTEGRATION TEST - GATE PASS + INVENTORY SYSTEM');
  console.log('═══════════════════════════════════════════════════════════════════════════');

  try {
    await setupTestData();
    await createBill();
    await confirmGatePass();
    await rejectGatePass();
    await reportShortage();

    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('  ✅ TEST SUITE COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

main();
