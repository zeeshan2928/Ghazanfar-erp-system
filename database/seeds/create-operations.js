/**
 * Create Operational Data: Purchase Orders & Sales Bills
 * Generates realistic procurement and sales transactions
 *
 * Usage: node database/seeds/create-operations.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORG_ID = 1;

async function createOperations() {
  try {
    console.log('\n🏭 CREATING OPERATIONAL DATA\n');

    // Get vendors, customers, and products
    const vendors = await prisma.vendor.findMany({
      where: { organizationId: ORG_ID }
    });

    const customers = await prisma.customer.findMany({
      where: { organizationId: ORG_ID }
    });

    const products = await prisma.product.findMany({
      where: { organizationId: ORG_ID },
      take: 500
    });

    if (vendors.length === 0 || customers.length === 0 || products.length === 0) {
      console.error('❌ Missing required data! Run phase5-simple-setup.js first');
      return;
    }

    console.log(`📊 Ready to create operations:`);
    console.log(`   Vendors: ${vendors.length}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Products: ${products.length}\n`);

    // ===== CREATE PURCHASE ORDERS =====
    console.log('1️⃣ Creating 30 Purchase Orders...\n');
    let poCount = 0;
    const poStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'RECEIVED'];

    for (let i = 0; i < 30; i++) {
      const vendor = vendors[i % vendors.length];
      const status = poStatuses[i % poStatuses.length];
      const itemCount = Math.floor(Math.random() * 4) + 2;

      const items = [];
      let totalAmount = 0;

      // Create line items
      for (let j = 0; j < itemCount; j++) {
        const product = products[(i * 10 + j) % products.length];
        const quantity = Math.floor(Math.random() * 150) + 10;
        const unitPrice = Math.floor(Math.random() * 3000) + 500;
        const lineTotal = quantity * unitPrice;

        items.push({
          productId: product.id,
          quantityOrdered: quantity,
          unitPrice,
          lineTotal,
          organizationId: ORG_ID
        });

        totalAmount += lineTotal;
      }

      try {
        await prisma.purchaseOrder.create({
          data: {
            organizationId: ORG_ID,
            vendorId: vendor.id,
            poNumber: `PO-${String(i + 1).padStart(4, '0')}-2026`,
            status,
            totalAmount: Math.floor(totalAmount),
            poDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            expectedDeliveryDate: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000),
            items: {
              create: items
            }
          }
        });

        poCount++;
        if (poCount % 10 === 0) {
          process.stdout.write(`\r   Created ${poCount}/30 POs...`);
        }
      } catch (e) {
        console.log(`\n   ⚠️ Error creating PO ${i}: ${e.message.substring(0, 50)}`);
      }
    }

    console.log(`\r   ✅ Created ${poCount} Purchase Orders\n`);

    // ===== CREATE SALES BILLS =====
    console.log('2️⃣ Creating 25 Sales Bills...\n');
    let billCount = 0;
    const billStatuses = ['DRAFT', 'FINALIZED', 'PAID', 'PENDING'];

    for (let i = 0; i < 25; i++) {
      const customer = customers[i % customers.length];
      const status = billStatuses[i % billStatuses.length];
      const itemCount = Math.floor(Math.random() * 5) + 2;

      const items = [];
      let totalAmount = 0;

      // Create bill line items
      for (let j = 0; j < itemCount; j++) {
        const product = products[(i * 15 + j) % products.length];
        const quantity = Math.floor(Math.random() * 80) + 5;
        const unitPrice = Math.floor(Math.random() * 4000) + 600;
        const lineAmount = quantity * unitPrice;

        items.push({
          productId: product.id,
          quantity,
          unitPrice,
          lineAmount,
          organizationId: ORG_ID
        });

        totalAmount += lineAmount;
      }

      try {
        await prisma.bill.create({
          data: {
            organizationId: ORG_ID,
            customerId: customer.id,
            billNumber: `INV-${String(i + 1).padStart(4, '0')}-2026`,
            status,
            totalAmount: Math.floor(totalAmount),
            billDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            dueDate: new Date(Date.now() + Math.random() * 45 * 24 * 60 * 60 * 1000),
            items: {
              create: items
            }
          }
        });

        billCount++;
        if (billCount % 8 === 0) {
          process.stdout.write(`\r   Created ${billCount}/25 Bills...`);
        }
      } catch (e) {
        console.log(`\n   ⚠️ Error creating Bill ${i}: ${e.message.substring(0, 50)}`);
      }
    }

    console.log(`\r   ✅ Created ${billCount} Sales Bills\n`);

    // ===== SUMMARY REPORT =====
    console.log('='.repeat(70));
    console.log('📊 OPERATIONAL DATA SUMMARY');
    console.log('='.repeat(70) + '\n');

    const poSummary = await Promise.all([
      prisma.purchaseOrder.count({ where: { organizationId: ORG_ID } }),
      prisma.purchaseOrder.count({ where: { organizationId: ORG_ID, status: 'DRAFT' } }),
      prisma.purchaseOrder.count({ where: { organizationId: ORG_ID, status: 'PENDING' } }),
      prisma.purchaseOrder.count({ where: { organizationId: ORG_ID, status: 'APPROVED' } }),
      prisma.purchaseOrder.count({ where: { organizationId: ORG_ID, status: 'RECEIVED' } })
    ]);

    const billSummary = await Promise.all([
      prisma.bill.count({ where: { organizationId: ORG_ID } }),
      prisma.bill.count({ where: { organizationId: ORG_ID, status: 'DRAFT' } }),
      prisma.bill.count({ where: { organizationId: ORG_ID, status: 'FINALIZED' } }),
      prisma.bill.count({ where: { organizationId: ORG_ID, status: 'PAID' } })
    ]);

    const [totalPos, draftPos, pendingPos, approvedPos, receivedPos] = poSummary;
    const [totalBills, draftBills, finalizedBills, paidBills] = billSummary;

    console.log('📦 PURCHASE ORDERS:');
    console.log(`   Total: ${totalPos}`);
    console.log(`   DRAFT: ${draftPos}`);
    console.log(`   PENDING: ${pendingPos}`);
    console.log(`   APPROVED: ${approvedPos}`);
    console.log(`   RECEIVED: ${receivedPos}`);

    console.log('\n💳 SALES BILLS:');
    console.log(`   Total: ${totalBills}`);
    console.log(`   DRAFT: ${draftBills}`);
    console.log(`   FINALIZED: ${finalizedBills}`);
    console.log(`   PAID: ${paidBills}`);

    // Get some stats
    const poValue = await prisma.$queryRaw`
      SELECT SUM("totalAmount") as total FROM "PurchaseOrder"
      WHERE "organizationId" = ${ORG_ID}
    `;

    const billValue = await prisma.$queryRaw`
      SELECT SUM("totalAmount") as total FROM "Bill"
      WHERE "organizationId" = ${ORG_ID}
    `;

    const poTotal = poValue[0]?.total || 0;
    const billTotal = billValue[0]?.total || 0;

    console.log('\n💰 FINANCIAL SUMMARY:');
    console.log(`   PO Value (Procurement): PKR ${Number(poTotal).toLocaleString()}`);
    console.log(`   Bill Value (Sales): PKR ${Number(billTotal).toLocaleString()}`);
    console.log(`   Gross Profit Potential: PKR ${(Number(billTotal) - Number(poTotal)).toLocaleString()}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ OPERATIONS CREATED SUCCESSFULLY!\n');

    console.log('🎯 WHAT YOU CAN DO NOW:\n');
    console.log('Purchase Orders:');
    console.log('   ✓ View all 30+ POs by status');
    console.log('   ✓ Approve PENDING POs');
    console.log('   ✓ Receive items from approved POs');
    console.log('   ✓ Track vendor performance');
    console.log('\nSales Bills:');
    console.log('   ✓ View all 25+ bills by status');
    console.log('   ✓ Finalize draft bills');
    console.log('   ✓ Mark bills as paid');
    console.log('   ✓ Track customer credit');
    console.log('\nAnalytics:');
    console.log('   ✓ Purchase vs Sales comparison');
    console.log('   ✓ Vendor performance metrics');
    console.log('   ✓ Customer sales history');
    console.log('   ✓ Profit margin analysis');

    console.log('\n' + '='.repeat(70));
    console.log('🚀 YOUR ERP IS NOW FULLY OPERATIONAL!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createOperations();
