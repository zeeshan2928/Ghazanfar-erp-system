import { PrismaClient, CustomerType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const orgId = 1;

  const warehouse = await prisma.warehouse.create({
    data: {
      organizationId: orgId,
      name: 'Main Warehouse',
      slug: 'main-wh',
      location: 'Karachi',
    },
  });

  const product1 = await prisma.product.create({
    data: {
      organizationId: orgId,
      code: 'PHONE-001',
      name: 'Phone XYZ',
      description: 'Latest model smartphone',
      cost_price: 40000,
      isVisibleOnCounter: true,
      isVisibleOnWebsite: true,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      organizationId: orgId,
      code: 'CHARGER-001',
      name: 'USB-C Charger',
      description: 'Fast charging',
      cost_price: 2000,
      isVisibleOnCounter: true,
      isVisibleOnWebsite: true,
    },
  });

  const customer = await prisma.customer.create({
    data: {
      organizationId: orgId,
      name: 'Ali Traders',
      phone: '03001234567',
      email: 'ali@traders.com',
      address: 'Lahore, Pakistan',
      customerType: CustomerType.RETAIL,
      creditLimit: 100000,
    },
  });

  await prisma.inventory.create({
    data: {
      organizationId: orgId,
      productId: product1.id,
      warehouseId: warehouse.id,
      physical_on_hand: 50,
      reserved: 0,
      available: 50,
      opening_balance: 50,
    },
  });

  await prisma.inventory.create({
    data: {
      organizationId: orgId,
      productId: product2.id,
      warehouseId: warehouse.id,
      physical_on_hand: 200,
      reserved: 0,
      available: 200,
      opening_balance: 200,
    },
  });

  await prisma.purchaseHistory.create({
    data: {
      organizationId: orgId,
      productId: product1.id,
      vendor_name: 'Distributor Inc',
      po_number: 'PO-2025-001',
      po_date: new Date('2025-02-15'),
      quantity_purchased: 100,
      cost_price: 40000,
    },
  });

  await prisma.purchaseHistory.create({
    data: {
      organizationId: orgId,
      productId: product1.id,
      vendor_name: 'Distributor Inc',
      po_number: 'PO-2025-010',
      po_date: new Date('2025-02-28'),
      quantity_purchased: 50,
      cost_price: 39000,
    },
  });

  console.log('✓ Seed completed');
  console.log({
    warehouse: warehouse.id,
    product1: product1.id,
    product2: product2.id,
    customer: customer.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
