const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany();
  console.log('Organizations:', orgs);
  
  const pos = await prisma.purchaseOrder.findMany();
  console.log('\nPurchase Orders:', pos.length, 'total');
  pos.forEach(po => console.log(`- ${po.po_number} (org: ${po.organizationId})`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
