/**
 * Phase 4 test-data seeder
 * Creates: 1 test warehouse + inventory for the test product.
 *
 * Usage:
 *   node scripts/seed-phase4-test-data.js [productId] [qty]
 *   (defaults: productId=15, qty=100)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PRODUCT_ID = parseInt(process.argv[2] || '15', 10);
const QTY = parseInt(process.argv[3] || '100', 10);

async function main() {
  // Derive organizationId from the test product so we never guess it
  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
  });
  if (!product) {
    throw new Error(
      `Product ${PRODUCT_ID} not found. Create the product first or pass an existing productId.`,
    );
  }
  const organizationId = product.organizationId;
  console.log(`Using product ${PRODUCT_ID} (org ${organizationId})`);

  // 1. Warehouse (idempotent via organizationId+slug unique key)
  const warehouse = await prisma.warehouse.upsert({
    where: {
      organizationId_slug: { organizationId, slug: 'main-warehouse' },
    },
    update: { isActive: true },
    create: {
      organizationId,
      name: 'Main Warehouse',
      slug: 'main-warehouse',
      location: 'Karachi - Test Location',
    },
  });
  console.log(`Warehouse ready: id=${warehouse.id} "${warehouse.name}"`);

  // 2. Inventory (idempotent via organizationId+productId+warehouseId unique key)
  const inventory = await prisma.inventory.upsert({
    where: {
      organizationId_productId_warehouseId: {
        organizationId,
        productId: PRODUCT_ID,
        warehouseId: warehouse.id,
      },
    },
    update: {
      physical_on_hand: QTY,
      available: QTY,
      reserved: 0,
    },
    create: {
      organizationId,
      productId: PRODUCT_ID,
      warehouseId: warehouse.id,
      physical_on_hand: QTY,
      available: QTY,
      reserved: 0,
      opening_balance: QTY,
    },
  });
  console.log(
    `Inventory ready: id=${inventory.id} on_hand=${inventory.physical_on_hand} available=${inventory.available} reserved=${inventory.reserved}`,
  );

  console.log('\nPhase 4 test data seeded successfully.');
  console.log(`  warehouseId=${warehouse.id}  productId=${PRODUCT_ID}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
