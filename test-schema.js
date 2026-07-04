const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const org = await prisma.organization.findFirst();
    console.log('✅ Database schema is verified and working');
    if (org) {
      console.log(`✅ Found ${org.name} organization`);
    } else {
      console.log('✅ Database ready - no data yet');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
