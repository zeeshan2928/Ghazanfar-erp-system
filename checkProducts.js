const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function check() {
  try {
    const total = await prisma.product.count();
    const org1 = await prisma.product.count({
      where: { organizationId: 1 }
    });

    const sample = await prisma.product.findFirst({
      where: { organizationId: 1 },
      select: {
        id: true,
        name: true,
        code: true,
        organizationId: true,
        primaryVendorId: true
      }
    });

    console.log('Database Check:');
    console.log('  Total products:', total);
    console.log('  Org ID 1:', org1);
    console.log('  Sample product:', JSON.stringify(sample, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
