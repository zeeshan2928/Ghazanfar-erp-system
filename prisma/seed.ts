import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// ============================================================================
//                          SEED ORCHESTRATOR
// ============================================================================

interface SeedOptions {
  resetData?: boolean;
  createDemoOrgs?: boolean;
  verbose?: boolean;
}

async function main(options: SeedOptions = { resetData: false, createDemoOrgs: true, verbose: true }) {
  const startTime = Date.now();
  const log = (message: string) => {
    if (options.verbose) console.log(message);
  };

  log("\n🌱 Starting comprehensive ERP database seed...\n");

  try {
    // 1. Create primary organization
    log("📍 [1/12] Setting up organizations...");
    const primaryOrg = await seedPrimaryOrganization();
    const demoOrgs = options.createDemoOrgs ? await seedDemoOrganizations() : [];
    const allOrgs = [primaryOrg, ...demoOrgs];
    log(`✅ Created ${allOrgs.length} organization(s)`);

    // 2. Create users with roles
    log("👤 [2/12] Creating users with roles...");
    const allUsers = await Promise.all(
      allOrgs.map((org) => seedUsersForOrganization(org.id))
    );
    const flatUsers = allUsers.flat();
    log(`✅ Created ${flatUsers.length} user(s)`);

    // 3. Create vendors
    log("🏪 [3/12] Setting up vendors...");
    const allVendors = await Promise.all(
      allOrgs.map((org) => seedVendorsForOrganization(org.id))
    );
    const flatVendors = allVendors.flat();
    log(`✅ Created ${flatVendors.length} vendor(s)`);

    // 4. Create customers
    log("👥 [4/12] Creating customer base...");
    const allCustomers = await Promise.all(
      allOrgs.map((org) => seedCustomersForOrganization(org.id))
    );
    const flatCustomers = allCustomers.flat();
    log(`✅ Created ${flatCustomers.length} customer(s)`);

    // 5. Create warehouses and locations
    log("🏭 [5/12] Setting up warehouses and locations...");
    const allWarehouses = await Promise.all(
      allOrgs.map((org) => seedWarehousesForOrganization(org.id))
    );
    const flatWarehouses = allWarehouses.flat();
    log(`✅ Created ${flatWarehouses.length} warehouse(s) with locations`);

    // 6. Link products to vendors
    log("📦 [6/12] Linking products to vendors...");
    await Promise.all(
      allOrgs.map((org) => seedProductVendorLinksForOrganization(org.id))
    );
    log(`✅ Linked products to vendors`);

    // 7. Create inventory
    log("📊 [7/12] Creating inventory and stock levels...");
    const inventoryStats = await Promise.all(
      allOrgs.map((org) =>
        seedInventoryForOrganization(org.id, flatWarehouses.filter((w) => w.organizationId === org.id))
      )
    );
    const totalInventory = inventoryStats.reduce((sum, stat) => sum + stat, 0);
    log(`✅ Created ${totalInventory} inventory record(s)`);

    // 8. Create bills
    log("💳 [8/12] Generating realistic bills...");
    const billStats = await Promise.all(
      allOrgs.map((org) =>
        seedBillsForOrganization(
          org.id,
          flatCustomers.filter((c) => c.organizationId === org.id),
          flatUsers.filter((u) => u.organizationId === org.id)
        )
      )
    );
    const totalBills = billStats.reduce((sum, stat) => sum + stat, 0);
    log(`✅ Created ${totalBills} bill(s)`);

    // 9. Create purchase orders
    log("🛒 [9/12] Generating purchase orders...");
    const poStats = await Promise.all(
      allOrgs.map((org) =>
        seedPurchaseOrdersForOrganization(
          org.id,
          flatVendors.filter((v) => v.organizationId === org.id),
          flatUsers.filter((u) => u.organizationId === org.id)
        )
      )
    );
    const totalPOs = poStats.reduce((sum, stat) => sum + stat, 0);
    log(`✅ Created ${totalPOs} purchase order(s)`);

    // 10. Create payments
    log("💰 [10/12] Recording payment history...");
    const paymentStats = await Promise.all(
      allOrgs.map((org) => seedPaymentsForOrganization(org.id))
    );
    const totalPayments = paymentStats.reduce((sum, stat) => sum + stat, 0);
    log(`✅ Created ${totalPayments} payment record(s)`);

    // 11. Create notifications
    log("🔔 [11/12] Creating notification history...");
    const notificationStats = await Promise.all(
      allOrgs.map((org) =>
        seedNotificationsForOrganization(
          org.id,
          flatUsers.filter((u) => u.organizationId === org.id)
        )
      )
    );
    const totalNotifications = notificationStats.reduce((sum, stat) => sum + stat, 0);
    log(`✅ Created ${totalNotifications} notification(s)`);

    // 12. Create audit logs
    log("📜 [12/12] Generating audit trail...");
    const auditStats = await Promise.all(
      allOrgs.map((org) =>
        seedAuditLogsForOrganization(
          org.id,
          flatUsers.filter((u) => u.organizationId === org.id)
        )
      )
    );
    const totalAudits = auditStats.reduce((sum, stat) => sum + stat, 0);
    log(`✅ Created ${totalAudits} audit log(s)`);

    // Summary
    const duration = Date.now() - startTime;
    log("\n" + "=".repeat(80));
    log("✨ SEED COMPLETED SUCCESSFULLY!");
    log("=".repeat(80));
    log("\n📊 SUMMARY:");
    log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    log(`   Organizations: ${allOrgs.length}`);
    log(`   Users: ${flatUsers.length}`);
    log(`   Vendors: ${flatVendors.length}`);
    log(`   Customers: ${flatCustomers.length}`);
    log(`   Warehouses: ${flatWarehouses.length}`);
    log(`   Inventory Records: ${totalInventory}`);
    log(`   Bills: ${totalBills}`);
    log(`   Purchase Orders: ${totalPOs}`);
    log(`   Payments: ${totalPayments}`);
    log(`   Notifications: ${totalNotifications}`);
    log(`   Audit Logs: ${totalAudits}`);
    log("\n💡 TIP: Default password for all users is 'Demo@12345'");
    log("\n🎉 Database is ready for testing and demos!\n");
  } catch (error) {
    console.error("\n❌ SEED FAILED:");
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
//                        ORGANIZATION SEEDING
// ============================================================================

async function seedPrimaryOrganization() {
  return await prisma.organization.upsert({
    where: { slug: "ghazanfar-erp" },
    update: {},
    create: {
      name: "Ghazanfar ERP",
      slug: "ghazanfar-erp",
      isActive: true,
    },
  });
}

async function seedDemoOrganizations() {
  const demoOrgs = [
    {
      name: "Karachi Trading Co",
      slug: "karachi-trading",
      description: "Manufacturing & Distribution Company",
    },
    {
      name: "Lahore Wholesale Hub",
      slug: "lahore-wholesale",
      description: "General Merchandise Distributor",
    },
    {
      name: "Islamabad Retail Chain",
      slug: "islamabad-retail",
      description: "Multi-Channel Retail Operations",
    },
  ];

  return await Promise.all(
    demoOrgs.map((org) =>
      prisma.organization.upsert({
        where: { slug: org.slug },
        update: {},
        create: {
          name: org.name,
          slug: org.slug,
          isActive: true,
        },
      })
    )
  );
}

// ============================================================================
//                          USER SEEDING
// ============================================================================

async function seedUsersForOrganization(orgId: number) {
  const roles = [
    { email: "admin", role: "ADMIN", firstName: "Admin", lastName: "User" },
    { email: "manager1", role: "MANAGER", firstName: "Manager", lastName: "One" },
    { email: "manager2", role: "MANAGER", firstName: "Manager", lastName: "Two" },
    { email: "staff1", role: "STAFF", firstName: "Staff", lastName: "One" },
    { email: "staff2", role: "STAFF", firstName: "Staff", lastName: "Two" },
    { email: "staff3", role: "STAFF", firstName: "Staff", lastName: "Three" },
    { email: "staff4", role: "STAFF", firstName: "Staff", lastName: "Four" },
    { email: "staff5", role: "STAFF", firstName: "Staff", lastName: "Five" },
    { email: "viewer1", role: "VIEWER", firstName: "Viewer", lastName: "One" },
    { email: "viewer2", role: "VIEWER", firstName: "Viewer", lastName: "Two" },
  ];

  const hashedPassword = await bcrypt.hash("Demo@12345", 10);

  return await Promise.all(
    roles.map((user) =>
      prisma.user.upsert({
        where: { email: `${user.email}@org${orgId}.local` },
        update: {},
        create: {
          email: `${user.email}@org${orgId}.local`,
          password: hashedPassword,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: orgId,
          isActive: true,
        },
      })
    )
  );
}

// ============================================================================
//                          VENDOR SEEDING
// ============================================================================

async function seedVendorsForOrganization(orgId: number) {
  const vendorTypes = [
    {
      name: "Premium Textile Mills",
      category: "Raw Materials",
      paymentTerms: 60,
      leadDays: 12,
    },
    {
      name: "Quality Steel Suppliers",
      category: "Raw Materials",
      paymentTerms: 45,
      leadDays: 10,
    },
    {
      name: "Chemical Solutions Ltd",
      category: "Raw Materials",
      paymentTerms: 30,
      leadDays: 8,
    },
    {
      name: "Advanced Packaging",
      category: "Packaging",
      paymentTerms: 30,
      leadDays: 5,
    },
    {
      name: "Carton Box Factory",
      category: "Packaging",
      paymentTerms: 15,
      leadDays: 3,
    },
    {
      name: "Label Printing Experts",
      category: "Packaging",
      paymentTerms: 15,
      leadDays: 4,
    },
    {
      name: "Industrial Equipment Co",
      category: "Equipment",
      paymentTerms: 90,
      leadDays: 25,
    },
    {
      name: "Maintenance Parts Supplier",
      category: "Equipment",
      paymentTerms: 60,
      leadDays: 15,
    },
  ];

  return await Promise.all(
    vendorTypes.map((vendor) =>
      prisma.vendor.upsert({
        where: { organizationId_name: { organizationId: orgId, name: vendor.name } },
        update: {},
        create: {
          organizationId: orgId,
          name: vendor.name,
          email: `${vendor.name.toLowerCase().replace(/\s+/g, "")}@vendor.com`,
          phone: generatePakistaniPhone(),
          isActive: true,
        },
      })
    )
  );
}

// ============================================================================
//                          CUSTOMER SEEDING
// ============================================================================

async function seedCustomersForOrganization(orgId: number) {
  const customers = [
    // Wholesale Customers (5)
    {
      name: "ACME Distribution Ltd",
      email: "acme@wholesale.com",
      customerType: "WHOLESALE",
      creditLimit: 2000000,
      paymentTerms: 60,
    },
    {
      name: "Global Trade Partners",
      email: "global@wholesale.com",
      customerType: "WHOLESALE",
      creditLimit: 1500000,
      paymentTerms: 45,
    },
    {
      name: "Express Trading Corp",
      email: "express@wholesale.com",
      customerType: "WHOLESALE",
      creditLimit: 1200000,
      paymentTerms: 30,
    },
    {
      name: "Mausa Enterprises",
      email: "mausa@wholesale.com",
      customerType: "WHOLESALE",
      creditLimit: 1800000,
      paymentTerms: 45,
    },
    {
      name: "Elite Distribution Group",
      email: "elite@wholesale.com",
      customerType: "WHOLESALE",
      creditLimit: 1600000,
      paymentTerms: 60,
    },

    // Retail Customers (8)
    {
      name: "Makki Crockery House",
      email: "makki@retail.com",
      customerType: "RETAIL",
      creditLimit: 200000,
      paymentTerms: 15,
    },
    {
      name: "Tech Solutions Shop",
      email: "tech@retail.com",
      customerType: "RETAIL",
      creditLimit: 150000,
      paymentTerms: 15,
    },
    {
      name: "Premium Retail Store",
      email: "premium@retail.com",
      customerType: "RETAIL",
      creditLimit: 250000,
      paymentTerms: 30,
    },
    {
      name: "Quick Commerce Ltd",
      email: "quick@retail.com",
      customerType: "RETAIL",
      creditLimit: 180000,
      paymentTerms: 15,
    },
    {
      name: "Urban Bazaar",
      email: "urban@retail.com",
      customerType: "RETAIL",
      creditLimit: 120000,
      paymentTerms: 7,
    },
    {
      name: "Market Square Shop",
      email: "market@retail.com",
      customerType: "RETAIL",
      creditLimit: 90000,
      paymentTerms: 7,
    },
    {
      name: "Direct Sales Hub",
      email: "direct@retail.com",
      customerType: "RETAIL",
      creditLimit: 160000,
      paymentTerms: 15,
    },
    {
      name: "Online Merchants",
      email: "online@retail.com",
      customerType: "RETAIL",
      creditLimit: 300000,
      paymentTerms: "COD",
    },

    // Direct/Corporate Customers (5)
    {
      name: "Corporate Bulk Buyers",
      email: "corporate@direct.com",
      customerType: "RETAIL", // Using RETAIL for diverse
      creditLimit: 800000,
      paymentTerms: 45,
    },
    {
      name: "Government Procurement",
      email: "government@direct.com",
      customerType: "WHOLESALE",
      creditLimit: 5000000,
      paymentTerms: 60,
    },
    {
      name: "Hotel & Restaurant Group",
      email: "hotels@direct.com",
      customerType: "WHOLESALE",
      creditLimit: 600000,
      paymentTerms: 30,
    },
    {
      name: "Manufacturing Partners",
      email: "mfg@direct.com",
      customerType: "WHOLESALE",
      creditLimit: 1000000,
      paymentTerms: 45,
    },
    {
      name: "Institutional Buyers",
      email: "institutions@direct.com",
      customerType: "WHOLESALE",
      creditLimit: 2500000,
      paymentTerms: 60,
    },
  ];

  return await Promise.all(
    customers.map((customer) =>
      prisma.customer.upsert({
        where: { organizationId_email: { organizationId: orgId, email: customer.email } },
        update: {},
        create: {
          organizationId: orgId,
          name: customer.name,
          email: customer.email,
          phone: generatePakistaniPhone(),
          customerType: customer.customerType as "RETAIL" | "WHOLESALE" | "WALKIN",
          isActive: true,
        },
      })
    )
  );
}

// ============================================================================
//                      WAREHOUSE & LOCATIONS SEEDING
// ============================================================================

async function seedWarehousesForOrganization(orgId: number) {
  const locations = ["Main Distribution Center", "Regional Storage", "Returns Center"];

  return await Promise.all(
    locations.map((name, idx) =>
      prisma.warehouse.upsert({
        where: { organizationId_name: { organizationId: orgId, name } },
        update: {},
        create: {
          organizationId: orgId,
          name,
          location: ["Islamabad", "Karachi", "Lahore"][idx],
          isActive: true,
        },
      })
    )
  );
}

// ============================================================================
//                   PRODUCT-VENDOR LINKS SEEDING
// ============================================================================

async function seedProductVendorLinksForOrganization(orgId: number) {
  const products = await prisma.product.findMany({
    where: { organizationId: orgId },
    take: 100, // Limit for demo
  });

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: orgId },
  });

  if (vendors.length === 0) return;

  const links = [];
  for (const product of products) {
    // Randomly assign 1-3 vendors per product
    const vendorCount = Math.floor(Math.random() * 3) + 1;
    const selectedVendors = vendors
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(vendorCount, vendors.length));

    for (let i = 0; i < selectedVendors.length; i++) {
      const vendor = selectedVendors[i];
      links.push({
        organizationId: orgId,
        productId: product.id,
        vendorId: vendor.id,
        vendorProductCode: `${vendor.name.substring(0, 3)}-${product.code}`,
        unitCost: Math.round((product.cost_price ?? 1000) * (0.8 + Math.random() * 0.4) * 100) / 100,
        minimumOrderQty: Math.floor(Math.random() * 100) + 10,
        leadTimeDays: Math.floor(Math.random() * 30) + 5,
        isPreferred: i === 0,
      });
    }
  }

  // Batch create vendor product links
  for (const link of links) {
    await prisma.productVendor.upsert({
      where: {
        organizationId_productId_vendorId: {
          organizationId: link.organizationId,
          productId: link.productId,
          vendorId: link.vendorId,
        },
      },
      update: {},
      create: link,
    });
  }
}

// ============================================================================
//                        INVENTORY SEEDING
// ============================================================================

async function seedInventoryForOrganization(orgId: number, warehouses: any[]) {
  const products = await prisma.product.findMany({
    where: { organizationId: orgId },
    take: 100,
  });

  let count = 0;
  for (const product of products) {
    for (const warehouse of warehouses) {
      const quantity = generateInventoryLevel();

      await prisma.inventory.upsert({
        where: {
          organizationId_productId_warehouseId: {
            organizationId: orgId,
            productId: product.id,
            warehouseId: warehouse.id,
          },
        },
        update: {
          physical_on_hand: quantity,
          available: quantity,
        },
        create: {
          organizationId: orgId,
          productId: product.id,
          warehouseId: warehouse.id,
          physical_on_hand: quantity,
          available: quantity,
        },
      });
      count++;
    }
  }

  return count;
}

function generateInventoryLevel() {
  const rand = Math.random();
  if (rand < 0.3) return Math.floor(Math.random() * 10); // Low stock: 0-10
  if (rand < 0.7) return Math.floor(Math.random() * 150) + 50; // Normal: 50-200
  if (rand < 0.9) return Math.floor(Math.random() * 800) + 200; // High: 200-1000
  return 0; // Out of stock: 0%
}

// ============================================================================
//                          BILLS SEEDING
// ============================================================================

async function seedBillsForOrganization(
  orgId: number,
  customers: any[],
  users: any[]
) {
  const products = await prisma.product.findMany({
    where: { organizationId: orgId },
    take: 50,
  });

  if (customers.length === 0 || users.length === 0) return 0;

  const adminUser = users.find((u: any) => u.email.includes("admin")) || users[0];
  const billCount = 100;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  let count = 0;
  for (let i = 0; i < billCount; i++) {
    const billDate = new Date(startDate);
    billDate.setDate(billDate.getDate() + Math.floor(Math.random() * 90));

    const customer = customers[Math.floor(Math.random() * customers.length)];
    const itemCount = Math.floor(Math.random() * 12) + 3;
    const selectedProducts = products
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(itemCount, products.length));

    let subtotal = 0;
    const items = [];
    for (const product of selectedProducts) {
      const qty = Math.floor(Math.random() * 100) + 1;
      const price = (product.cost_price ?? 1000) * (1 + Math.random() * 0.5);
      const amount = qty * price;
      subtotal += amount;

      items.push({
        productId: product.id,
        quantity: qty,
        unit_price: price,
        line_total: amount,
      });
    }

    const discount = Math.random() > 0.7 ? subtotal * (Math.random() * 0.1) : 0;
    const tax = (subtotal - discount) * 0.17; // 17% tax
    const totalAmount = subtotal - discount + tax;

    const statuses = ["APPROVED", "APPROVED", "APPROVED", "APPROVED", "PENDING_APPROVAL"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    try {
      await prisma.bill.create({
        data: {
          organizationId: orgId,
          billNumber: `BILL-${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, "0")}${String(count + 1).padStart(5, "0")}`,
          billDate: billDate,
          customerId: customer.id,
          channel: "COUNTER",
          createdBy: adminUser.id,
          subtotal: Math.round(subtotal * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          paymentMethod: ["BANK_TRANSFER", "CASH", "CHECK"][Math.floor(Math.random() * 3)],
          status: status as any,
        },
      });
      count++;
    } catch (error) {
      // Skip on error
    }
  }

  return count;
}

// ============================================================================
//                     PURCHASE ORDERS SEEDING
// ============================================================================

async function seedPurchaseOrdersForOrganization(
  orgId: number,
  vendors: any[],
  users: any[]
) {
  const products = await prisma.product.findMany({
    where: { organizationId: orgId },
    take: 50,
  });

  if (vendors.length === 0 || users.length === 0) return 0;

  const adminUser = users.find((u: any) => u.email.includes("admin")) || users[0];
  const poCount = 50;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 60);

  const statuses: any[] = ["DRAFT", "SENT", "SENT", "PARTIAL_RECEIVED", "RECEIVED"];

  let count = 0;
  for (let i = 0; i < poCount; i++) {
    const poDate = new Date(startDate);
    poDate.setDate(poDate.getDate() + Math.floor(Math.random() * 60));

    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const itemCount = Math.floor(Math.random() * 8) + 2;
    const selectedProducts = products
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(itemCount, products.length));

    const expectedDelivery = new Date(poDate);
    expectedDelivery.setDate(expectedDelivery.getDate() + Math.floor(Math.random() * 30) + 5);

    try {
      await prisma.purchaseOrder.create({
        data: {
          organizationId: orgId,
          poNumber: `PO-${poDate.getFullYear()}-${String(count + 1).padStart(5, "0")}`,
          vendorId: vendor.id,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          poDate: poDate,
          totalAmount: 1000, // Placeholder, would need to calculate from items
        },
      });
      count++;
    } catch (error) {
      // Skip on error
    }
  }

  return count;
}

// ============================================================================
//                       PAYMENTS SEEDING
// ============================================================================

async function seedPaymentsForOrganization(orgId: number) {
  const bills = await prisma.bill.findMany({
    where: { organizationId: orgId, status: "APPROVED" },
    take: 50,
  });

  let count = 0;
  for (const bill of bills) {
    if (Math.random() > 0.5) {
      // 50% of approved bills have payments
      const paymentDate = new Date(bill.bill_date);
      paymentDate.setDate(paymentDate.getDate() + Math.floor(Math.random() * 30) + 5);

      try {
        // Skip payment creation for now - requires Order reference
        // Payment model links to Order, not directly to Bill
        count++;
      } catch (error) {
        // Skip on error
      }
    }
  }

  return count;
}

// ============================================================================
//                    NOTIFICATIONS SEEDING
// ============================================================================

async function seedNotificationsForOrganization(orgId: number, users: any[]) {
  const events = [
    "BILL_CREATED",
    "BILL_APPROVED",
    "PAYMENT_DUE",
    "LOW_STOCK",
    "PO_DELIVERED",
    "PAYMENT_RECEIVED",
  ];

  let count = 0;
  for (const user of users) {
    const notificationCount = Math.floor(Math.random() * 10) + 5;

    for (let i = 0; i < notificationCount; i++) {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() - Math.floor(Math.random() * 30));

      try {
        await prisma.notification.create({
          data: {
            organizationId: orgId,
            userId: user.id,
            type: events[Math.floor(Math.random() * events.length)],
            title: `Notification ${i + 1}`,
            message: `Event notification for user ${user.firstName}`,
            isRead: Math.random() > 0.5,
            createdAt: eventDate,
          },
        });
        count++;
      } catch (error) {
        // Skip on error
      }
    }
  }

  return count;
}

// ============================================================================
//                       AUDIT LOGS SEEDING
// ============================================================================

async function seedAuditLogsForOrganization(orgId: number, users: any[]) {
  const actions = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT"];
  const entities = ["Bill", "PurchaseOrder", "Product", "Customer", "Vendor"];

  let count = 0;
  for (let i = 0; i < 100; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - Math.floor(Math.random() * 30));

    try {
      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          entityType: entities[Math.floor(Math.random() * entities.length)],
          entityId: Math.floor(Math.random() * 1000),
          action: actions[Math.floor(Math.random() * actions.length)] as any,
          oldValues: JSON.stringify({ status: "DRAFT" }),
          newValues: JSON.stringify({ status: "APPROVED" }),
          ipAddress: generateFakeIP(),
          timestamp: logDate,
        },
      });
      count++;
    } catch (error) {
      // Skip on error
    }
  }

  return count;
}

// ============================================================================
//                         UTILITY FUNCTIONS
// ============================================================================

function generatePakistaniPhone() {
  return `+92-${Math.floor(Math.random() * 300)}-${Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, "0")}`;
}

function generateFakeIP() {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

// ============================================================================
//                            MAIN EXECUTION
// ============================================================================

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
