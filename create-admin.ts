import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const hashedPassword = await bcrypt.hash("admin@123", 10);

    // Get or find primary organization
    let org = await prisma.organization.findFirst({
      where: { slug: "ghazanfar" },
    });

    if (!org) {
      org = await prisma.organization.findFirst();
    }

    if (!org) {
      console.log("❌ No organization found in database");
      return;
    }

    console.log("✅ Using organization:", org.name);

    // Create admin user
    const user = await prisma.user.upsert({
      where: { email: "admin@ghazanfar.com" },
      update: { isActive: true },
      create: {
        email: "admin@ghazanfar.com",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        organizationId: org.id,
        isActive: true,
      },
    });

    console.log("✅ Admin user created:", user.email);
    console.log("\n📝 Login Credentials:");
    console.log("   Email: admin@ghazanfar.com");
    console.log("   Password: admin@123");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
