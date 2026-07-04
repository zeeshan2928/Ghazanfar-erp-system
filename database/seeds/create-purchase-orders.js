/**
 * Create Realistic Purchase Orders
 * Generates 50 purchase orders with various statuses and line items
 *
 * Usage: node database/seeds/create-purchase-orders.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORG_ID = 1;

async function createPurchaseOrders() {
  try {
    console.log('\n📦 CREATING PURCHASE ORDERS\n');

    // Get vendors and products
    const vendors = await prisma.vendor.findMany({
      where: { organizationId: ORG_ID },
      take: 15
    });

    const products = await prisma.product.findMany({
      where: { organizationId: ORG_ID },
      take: 300
    });

    if (vendors.length === 0) {
      console.error('❌ No vendors found! Run phase5-simple-setup.js first');
      return;
    }

    if (products.length === 0) {
      console.error('❌ No products found!');
      return;
    }

    console.log(`📊 Found ${vendors.length} vendors and ${products.length} products\n`);

    const statuses = ['DRAFT', 'PENDING', 'APPROVED', 'RECEIVED', 'PARTIAL'];
    const pos = [];
    let createdCount = 0;

    // Create 50 purchase orders
    console.log('Creating 50 Purchase Orders...\n');

    for (let i = 0; i < 50; i++) {
      const vendor = vendors[i % vendors.length];
      const status = statuses[i % statuses.length];

      // Generate 3-6 line items per PO
      const itemCount = Math.floor(Math.random() * 4) + 3;
      const selectedProducts = products.slice(i * 10, (i + 1) * 10);

      const items = [];
      let totalAmount = 0;

      for (let j = 0; j < itemCount && j < selectedProducts.length; j++) {
        const product = selectedProducts[j];
        const quantity = Math.floor(Math.random() * 200) + 20;
        const unitPrice = Math.floor(Math.random() * 4000) + 800;
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

      // Create PO
      try {
        const po = await prisma.purchaseOrder.create({
          data: {
            organizationId: ORG_ID,
            vendorId: vendor.id,
            poNumber: `PO-${String(i + 1).padStart(4, '0')}-${Date.now()}`,
            status,
            totalAmount: Math.floor(totalAmount),
            expectedDeliveryDate: new Date(
              Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000 + 10 * 24 * 60 * 60 * 1000
            ),
            items: {
              create: items
            }
          }
        });

        pos.push(po);
        createdCount++;

        if (createdCount % 10 === 0) {
          process.stdout.write(`\r✓ Created ${createdCount} POs...`);
        }
      } catch (e) {
        console.error(`\n❌ Error creating PO ${i}:`, e.message);
      }
    }

    console.log(`\r✓ Created ${createdCount} POs       \n`);

    // Generate summary report
    console.log('\n' + '='.repeat(70));
    console.log('📊 PURCHASE ORDER SUMMARY');
    console.log('='.repeat(70) + '\n');

    // Count by status
    const statusCounts = {};
    const vendorCounts = {};
    let totalValue = 0;
    let totalItems = 0;

    for (const po of pos) {
      statusCounts[po.status] = (statusCounts[po.status] || 0) + 1;
      vendorCounts[po.vendorId] = (vendorCounts[po.vendorId] || 0) + 1;
      totalValue += po.totalAmount;
    }

    // Get item count
    const poItems = await prisma.purchaseOrderItem.count({
      where: { organizationId: ORG_ID }
    });

    console.log('📈 PO Status Breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = ((count / createdCount) * 100).toFixed(1);
      console.log(`   ${status}: ${count} (${percentage}%)`);
    });

    console.log(`\n💰 Financial Summary:`);
    console.log(`   Total PO Value: PKR ${totalValue.toLocaleString()}`);
    console.log(`   Total Line Items: ${poItems}`);
    console.log(`   Average PO Size: PKR ${Math.floor(totalValue / createdCount).toLocaleString()}`);

    console.log(`\n🏢 Top Vendors by PO Count:`);
    const topVendors = Object.entries(vendorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [vendorId, count] of topVendors) {
      const vendor = vendors.find(v => v.id === parseInt(vendorId));
      console.log(`   ${vendor.name}: ${count} POs`);
    }

    // Get sample PO details
    const samplePO = await prisma.purchaseOrder.findFirst({
      where: { organizationId: ORG_ID },
      include: {
        vendor: { select: { name: true } },
        items: { take: 3, select: { productId: true, quantity: true, unitPrice: true, lineAmount: true } }
      }
    });

    if (samplePO) {
      console.log(`\n📋 Sample PO Details:`);
      console.log(`   Number: ${samplePO.poNumber}`);
      console.log(`   Vendor: ${samplePO.vendor.name}`);
      console.log(`   Status: ${samplePO.status}`);
      console.log(`   Total: PKR ${samplePO.totalAmount.toLocaleString()}`);
      console.log(`   Items: ${samplePO.items.length}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ PURCHASE ORDERS READY FOR OPERATIONS!\n');

    // Quick reference for testing
    console.log('🎯 QUICK REFERENCE:\n');
    console.log('View POs in frontend:');
    console.log('   1. Open http://localhost:5173');
    console.log('   2. Login: admin@ghazanfar.com / admin@123');
    console.log('   3. Look for Purchase Orders section\n');

    console.log('Test workflows:');
    console.log('   • Approve a PENDING PO');
    console.log('   • Receive items from APPROVED PO');
    console.log('   • Check vendor performance');
    console.log('   • Generate PO reports\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createPurchaseOrders();
