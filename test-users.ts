import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, isActive: true, role: true, organizationId: true } });
  console.log(users);
}
run().catch(console.error).finally(() => prisma.$disconnect());
