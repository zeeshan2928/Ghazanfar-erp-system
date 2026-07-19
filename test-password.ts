import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findUnique({ where: { email: "admin@ghazanfar.com" } });
  if (!user) {
    console.log("User not found");
    return;
  }
  console.log("Hash in DB:", user.password);
  const isValid = await bcrypt.compare("admin@123", user.password);
  console.log("Is Valid:", isValid);
}

run().catch(console.error).finally(() => prisma.$disconnect());
