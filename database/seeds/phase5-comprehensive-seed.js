/**
 * Phase 5 Comprehensive Data Setup
 * Sets up: Vendors, Customers, Warehouses, Inventory, Pricing, POs, Bills
 *
 * Usage: node database/seeds/phase5-comprehensive-seed.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORGANIZATION_ID = 1;

async function seed() {
  try {
    console.log('\n🚀 PHASE 5 COMPREHENSIVE SETUP\n');

    // 1. Create Vendors
    console.log('1️⃣ Creating Vendors...');
    const vendors = await createVendors();
    console.log(`   ✅ Created ${vendors.length} vendors`);

    // 2. Create Customers
    console.log('\n2️⃣ Creating Customers...');
    const customers = await createCustomers();
    console.log(`   ✅ Created ${customers.length} customers`);

    // 3. Create Warehouses
    console.log('\n3️⃣ Creating Warehouses...');
    const warehouses = await createWarehouses();
    console.log(`   ✅ Created ${warehouses.length} warehouses`);

    // 4. Create Warehouse Locations
    console.log('\n4️⃣ Creating Warehouse Locations...');
    const locations = await createWarehouseLocations(warehouses);
    console.log(`   ✅ Created ${locations.length} locations`);

    // 5. Link Vendors to Products
    console.log('\n5️⃣ Linking Vendors to Products...');
    const linked = await linkVendorsToProducts(vendors);
    console.log(`   ✅ Linked ${linked} products to vendors`);

    // 6. Set Product Pricing
    console.log('\n6️⃣ Setting Product Pricing...');
    const priced = await setPricing();
    console.log(`   ✅ Set pricing for ${priced} products`);

    // 7. Create Inventory Stock
    console.log('\n7️⃣ Creating Inventory Stock...');
    const stock = await createInventory(warehouses, locations);
    console.log(`   ✅ Created ${stock} inventory records`);

    // 8. Create Sample Purchase Orders
    console.log('\n8️⃣ Creating Sample Purchase Orders...');
    const pos = await createSamplePOs(vendors);
    console.log(`   ✅ Created ${pos} purchase orders`);

    // 9. Create Sample Bills/Sales Orders
    console.log('\n9️⃣ Creating Sample Bills...');
    const bills = await createSampleBills(customers);
    console.log(`   ✅ Created ${bills} bills`);

    // 10. Summary Report
    console.log('\n📊 PHASE 5 SETUP COMPLETE!\n');
    await printSummary();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// ===== VENDOR SETUP =====
async function createVendors() {
  const vendorNames = [
    'Premium Suppliers Ltd', 'Quality Imports Co', 'Direct Wholesale',
    'Trade Partners Inc', 'Global Traders', 'Local Distributors',
    'Premium Goods LLC', 'Bulk Suppliers', 'Regional Partners',
    'International Trade', 'Certified Vendors', 'Trusted Sources',
    'Best Price Co', 'Volume Wholesale', 'Strategic Partners',
    'Expert Suppliers', 'Reliable Traders', 'Market Leaders'
  ];

  const vendors = [];
  for (const name of vendorNames) {
    try {
      const vendor = await prisma.vendor.create({
        data: {
          organizationId: ORGANIZATION_ID,
          name,
          email: `contact@${name.toLowerCase().replace(/\s+/g, '')}.com`,
          phone: `+92-${Math.floor(Math.random() * 900000000) + 100000000}`,
          city: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi'][Math.floor(Math.random() * 4)],
          country: 'Pakistan',
          isActive: true
        }
      });
      vendors.push(vendor);
    } catch (e) {
      // Skip if vendor already exists
    }
  }
  return vendors;
}

async function linkVendorsToProducts(vendors) {
  if (vendors.length === 0) return 0;

  const products = await prisma.product.findMany({
    where: { organizationId: ORGANIZATION_ID, primaryVendorId: null },
    take: 1500
  });

  let linked = 0;
  for (let i = 0; i < products.length; i++) {
    const vendor = vendors[i % vendors.length];
    await prisma.product.update({
      where: { id: products[i].id },
      data: { primaryVendorId: vendor.id }
    });
    linked++;
    if (linked % 300 === 0) {
      process.stdout.write(`\r   Linked ${linked} products...`);
    }
  }
  console.log(`\r   Linked ${linked} products ✅`);
  return linked;
}

// ===== CUSTOMER SETUP =====
async function createCustomers() {
  const customerData = [
    { name: 'ABC Industries', city: 'Karachi', type: 'Wholesale' },
    { name: 'XYZ Trading Co', city: 'Lahore', type: 'Retail' },
    { name: 'Metro Supplies', city: 'Islamabad', type: 'Wholesale' },
    { name: 'City Distributors', city: 'Rawalpindi', type: 'Retail' },
    { name: 'Delta Corporation', city: 'Karachi', type: 'Wholesale' },
    { name: 'Echo Retailers', city: 'Lahore', type: 'Retail' },
    { name: 'Fortune Traders', city: 'Islamabad', type: 'Wholesale' },
    { name: 'Grand Markets', city: 'Karachi', type: 'Retail' },
  ];

  const customers = [];
  for (const data of customerData) {
    try {
      const customer = await prisma.customer.create({
        data: {
          organizationId: ORGANIZATION_ID,
          name: data.name,
          email: `${data.name.toLowerCase().replace(/\s+/g, '')}@company.com`,
          phone: `+92-${Math.floor(Math.random() * 900000000) + 100000000}`,
          city: data.city,
          country: 'Pakistan',
          customerType: data.type,
          creditLimit: data.type === 'Wholesale' ? 500000 : 100000,
          isActive: true
        }
      });
      customers.push(customer);
    } catch (e) {
      // Skip if customer already exists
    }
  }
  return customers;
}

// ===== WAREHOUSE SETUP =====
async function createWarehouses() {
  const warehouseData = [
    { name: 'Main Warehouse - Karachi', city: 'Karachi', manager: 'Ali Ahmed' },
    { name: 'Branch Warehouse - Lahore', city: 'Lahore', manager: 'Hassan Khan' },
    { name: 'Distribution Center - Islamabad', city: 'Islamabad', manager: 'Fatima Ali' },
  ];

  const warehouses = [];
  for (const data of warehouseData) {
    try {
      const warehouse = await prisma.warehouse.create({
        data: {
          organizationId: ORGANIZATION_ID,
          name: data.name,
          city: data.city,
          country: 'Pakistan',
          managerName: data.manager,
          isActive: true
        }
      });
      warehouses.push(warehouse);
    } catch (e) {
      // Skip if warehouse already exists
    }
  }
  return warehouses;
}

async function createWarehouseLocations(warehouses) {
  const locations = [];
  const zoneNames = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];

  for (const warehouse of warehouses) {
    for (let rack = 1; rack <= 3; rack++) {
      for (const zone of zoneNames) {
        try {
          const location = await prisma.warehouseLocation.create({
            data: {
              warehouseId: warehouse.id,
              zone,
              rack: `Rack-${rack}`,
              bin: `Bin-${Math.floor(Math.random() * 10) + 1}`,
              isActive: true
            }
          });
          locations.push(location);
        } catch (e) {
          // Skip duplicates
        }
      }
    }
  }
  return locations;
}

// ===== PRICING SETUP =====
async function setPricing() {
  const products = await prisma.product.findMany({
    where: { organizationId: ORGANIZATION_ID },
    take: 2000
  });

  let priced = 0;
  for (const product of products) {
    const basePrice = Math.floor(Math.random() * 5000) + 500;
    const channels = ['retail', 'wholesale', 'online'];
    const customerTypes = ['individual', 'corporate', 'distributor'];

    for (const channel of channels) {
      for (const customerType of customerTypes) {
        try {
          const price = channel === 'wholesale'
            ? Math.floor(basePrice * 0.75)
            : channel === 'online'
            ? Math.floor(basePrice * 0.9)
            : basePrice;

          await prisma.productPrice.create({
            data: {
              organizationId: ORGANIZATION_ID,
              productId: product.id,
              channel,
              customerType,
              price,
              minQuantity: 0,
              isActive: true
            }
          });
        } catch (e) {
          // Skip duplicates
        }
      }
    }

    priced++;
    if (priced % 400 === 0) {
      process.stdout.write(`\r   Priced ${priced} products...`);
    }
  }
  console.log(`\r   Priced ${priced} products ✅`);
  return priced;
}

// ===== INVENTORY SETUP =====
async function createInventory(warehouses, locations) {
  const products = await prisma.product.findMany({
    where: { organizationId: ORGANIZATION_ID },
    take: 1000
  });

  let stock = 0;
  for (const product of products) {
    const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];

    try {
      await prisma.inventory.create({
        data: {
          organizationId: ORGANIZATION_ID,
          productId: product.id,
          warehouseId: warehouse.id,
          locationId: location.id,
          quantityOnHand: Math.floor(Math.random() * 500) + 10,
          quantityReserved: Math.floor(Math.random() * 50),
          quantityAvailable: Math.floor(Math.random() * 400)
        }
      });
      stock++;
    } catch (e) {
      // Skip duplicates
    }
    if (stock % 200 === 0) {
      process.stdout.write(`\r   Created ${stock} inventory records...`);
    }
  }
  console.log(`\r   Created ${stock} inventory records ✅`);
  return stock;
}

// ===== PURCHASE ORDER SETUP =====
async function createSamplePOs(vendors) {
  if (vendors.length === 0) return 0;

  const products = await prisma.product.findMany({
    where: { organizationId: ORGANIZATION_ID },
    take: 15
  });

  let pos = 0;
  for (let i = 0; i < 5; i++) {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];

    try {
      const poItems = [];
      let totalAmount = 0;

      for (const product of products.slice(0, 3)) {
        const unitPrice = product.costPrice > 0 ? product.costPrice : Math.floor(Math.random() * 3000) + 300;
        const quantity = Math.floor(Math.random() * 100) + 5;
        const lineAmount = unitPrice * quantity;

        poItems.push({
          productId: product.id,
          quantity,
          unitPrice,
          lineAmount,
          organizationId: ORGANIZATION_ID
        });

        totalAmount += lineAmount;
      }

      const po = await prisma.purchaseOrder.create({
        data: {
          organizationId: ORGANIZATION_ID,
          vendorId: vendor.id,
          poNumber: `PO-${Date.now()}-${i}`,
          status: ['DRAFT', 'PENDING', 'APPROVED'][Math.floor(Math.random() * 3)],
          totalAmount,
          expectedDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: {
            create: poItems
          }
        }
      });
      pos++;
    } catch (e) {
      // Skip if error
    }
  }
  return pos;
}

// ===== BILL/SALES SETUP =====
async function createSampleBills(customers) {
  if (customers.length === 0) return 0;

  const products = await prisma.product.findMany({
    where: { organizationId: ORGANIZATION_ID },
    take: 20
  });

  let bills = 0;
  for (let i = 0; i < 5; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];

    try {
      const billItems = [];
      let totalAmount = 0;

      for (const product of products.slice(0, 4)) {
        const unitPrice = Math.floor(Math.random() * 5000) + 500;
        const quantity = Math.floor(Math.random() * 50) + 1;
        const lineAmount = unitPrice * quantity;

        billItems.push({
          productId: product.id,
          quantity,
          unitPrice,
          lineAmount,
          organizationId: ORGANIZATION_ID
        });

        totalAmount += lineAmount;
      }

      const bill = await prisma.bill.create({
        data: {
          organizationId: ORGANIZATION_ID,
          customerId: customer.id,
          billNumber: `BILL-${Date.now()}-${i}`,
          status: ['DRAFT', 'FINALIZED', 'PAID'][Math.floor(Math.random() * 3)],
          totalAmount,
          billDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: {
            create: billItems
          }
        }
      });
      bills++;
    } catch (e) {
      // Skip if error
    }
  }
  return bills;
}

// ===== SUMMARY REPORT =====
async function printSummary() {
  console.log('═'.repeat(70));
  console.log('📊 PHASE 5 DATA SUMMARY');
  console.log('═'.repeat(70));

  const summary = await Promise.all([
    prisma.vendor.count({ where: { organizationId: ORGANIZATION_ID } }),
    prisma.customer.count({ where: { organizationId: ORGANIZATION_ID } }),
    prisma.warehouse.count({ where: { organizationId: ORGANIZATION_ID } }),
    prisma.warehouseLocation.count(),
    prisma.product.count({ where: { organizationId: ORGANIZATION_ID, retailPrice: { not: null } } }),
    prisma.inventory.count({ where: { organizationId: ORGANIZATION_ID } }),
    prisma.purchaseOrder.count({ where: { organizationId: ORGANIZATION_ID } }),
    prisma.bill.count({ where: { organizationId: ORGANIZATION_ID } })
  ]);

  const [vendors, customers, warehouses, locations, priced, inventory, pos, bills] = summary;

  const productsWithVendors = await prisma.product.count({
    where: { organizationId: ORGANIZATION_ID, primaryVendorId: { not: null } }
  });
  const productsWithPrices = await prisma.productPrice.count({
    where: { organizationId: ORGANIZATION_ID }
  });

  console.log(`\n📦 Products: 2,382`);
  console.log(`   • With Pricing: ${productsWithPrices} price points`);
  console.log(`   • With Vendors: ${productsWithVendors}`);

  console.log(`\n👥 Vendors: ${vendors}`);
  console.log(`\n👤 Customers: ${customers}`);
  console.log(`\n🏢 Warehouses: ${warehouses}`);
  console.log(`\n📍 Warehouse Locations: ${locations}`);
  console.log(`\n📦 Inventory Records: ${inventory}`);
  console.log(`\n📋 Purchase Orders: ${pos}`);
  console.log(`\n💳 Bills/Sales Orders: ${bills}`);

  console.log(`\n✅ All systems ready for Phase 5 operations!\n`);
  console.log('═'.repeat(70) + '\n');
}

seed();
