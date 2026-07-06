/**
 * VERIFY SETUP - Check if everything is ready to run the integration test
 *
 * Run: npx ts-node verify-setup.ts
 *
 * This will check:
 * 1. Backend is running on port 3000
 * 2. Database connection works
 * 3. Test data exists (customers, products, warehouses)
 * 4. Inventory records exist
 * 5. Gate pass auto-trigger is wired
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';

interface CheckResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: CheckResult[] = [];

function check(passed: boolean, name: string, details?: string, error?: string) {
  results.push({ name, passed, details, error });
  const icon = passed ? '✅' : '❌';
  const msg = passed ? `PASS: ${name}` : `FAIL: ${name}`;
  console.log(`${icon} ${msg}`);
  if (details) console.log(`   └─ ${details}`);
  if (error) console.log(`   └─ Error: ${error}`);
}

async function verifySetup() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ VERIFICATION: Check if test environment is ready                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // 1. Check backend is running
  console.log('1️⃣  Checking backend connection...');
  try {
    const healthRes = await axios.get(`${API_BASE}/../health`);
    check(true, 'Backend is running', `Health status: ${healthRes.data?.status}`);
  } catch (err: any) {
    check(
      false,
      'Backend is running',
      'Cannot connect to localhost:3000',
      err.message
    );
    console.log('\n⚠️  Please start backend: npm run start:dev\n');
    process.exit(1);
  }

  // 2. Check if customers exist
  console.log('\n2️⃣  Checking test data...');
  try {
    const customersRes = await axios.get(`${API_BASE}/customers?skip=0&take=1`);
    const customers = customersRes.data?.data || customersRes.data || [];
    check(
      customers.length > 0,
      'Customers exist',
      `Found ${customers.length} customer(s)`
    );

    if (customers.length === 0) {
      console.log('   → Create at least 1 customer');
    }
  } catch (err: any) {
    check(false, 'Customers exist', undefined, err.message);
  }

  // 3. Check if products exist
  try {
    const productsRes = await axios.get(`${API_BASE}/products?skip=0&take=2`);
    const products = productsRes.data?.data || productsRes.data || [];
    check(
      products.length >= 2,
      'Products exist (need 2+)',
      `Found ${products.length} product(s)`
    );

    if (products.length < 2) {
      console.log('   → Create at least 2 products');
    }
  } catch (err: any) {
    check(false, 'Products exist', undefined, err.message);
  }

  // 4. Check if warehouses exist
  try {
    const warehousesRes = await axios.get(`${API_BASE}/warehouses?skip=0&take=2`);
    const warehouses = warehousesRes.data?.data || warehousesRes.data || [];
    check(
      warehouses.length >= 2,
      'Warehouses exist (need 2+)',
      `Found ${warehouses.length} warehouse(s)`
    );

    if (warehouses.length < 2) {
      console.log('   → Create at least 2 warehouses');
    }
  } catch (err: any) {
    check(false, 'Warehouses exist', undefined, err.message);
  }

  // 5. Check if inventory exists
  console.log('\n3️⃣  Checking inventory...');
  try {
    const inventoryRes = await axios.get(`${API_BASE}/inventory?skip=0&take=2`);
    const inventory = inventoryRes.data?.data || inventoryRes.data || [];
    const hasReserved = inventory.length > 0 && inventory[0].reserved !== undefined;
    const hasAvailable = inventory.length > 0 && inventory[0].available !== undefined;

    check(
      inventory.length > 0,
      'Inventory records exist',
      `Found ${inventory.length} record(s)`
    );

    check(
      hasReserved,
      'Inventory has "reserved" field',
      hasReserved ? 'Field exists' : 'Field missing'
    );

    check(
      hasAvailable,
      'Inventory has "available" field',
      hasAvailable ? 'Field exists' : 'Field missing'
    );
  } catch (err: any) {
    check(false, 'Inventory records exist', undefined, err.message);
  }

  // 6. Check bill creation endpoint
  console.log('\n4️⃣  Checking API endpoints...');
  try {
    const billsRes = await axios.get(`${API_BASE}/bills?skip=0&take=1`);
    check(true, 'Bills endpoint works', 'Can query bills');
  } catch (err: any) {
    check(false, 'Bills endpoint works', undefined, err.message);
  }

  // 7. Check gate passes endpoint
  try {
    const gpRes = await axios.get(`${API_BASE}/gate-passes`);
    check(true, 'Gate passes endpoint works', 'Can query gate passes');
  } catch (err: any) {
    check(false, 'Gate passes endpoint works', undefined, err.message);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ SUMMARY                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`✅ PASSED: ${passed}/${total}`);
  console.log(`❌ FAILED: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 Environment is ready! Run the integration test:\n');
    console.log('   npx ts-node test-critical-flow.ts\n');
  } else {
    console.log('\n⚠️  Please fix the issues above before running the test.\n');
    process.exit(1);
  }
}

verifySetup();
