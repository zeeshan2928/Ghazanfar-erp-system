import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  try {
    // Create or get organization
    console.log("🏢 Setting up organization...");
    const org = await prisma.organization.upsert({
      where: { slug: "test-org" },
      update: {},
      create: {
        name: "Test Organization",
        slug: "test-org",
        isActive: true,
      },
    });
    console.log(`✅ Organization ready: ${org.name}`);

    // Create admin user
    console.log("👤 Creating admin user...");
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@test.com" },
      update: {},
      create: {
        email: "admin@test.com",
        password: "hashed_password", // In real app, use bcrypt
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        organizationId: org.id,
        isActive: true,
      },
    });
    console.log(`✅ Admin user created`);

    // Create warehouse
    console.log("🏭 Creating warehouse...");
    const warehouse = await prisma.warehouse.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug: "main-warehouse" } },
      update: {},
      create: {
        organizationId: org.id,
        name: "Main Warehouse",
        slug: "main-warehouse",
        location: "Islamabad",
        isActive: true,
      },
    });
    console.log(`✅ Warehouse created`);

    // Create customers
    console.log("👥 Creating customers...");
    const customers = await Promise.all([
      prisma.customer.upsert({
        where: { organizationId_email: { organizationId: org.id, email: "acme@test.com" } },
        update: {},
        create: { organizationId: org.id, name: "Acme Corporation", email: "acme@test.com", phone: "+92-300-1234567", customerType: "WHOLESALE", creditLimit: 500000, isActive: true },
      }),
      prisma.customer.upsert({
        where: { organizationId_email: { organizationId: org.id, email: "tech@test.com" } },
        update: {},
        create: { organizationId: org.id, name: "Tech Solutions Ltd", email: "tech@test.com", phone: "+92-300-2345678", customerType: "RETAIL", creditLimit: 250000, isActive: true },
      }),
      prisma.customer.upsert({
        where: { organizationId_email: { organizationId: org.id, email: "global@test.com" } },
        update: {},
        create: { organizationId: org.id, name: "Global Traders", email: "global@test.com", phone: "+92-300-3456789", customerType: "WHOLESALE", creditLimit: 750000, isActive: true },
      }),
      prisma.customer.upsert({
        where: { organizationId_email: { organizationId: org.id, email: "makki@test.com" } },
        update: {},
        create: { organizationId: org.id, name: "Makki Crockery House", email: "makki@test.com", phone: "+92-300-4567890", customerType: "RETAIL", creditLimit: 150000, isActive: true },
      }),
      prisma.customer.upsert({
        where: { organizationId_email: { organizationId: org.id, email: "express@test.com" } },
        update: {},
        create: { organizationId: org.id, name: "Express Trading Co", email: "express@test.com", phone: "+92-300-5678901", customerType: "WHOLESALE", creditLimit: 600000, isActive: true },
      }),
      prisma.customer.upsert({
        where: { organizationId_email: { organizationId: org.id, email: "premium@test.com" } },
        update: {},
        create: { organizationId: org.id, name: "Premium Retail Store", email: "premium@test.com", phone: "+92-300-6789012", customerType: "RETAIL", creditLimit: 300000, isActive: true },
      }),
      prisma.customer.upsert({
        where: { organizationId_email: { organizationId: org.id, email: "mausa@test.com" } },
        update: {},
        create: { organizationId: org.id, name: "Mausa Enterprises", email: "mausa@test.com", phone: "+92-300-7890123", customerType: "WHOLESALE", creditLimit: 550000, isActive: true },
      }),
      prisma.customer.upsert({
        where: { organizationId_email: { organizationId: org.id, email: "quick@test.com" } },
        update: {},
        create: { organizationId: org.id, name: "Quick Commerce Ltd", email: "quick@test.com", phone: "+92-300-8901234", customerType: "RETAIL", creditLimit: 200000, isActive: true },
      }),
    ]);
    console.log(`✅ Created ${customers.length} customers`);

    // Create products
    console.log("📦 Creating products...");
    const products = await Promise.all([
      prisma.product.upsert({
        where: { organizationId_code: { organizationId: org.id, code: "MCR-001" } },
        update: {},
        create: { organizationId: org.id, code: "MCR-001", name: "Makki Ceramic Plates", cost_price: 450, isActive: true },
      }),
      prisma.product.upsert({
        where: { organizationId_code: { organizationId: org.id, code: "GCS-001" } },
        update: {},
        create: { organizationId: org.id, code: "GCS-001", name: "Glass Cups Set", cost_price: 280, isActive: true },
      }),
      prisma.product.upsert({
        where: { organizationId_code: { organizationId: org.id, code: "SSB-001" } },
        update: {},
        create: { organizationId: org.id, code: "SSB-001", name: "Stainless Steel Bowls", cost_price: 350, isActive: true },
      }),
      prisma.product.upsert({
        where: { organizationId_code: { organizationId: org.id, code: "CVS-001" } },
        update: {},
        create: { organizationId: org.id, code: "CVS-001", name: "Ceramic Vases", cost_price: 600, isActive: true },
      }),
      prisma.product.upsert({
        where: { organizationId_code: { organizationId: org.id, code: "DTR-001" } },
        update: {},
        create: { organizationId: org.id, code: "DTR-001", name: "Decorative Trays", cost_price: 500, isActive: true },
      }),
      prisma.product.upsert({
        where: { organizationId_code: { organizationId: org.id, code: "CTP-001" } },
        update: {},
        create: { organizationId: org.id, code: "CTP-001", name: "Ceramic Tea Pots", cost_price: 800, isActive: true },
      }),
      prisma.product.upsert({
        where: { organizationId_code: { organizationId: org.id, code: "MLD-001" } },
        update: {},
        create: { organizationId: org.id, code: "MLD-001", name: "Melamine Dishes", cost_price: 200, isActive: true },
      }),
      prisma.product.upsert({
        where: { organizationId_code: { organizationId: org.id, code: "PDS-001" } },
        update: {},
        create: { organizationId: org.id, code: "PDS-001", name: "Porcelain Dinner Set", cost_price: 2000, isActive: true },
      }),
      prisma.product.upsert({
        where: { organizationId_code: { organizationId: org.id, code: "SSC-001" } },
        update: {},
        create: { organizationId: org.id, code: "SSC-001", name: "Stainless Steel Cutlery", cost_price: 400, isActive: true },
      }),
      prisma.product.upsert({
        where: { organizationId_code: { organizationId: org.id, code: "GSJ-001" } },
        update: {},
        create: { organizationId: org.id, code: "GSJ-001", name: "Glass Storage Jars", cost_price: 350, isActive: true },
      }),
    ]);
    console.log(`✅ Created ${products.length} products`);

    // Create inventory
    console.log("📊 Creating inventory...");
    for (const product of products) {
      await prisma.inventory.upsert({
        where: { organizationId_productId_warehouseId: { organizationId: org.id, productId: product.id, warehouseId: warehouse.id } },
        update: { physical_on_hand: 100, available: 100 },
        create: { organizationId: org.id, productId: product.id, warehouseId: warehouse.id, physical_on_hand: 100, available: 100 },
      });
    }
    console.log(`✅ Created inventory for ${products.length} products`);

    // Create vendor
    console.log("🏪 Creating vendors...");
    const vendor = await prisma.vendor.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Ceramic Imports Inc" } },
      update: {},
      create: { organizationId: org.id, name: "Ceramic Imports Inc", email: "vendor@ceramic.com", phone: "+92-300-9999999", isActive: true },
    });
    console.log(`✅ Vendor created`);

    // Create bills
    console.log("📄 Creating bills...");
    const bills = await Promise.all([
      prisma.bill.create({
        data: {
          organizationId: org.id,
          bill_number: "BILL-2026-001",
          bill_date: new Date("2026-06-15"),
          customerId: customers[0].id,
          channel: "COUNTER",
          created_by: adminUser.id,
          subtotal: 150000,
          total_amount: 150000,
          payment_method: "BANK_TRANSFER",
          status: "APPROVED",
        },
      }),
      prisma.bill.create({
        data: {
          organizationId: org.id,
          bill_number: "BILL-2026-002",
          bill_date: new Date("2026-06-18"),
          customerId: customers[1].id,
          channel: "COUNTER",
          created_by: adminUser.id,
          subtotal: 75000,
          total_amount: 75000,
          payment_method: "CASH",
          status: "APPROVED",
        },
      }),
      prisma.bill.create({
        data: {
          organizationId: org.id,
          bill_number: "BILL-2026-003",
          bill_date: new Date("2026-06-20"),
          customerId: customers[2].id,
          channel: "COUNTER",
          created_by: adminUser.id,
          subtotal: 250000,
          total_amount: 250000,
          payment_method: "BANK_TRANSFER",
          status: "APPROVED",
        },
      }),
      prisma.bill.create({
        data: {
          organizationId: org.id,
          bill_number: "BILL-2026-004",
          bill_date: new Date("2026-06-22"),
          customerId: customers[3].id,
          channel: "COUNTER",
          created_by: adminUser.id,
          subtotal: 45000,
          total_amount: 45000,
          payment_method: "BANK_TRANSFER",
          status: "APPROVED",
        },
      }),
      prisma.bill.create({
        data: {
          organizationId: org.id,
          bill_number: "BILL-2026-005",
          bill_date: new Date("2026-06-25"),
          customerId: customers[4].id,
          channel: "COUNTER",
          created_by: adminUser.id,
          subtotal: 180000,
          total_amount: 180000,
          payment_method: "CASH",
          status: "REJECTED",
        },
      }),
      prisma.bill.create({
        data: {
          organizationId: org.id,
          bill_number: "BILL-2026-006",
          bill_date: new Date("2026-06-28"),
          customerId: customers[5].id,
          channel: "COUNTER",
          created_by: adminUser.id,
          subtotal: 95000,
          total_amount: 95000,
          payment_method: "BANK_TRANSFER",
          status: "APPROVED",
        },
      }),
      prisma.bill.create({
        data: {
          organizationId: org.id,
          bill_number: "BILL-2026-007",
          bill_date: new Date("2026-07-01"),
          customerId: customers[6].id,
          channel: "COUNTER",
          created_by: adminUser.id,
          subtotal: 320000,
          total_amount: 320000,
          payment_method: "CASH",
          status: "APPROVED",
        },
      }),
      prisma.bill.create({
        data: {
          organizationId: org.id,
          bill_number: "BILL-2026-008",
          bill_date: new Date("2026-07-02"),
          customerId: customers[7].id,
          channel: "COUNTER",
          created_by: adminUser.id,
          subtotal: 65000,
          total_amount: 65000,
          payment_method: "BANK_TRANSFER",
          status: "APPROVED",
        },
      }),
      prisma.bill.create({
        data: {
          organizationId: org.id,
          bill_number: "BILL-2026-009",
          bill_date: new Date("2026-07-03"),
          customerId: customers[0].id,
          channel: "COUNTER",
          created_by: adminUser.id,
          subtotal: 200000,
          total_amount: 200000,
          payment_method: "CASH",
          status: "PENDING_APPROVAL",
        },
      }),
      prisma.bill.create({
        data: {
          organizationId: org.id,
          bill_number: "BILL-2026-010",
          bill_date: new Date("2026-07-04"),
          customerId: customers[2].id,
          channel: "COUNTER",
          created_by: adminUser.id,
          subtotal: 135000,
          total_amount: 135000,
          payment_method: "BANK_TRANSFER",
          status: "APPROVED",
        },
      }),
    ]);
    console.log(`✅ Created ${bills.length} bills`);

    // Create purchase orders
    console.log("🛒 Creating purchase orders...");
    const pos = await Promise.all([
      prisma.purchaseOrder.create({
        data: { organizationId: org.id, po_number: "PO-2026-001", vendorId: vendor.id, status: "SENT", expected_delivery_date: new Date("2026-06-25"), created_by: adminUser.id },
      }),
      prisma.purchaseOrder.create({
        data: { organizationId: org.id, po_number: "PO-2026-002", vendorId: vendor.id, status: "SENT", expected_delivery_date: new Date("2026-07-05"), created_by: adminUser.id },
      }),
      prisma.purchaseOrder.create({
        data: { organizationId: org.id, po_number: "PO-2026-003", vendorId: vendor.id, status: "SENT", expected_delivery_date: new Date("2026-07-10"), created_by: adminUser.id },
      }),
      prisma.purchaseOrder.create({
        data: { organizationId: org.id, po_number: "PO-2026-004", vendorId: vendor.id, status: "RECEIVED", expected_delivery_date: new Date("2026-06-20"), created_by: adminUser.id },
      }),
      prisma.purchaseOrder.create({
        data: { organizationId: org.id, po_number: "PO-2026-005", vendorId: vendor.id, status: "SENT", expected_delivery_date: new Date("2026-07-15"), created_by: adminUser.id },
      }),
    ]);
    console.log(`✅ Created ${pos.length} purchase orders`);

    console.log("\n✨ Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Organization: ${org.name}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Bills: ${bills.length}`);
    console.log(`   Purchase Orders: ${pos.length}`);
    console.log("\n🎉 Ready to test! Refresh your browser to see the data.");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

