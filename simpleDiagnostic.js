const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnose() {
  try {
    console.log('🔍 SIMPLE DIAGNOSTIC\n');

    // 1. Check database counts
    console.log('1️⃣ DATABASE:');
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const orgCount = await prisma.organization.count();

    console.log(`   Users: ${userCount}`);
    console.log(`   Products: ${productCount}`);
    console.log(`   Organizations: ${orgCount}`);

    // 2. Get user details
    console.log('\n2️⃣ USER:');
    const user = await prisma.user.findFirst({
      include: { organization: true }
    });

    if (user) {
      console.log(`   Email: ${user.email}`);
      console.log(`   OrgId: ${user.organizationId}`);
      console.log(`   Org Name: ${user.organization.name}`);
    } else {
      console.log('   ❌ NO USER FOUND');
    }

    // 3. Check products by org
    console.log('\n3️⃣ PRODUCTS BY ORG:');
    const prodByOrg = await prisma.product.groupBy({
      by: ['organizationId'],
      _count: true
    });
    prodByOrg.forEach(p => {
      console.log(`   Org ${p.organizationId}: ${p._count} products`);
    });

    // 4. Sample product
    console.log('\n4️⃣ SAMPLE PRODUCT:');
    const sample = await prisma.product.findFirst({
      where: { organizationId: 1 }
    });

    if (sample) {
      console.log(`   ID: ${sample.id}`);
      console.log(`   Name: ${sample.name}`);
      console.log(`   Code: ${sample.code}`);
      console.log(`   OrgId: ${sample.organizationId}`);
    } else {
      console.log('   ❌ NO PRODUCTS IN ORG 1');
    }

    // 5. Test raw search query
    console.log('\n5️⃣ RAW SEARCH TEST:');
    const rawResult = await prisma.product.findMany({
      where: {
        organizationId: 1
      },
      take: 3,
      skip: 0
    });

    console.log(`   Found ${rawResult.length} products`);
    if (rawResult.length > 0) {
      console.log(`   First product:`, JSON.stringify(rawResult[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
