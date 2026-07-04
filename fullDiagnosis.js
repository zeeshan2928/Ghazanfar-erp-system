const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnose() {
  try {
    console.log('🔍 FULL DATABASE DIAGNOSIS\n');

    // 1. Check organizations
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log('1. Organizations:');
    console.log('   Count:', orgs.length);
    orgs.forEach(o => console.log(`   - ID ${o.id}: ${o.name} (${o.slug})`));

    // 2. Check vendors
    const vendors = await prisma.vendor.findMany({
      select: { id: true, name: true, organizationId: true }
    });
    console.log('\n2. Vendors:');
    console.log('   Count:', vendors.length);
    console.log('   By org:');
    const vendorsByOrg = {};
    vendors.forEach(v => {
      vendorsByOrg[v.organizationId] = (vendorsByOrg[v.organizationId] || 0) + 1;
    });
    Object.entries(vendorsByOrg).forEach(([orgId, count]) => {
      console.log(`     - Org ${orgId}: ${count} vendors`);
    });
    if (vendors.length > 0) {
      console.log('   First vendor:', vendors[0]);
    }

    // 3. Check products
    const products = await prisma.product.count();
    console.log('\n3. Products:');
    console.log('   Total count:', products);

    const productsByOrg = await prisma.product.groupBy({
      by: ['organizationId'],
      _count: true
    });
    console.log('   By org:');
    productsByOrg.forEach(po => {
      console.log(`     - Org ${po.organizationId}: ${po._count} products`);
    });

    // 4. Sample product
    const sampleProduct = await prisma.product.findFirst();
    console.log('\n4. Sample Product:');
    console.log(JSON.stringify(sampleProduct, null, 2));

    // 5. Check database connection
    console.log('\n5. Database Connection:');
    const dbTest = await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('   ✅ Connected:', dbTest[0]?.current_time);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
