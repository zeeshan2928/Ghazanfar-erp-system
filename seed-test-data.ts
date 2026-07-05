import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data...\n');

  try {
    // 1. Create Organization
    console.log('1️⃣  Creating Organization...');
    const org = await prisma.organization.create({
      data: {
        name: 'Ghazanfar Brothers',
      },
    });
    console.log('✅ Organization created:', org.id, org.name);

    // 2. Create Customer
    console.log('\n2️⃣  Creating Customer...');
    const customer = await prisma.customer.create({
      data: {
        organizationId: org.id,
        name: 'Ali Trades',
        phone: '03001234567',
        email: 'ali@trades.com',
        customerType: 'RETAIL',
        creditLimit: 500000,
      },
    });
    console.log('✅ Customer created:', customer.id, customer.name);

    // 3. Create Warehouse
    console.log('\n3️⃣  Creating Warehouse...');
    const warehouse = await prisma.warehouse.create({
      data: {
        organizationId: org.id,
        name: 'Main Warehouse',
        location: 'Karachi',
      },
    });
    console.log('✅ Warehouse created:', warehouse.id, warehouse.name);

    // 4. Create Product
    console.log('\n4️⃣  Creating Product...');
    const product = await prisma.product.create({
      data: {
        organizationId: org.id,
        code: 'P001',
        name: 'Mobile Phone',
        description: 'Test mobile phone',
        price: 50000,
        cost: 30000,
      },
    });
    console.log('✅ Product created:', product.id, product.name);

    // 5. Create Inventory
    console.log('\n5️⃣  Creating Inventory...');
    const inventory = await prisma.inventory.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 100,
      },
    });
    console.log('✅ Inventory created:', inventory.id, 'qty:', inventory.quantity);

    // 6. Create Bill
    console.log('\n6️⃣  Creating Bill...');
    const bill = await prisma.bill.create({
      data: {
        organizationId: org.id,
        billNumber: 'BILL-2026-001',
        customerId: customer.id,
        billDate: new Date(),
        channel: 'COUNTER',
        createdBy: 1,
        subtotal: 50000,
        discountAmount: 0,
        discountPercentage: 0,
        taxAmount: 5400,
        deliveryCharges: 0,
        totalAmount: 55400,
        paymentMethod: 'CASH',
        remarks: 'Test bill',
        status: 'APPROVED',
      },
    });
    console.log('✅ Bill created:', bill.id, 'No:', bill.billNumber);

    // 7. Create BillLine
    console.log('\n7️⃣  Creating BillLine...');
    const billLine = await prisma.billLine.create({
      data: {
        organizationId: org.id,
        billId: bill.id,
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 10,
        unitPrice: 5000,
        taxAmount: 5400,
      },
    });
    console.log('✅ BillLine created:', billLine.id, 'qty:', billLine.quantity);

    console.log('\n' + '='.repeat(50));
    console.log('✅ TEST DATA CREATED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\nData Summary:');
    console.log(`  Organization: ${org.name} (ID: ${org.id})`);
    console.log(`  Customer: ${customer.name} (ID: ${customer.id})`);
    console.log(`  Product: ${product.name} (ID: ${product.id})`);
    console.log(`  Warehouse: ${warehouse.name} (ID: ${warehouse.id})`);
    console.log(`  Bill: ${bill.billNumber} (ID: ${bill.id})`);
    console.log(`  Total Amount: Rs. ${bill.totalAmount}`);
    console.log('\n🚀 Now you can test the APIs!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
