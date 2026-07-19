import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function updateAdmin() {
  const hashedPassword = await bcrypt.hash("admin@123", 10);
  await prisma.user.update({
    where: { email: "admin@ghazanfar.com" },
    data: { password: hashedPassword }
  });
  console.log("Password updated for admin@ghazanfar.com");
}

updateAdmin().catch(console.error).finally(() => prisma.$disconnect());
