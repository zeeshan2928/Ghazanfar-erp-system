import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function testGatePassWorkflow() {
  console.log('🔍 Checking existing data...\n');

  const users = await prisma.user.findMany({ take: 2 });
  console.log('Users:', users);

  const customers = await prisma.customer.findMany({ take: 1 });
  console.log('Customers:', customers);

  const warehouses = await prisma.warehouse.findMany({ take: 1 });
  console.log('Warehouses:', warehouses);

  const products = await prisma.product.findMany({ take: 2 });
  console.log('Products:', products);

  if (!users.length) {
    console.log('\n❌ No users found. Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        email: 'test@test.com',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        organizationId: 1,
        role: 'DATA_ENTRY',
      },
    });
    users.push(testUser);
  }

  if (users.length && customers.length && warehouses.length && products.length >= 2) {
    const token = jwt.sign(
      {
        userId: users[0].id,
        organizationId: 1,
        role: users[0].role,
      },
      'secret',
      { expiresIn: '1h' },
    );

    console.log(`\n✅ Test token: ${token.substring(0, 50)}...`);
    console.log(`\n📝 Ready to test with:`);
    console.log(`   User ID: ${users[0].id}`);
    console.log(`   Customer ID: ${customers[0].id}`);
    console.log(`   Warehouse ID: ${warehouses[0].id}`);
    console.log(`   Product IDs: ${products.map((p) => p.id).join(', ')}`);
  }

  await prisma.$disconnect();
}

testGatePassWorkflow().catch(console.error);
