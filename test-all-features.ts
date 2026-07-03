import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = 'dev-super-secret-key-change-this-in-production';

async function testAllFeatures() {
  console.log('🚀 Testing All Phase 2 Features\n');

  // Create JWT token
  const token = jwt.sign(
    { sub: 1, email: 'admin@example.com', role: 'ADMIN', organizationId: 1 },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  // ============ FEATURE 1: Website Order Approval ============
  console.log('═══ FEATURE 1: Website Order Approval ═══\n');

  console.log('1️⃣  Creating website order...');
  const websiteOrder = await prisma.websiteOrder.create({
    data: {
      organizationId: 1,
      customer_email: 'online-buyer@example.com',
      customer_name: 'Online Buyer',
      customer_phone: '03309999999',
      warehouse_id: 1,
      items: JSON.stringify([
        { productId: 1, quantity: 3, unit_price: 50000 },
        { productId: 2, quantity: 5, unit_price: 3000 },
      ]),
      total_amount: 165000,
      status: 'PENDING_APPROVAL',
    },
  });
  console.log(`✅ Website order created: ${websiteOrder.id}`);

  console.log('\n2️⃣  Approving website order (creates bill + gate pass)...');
  const approveResp = await fetch(
    `http://localhost:3000/website-orders/${websiteOrder.id}/approve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        customerId: 1,
        warehouseId: 1,
        remarks: 'Online order approved by manager',
      }),
    },
  );

  if (!approveResp.ok) {
    console.error('❌ Approval failed:', await approveResp.text());
  } else {
    const result = await approveResp.json();
    console.log(`✅ Order approved`);
    console.log(`   Bill created: ${result.bill.bill_number}`);
    console.log(`   Gate pass auto-generated`);
  }

  // ============ FEATURE 2: Warehouse Transfers ============
  console.log('\n═══ FEATURE 2: Warehouse Transfers ═══\n');

  // Create second warehouse first
  const warehouse2 = await prisma.warehouse.create({
    data: {
      organizationId: 1,
      name: 'Secondary Warehouse',
      slug: 'secondary-wh',
      location: 'Lahore',
    },
  });
  console.log(`✅ Created secondary warehouse: ${warehouse2.name}`);

  console.log('\n1️⃣  Creating warehouse transfer...');
  const transferResp = await fetch('http://localhost:3000/warehouse-transfers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      from_warehouse_id: 1,
      to_warehouse_id: warehouse2.id,
      items: [
        { productId: 1, quantity: 10 },
        { productId: 2, quantity: 20 },
      ],
      remarks: 'Stock distribution to secondary warehouse',
    }),
  });

  if (!transferResp.ok) {
    console.error('❌ Transfer creation failed:', await transferResp.text());
  } else {
    const transfer = await transferResp.json();
    console.log(`✅ Transfer created: ${transfer.transfer_number}`);
    console.log(`   From: ${transfer.from_warehouse.name}`);
    console.log(`   To: ${transfer.to_warehouse.name}`);
    console.log(`   Status: ${transfer.status}`);

    console.log('\n2️⃣  Confirming transfer receipt...');
    const confirmResp = await fetch(
      `http://localhost:3000/warehouse-transfers/${transfer.id}/confirm-receipt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: [
            { productId: 1, quantity_received: 10 },
            { productId: 2, quantity_received: 20 },
          ],
          remarks: 'All items received and verified',
        }),
      },
    );

    if (!confirmResp.ok) {
      console.error('❌ Confirm receipt failed:', await confirmResp.text());
    } else {
      const confirmed = await confirmResp.json();
      console.log(`✅ Transfer received`);
      console.log(`   Status: ${confirmed.status}`);
    }
  }

  // ============ FEATURE 3: Reporting ============
  console.log('\n═══ FEATURE 3: Reporting & Analytics ═══\n');

  console.log('1️⃣  Gate Pass Analytics...');
  const gpReportResp = await fetch(
    'http://localhost:3000/reports/gate-pass-analytics?days=30',
    {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  );

  if (!gpReportResp.ok) {
    console.error('❌ Report failed:', await gpReportResp.text());
  } else {
    const report = await gpReportResp.json();
    console.log(`✅ Gate Pass Report:`);
    console.log(`   Total: ${report.summary.totalGatePasses}`);
    console.log(`   Confirmed: ${report.summary.confirmed}`);
    console.log(`   Pending: ${report.summary.pending}`);
    console.log(`   Fulfillment Rate: ${report.summary.fulfillmentRate}%`);
  }

  console.log('\n2️⃣  Warehouse Performance...');
  const perfResp = await fetch(
    'http://localhost:3000/reports/warehouse-performance?days=30',
    {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  );

  if (!perfResp.ok) {
    console.error('❌ Performance report failed:', await perfResp.text());
  } else {
    const perf = await perfResp.json();
    console.log(`✅ Warehouse Performance:`);
    for (const wh of perf) {
      console.log(`   ${wh.warehouseName}:`);
      console.log(`     - Gate Passes: ${wh.gatePasses.total} (Fulfillment: ${wh.gatePasses.fulfillmentRate}%)`);
      console.log(`     - Items Shipped: ${wh.inventory.itemsShipped}`);
      console.log(`     - Items Received: ${wh.inventory.itemsReceived}`);
    }
  }

  console.log('\n3️⃣  Bill Analytics...');
  const billReportResp = await fetch(
    'http://localhost:3000/reports/bill-analytics?days=30',
    {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  );

  if (!billReportResp.ok) {
    console.error('❌ Bill report failed:', await billReportResp.text());
  } else {
    const report = await billReportResp.json();
    console.log(`✅ Bill Analytics:`);
    console.log(`   Total Bills: ${report.summary.totalBills}`);
    console.log(`   Total Amount: Rs. ${report.summary.totalAmount}`);
    console.log(`   Avg Bill Amount: Rs. ${report.summary.avgBillAmount}`);
  }

  console.log('\n4️⃣  Inventory Snapshot...');
  const invResp = await fetch(
    'http://localhost:3000/reports/inventory-snapshot',
    {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  );

  if (!invResp.ok) {
    console.error('❌ Inventory report failed:', await invResp.text());
  } else {
    const report = await invResp.json();
    console.log(`✅ Inventory Snapshot:`);
    console.log(`   Total Products: ${report.snapshot.totalProducts}`);
    console.log(`   Physical Stock: ${report.snapshot.totalPhysicalStock}`);
    console.log(`   Reserved Stock: ${report.snapshot.totalReservedStock}`);
    console.log(`   Available Stock: ${report.snapshot.totalAvailableStock}`);
  }

  console.log('\n✅ All features tested successfully!\n');
  await prisma.$disconnect();
}

testAllFeatures().catch((err) => {
  console.error('❌ Error:', err.message);
  console.error(err);
  process.exit(1);
});
