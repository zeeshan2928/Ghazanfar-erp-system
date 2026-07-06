import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function populateData() {
  try {
    console.log("🌱 Populating database with test data...\n");

    // Get organization
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.log("❌ No organization found!");
      return;
    }

    // Create warehouses
    let wh1 = await prisma.warehouse.findFirst({
      where: { name: "Main Warehouse" }
    });
    if (!wh1) {
      wh1 = await prisma.warehouse.create({
        data: {
          name: "Main Warehouse",
          slug: "main-warehouse",
          location: "Karachi",
          organizationId: org.id,
          isActive: true,
        }
      });
      console.log("✅ Created warehouse:", wh1.name);
    }

    let wh2 = await prisma.warehouse.findFirst({
      where: { name: "Secondary Warehouse" }
    });
    if (!wh2) {
      wh2 = await prisma.warehouse.create({
        data: {
          name: "Secondary Warehouse",
          slug: "secondary-warehouse",
          location: "Lahore",
          organizationId: org.id,
          isActive: true,
        }
      });
      console.log("✅ Created warehouse:", wh2.name);
    }

    // Create sample products
    const productData = [
      { name: "Samsung Galaxy S24", code: "PHONE-001", price: 150000 },
      { name: "iPhone 15 Pro", code: "PHONE-002", price: 250000 },
      { name: "USB-C Charger", code: "ACC-001", price: 5000 },
      { name: "HDMI Cable", code: "ACC-002", price: 2000 },
      { name: "Phone Case", code: "ACC-003", price: 1000 },
      { name: "Screen Protector", code: "ACC-004", price: 1500 },
      { name: "Wireless Earbuds", code: "ACC-005", price: 8000 },
      { name: "Power Bank 20000mAh", code: "ACC-006", price: 15000 },
      { name: "Laptop Stand", code: "ACC-007", price: 3000 },
      { name: "USB Hub 7-Port", code: "ACC-008", price: 4000 },
    ];

    console.log("\n📦 Creating products...");
    const products = [];
    for (const p of productData) {
      const product = await prisma.product.upsert({
        where: { code: p.code },
        update: {},
        create: {
          name: p.name,
          code: p.code,
          description: `High-quality ${p.name}`,
          cost_price: Math.floor(p.price * 0.6),
          organizationId: org.id,
          isActive: true,
        }
      });
      products.push(product);
      console.log(`  ✓ ${product.name}`);
    }

    // Create inventory records
    console.log("\n📊 Creating inventory records...");
    for (const product of products) {
      // Warehouse 1
      await prisma.inventory.upsert({
        where: {
          organizationId_productId_warehouseId: {
            organizationId: org.id,
            productId: product.id,
            warehouseId: wh1.id
          }
        },
        update: {},
        create: {
          productId: product.id,
          warehouseId: wh1.id,
          physical_on_hand: Math.floor(Math.random() * 100) + 10,
          reserved: Math.floor(Math.random() * 20),
          available: Math.floor(Math.random() * 80),
          organizationId: org.id,
        }
      });

      // Warehouse 2
      await prisma.inventory.upsert({
        where: {
          organizationId_productId_warehouseId: {
            organizationId: org.id,
            productId: product.id,
            warehouseId: wh2.id
          }
        },
        update: {},
        create: {
          productId: product.id,
          warehouseId: wh2.id,
          physical_on_hand: Math.floor(Math.random() * 80) + 5,
          reserved: Math.floor(Math.random() * 15),
          available: Math.floor(Math.random() * 70),
          organizationId: org.id,
        }
      });
    }
    console.log(`  ✓ Created inventory for ${products.length} products × 2 warehouses`);

    // Create sample customers
    console.log("\n👥 Creating customers...");
    const customers = [
      { name: "Ali Traders", email: "ali@traders.com", phone: "03001234567", address: "Karachi" },
      { name: "Khan Electronics", email: "khan@electronics.com", phone: "03211234567", address: "Lahore" },
      { name: "Tech Hub", email: "tech@hub.com", phone: "03331234567", address: "Islamabad" },
      { name: "Digital Store", email: "digital@store.com", phone: "03001111111", address: "Karachi" },
      { name: "Mobile Paradise", email: "mobile@paradise.com", phone: "03219999999", address: "Lahore" },
    ];

    for (const c of customers) {
      await prisma.customer.upsert({
        where: {
          organizationId_email: {
            organizationId: org.id,
            email: c.email
          }
        },
        update: {},
        create: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          organizationId: org.id,
          isActive: true,
        }
      });
      console.log(`  ✓ ${c.name}`);
    }

    console.log("\n✨ Data population complete!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

populateData();
