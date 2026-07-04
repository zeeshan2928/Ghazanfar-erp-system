const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        isActive: true
      }
    });

    console.log('Users in database:');
    console.log(JSON.stringify(users, null, 2));

    if (users.length === 0) {
      console.log('\n⚠️  No users exist! Need to create a user first.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
