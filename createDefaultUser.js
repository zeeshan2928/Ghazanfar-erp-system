const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUser() {
  try {
    // Check if organization exists
    const org = await prisma.organization.findFirst({
      where: { slug: 'ghazanfar-erp' }
    });

    if (!org) {
      console.error('❌ Organization not found!');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin@123', 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'admin@ghazanfar.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        organizationId: org.id,
        isActive: true
      }
    });

    console.log('✅ User created successfully!');
    console.log('\nLogin Credentials:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: admin@123`);
    console.log(`  Organization: ${org.name} (ID: ${org.id})`);
    console.log('\nUser Details:');
    console.log(JSON.stringify(user, null, 2));

  } catch (error) {
    if (error.code === 'P2002') {
      console.error('❌ User already exists!');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
