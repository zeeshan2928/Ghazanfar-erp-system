const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function diagnose() {
  try {
    console.log('🔍 COMPLETE API DIAGNOSTIC\n');

    // 1. Check database
    console.log('1️⃣ DATABASE CHECK:');
    const users = await prisma.user.count();
    const products = await prisma.product.count();
    const orgs = await prisma.organization.count();
    console.log(`   Users: ${users}`);
    console.log(`   Products: ${products}`);
    console.log(`   Organizations: ${orgs}`);

    // 2. Get user for token
    console.log('\n2️⃣ USER CHECK:');
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('   ❌ No user found!');
      return;
    }
    console.log(`   Email: ${user.email}`);
    console.log(`   OrgId: ${user.organizationId}`);

    // 3. Generate JWT token
    console.log('\n3️⃣ JWT TOKEN:');
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h'
    });
    console.log(`   Token: ${token.substring(0, 50)}...`);

    // 4. Test API endpoint
    console.log('\n4️⃣ API ENDPOINT TEST:');
    try {
      const response = await axios.post(
        'http://localhost:3000/products/search',
        {
          skip: 0,
          take: 5
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`   ✅ API responded with status: ${response.status}`);
      console.log(`   Response data:`, JSON.stringify(response.data, null, 2));

    } catch (apiError) {
      console.log(`   ❌ API Error: ${apiError.message}`);
      if (apiError.response) {
        console.log(`   Status: ${apiError.response.status}`);
        console.log(`   Data:`, JSON.stringify(apiError.response.data, null, 2));
      }
    }

    // 5. Check search service directly
    console.log('\n5️⃣ SEARCH SERVICE DIRECT TEST:');
    const { ProductsSearchService } = require('./src/modules/products/services/products-search.service');
    const searchService = new ProductsSearchService(prisma);

    const result = await searchService.search(1, {
      skip: 0,
      take: 5
    });

    console.log(`   Data count: ${result.data?.length || 0}`);
    console.log(`   Total: ${result.total || 0}`);
    if (result.data && result.data.length > 0) {
      console.log(`   First item:`, JSON.stringify(result.data[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Diagnostic Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
