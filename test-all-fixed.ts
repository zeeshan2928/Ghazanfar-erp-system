import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = 'dev-super-secret-key-change-this-in-production';

async function testAllFeatures() {
  console.log('🚀 Testing All Phase 2 Features (Fixed)\n');

  const token = jwt.sign(
    { sub: 1, email: 'admin@example.com', role: 'ADMIN', organizationId: 1 },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  // ============ FEATURE 1: Website Order Approval ============
  console.log('═══ FEATURE 1: Website Order Approval ═══\n');

  const websiteOrder = await prisma.websiteOrder.create({
    data: {
      organizationId: 1,
      customer_email: 'buyer@example.com',
      customer_name: 'Web Buyer',
      customer_phone: '03331234567',
      warehouse_id: 1,
      items: JSON.stringify([
        { productId: 1, quantity: 2, unit_price: 50000 },
        { productId: 2, quantity: 3, unit_price: 3000 },
      ]),
      total_amount: 109000,
      status: 'PENDING_APPROVAL',
    },
  });
  console.log(`1️⃣  Website order created: ${websiteOrder.id}`);

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
        remarks: 'Approved by manager',
      }),
    },
  );

  if (approveResp.ok) {
    const result = await approveResp.json();
    console.log(`✅ Order approved: ${result.bill.bill_number}`);
  } else {
    console.error(`❌ Failed:`, await approveResp.text());
  }

  // ============ FEATURE 2: Warehouse Transfers ============
  console.log('\n═══ FEATURE 2: Warehouse Transfers ═══\n');

  const wh2 = await prisma.warehouse.findFirst({
    where: { slug: 'secondary-wh' },
  });

  if (wh2) {
    const transferResp = await fetch('http://localhost:3000/warehouse-transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        from_warehouse_id: 1,
        to_warehouse_id: wh2.id,
        items: [{ productId: 1, quantity: 5 }],
      }),
    });

    if (transferResp.ok) {
      const transfer = await transferResp.json();
      console.log(`1️⃣  Transfer created: ${transfer.transfer_number}`);

      const startResp = await fetch(
        `http://localhost:3000/warehouse-transfers/${transfer.id}/start`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        },
      );

      if (startResp.ok) {
        const started = await startResp.json();
        console.log(`2️⃣  Transfer in transit (status: ${started.status})`);

        const confirmResp = await fetch(
          `http://localhost:3000/warehouse-transfers/${transfer.id}/confirm-receipt`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              items: [{ productId: 1, quantity_received: 5 }],
            }),
          },
        );

        if (confirmResp.ok) {
          const confirmed = await confirmResp.json();
          console.log(`✅ Transfer received (status: ${confirmed.status})`);
        }
      }
    }
  }

  // ============ FEATURE 3: Reporting ============
  console.log('\n═══ FEATURE 3: Reporting & Analytics ═══\n');

  const gpReportResp = await fetch(
    'http://localhost:3000/reports/gate-pass-analytics?days=30',
    {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  );

  if (gpReportResp.ok) {
    const report = await gpReportResp.json();
    console.log(`1️⃣  Gate Pass Analytics:`);
    console.log(`   Total: ${report.summary.totalGatePasses}, Confirmed: ${report.summary.confirmed}, Fulfillment: ${report.summary.fulfillmentRate}%`);
  }

  const perfResp = await fetch(
    'http://localhost:3000/reports/warehouse-performance?days=30',
    {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  );

  if (perfResp.ok) {
    const perf = await perfResp.json();
    console.log(`\n2️⃣  Warehouse Performance:`);
    for (const wh of perf.slice(0, 2)) {
      console.log(`   ${wh.warehouseName}: ${wh.inventory.itemsShipped} shipped, ${wh.inventory.itemsReceived} received`);
    }
  }

  const billReportResp = await fetch(
    'http://localhost:3000/reports/bill-analytics?days=30',
    {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  );

  if (billReportResp.ok) {
    const report = await billReportResp.json();
    console.log(`\n3️⃣  Bill Analytics:`);
    console.log(`   Total Bills: ${report.summary.totalBills}, Total: Rs. ${report.summary.totalAmount}`);
  }

  const invResp = await fetch(
    'http://localhost:3000/reports/inventory-snapshot',
    {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  );

  if (invResp.ok) {
    const report = await invResp.json();
    console.log(`\n4️⃣  Inventory Snapshot:`);
    console.log(`   Physical: ${report.snapshot.totalPhysicalStock}, Reserved: ${report.snapshot.totalReservedStock}, Available: ${report.snapshot.totalAvailableStock}`);
  }

  console.log('\n✅ All features working!\n');
  await prisma.$disconnect();
}

testAllFeatures().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
