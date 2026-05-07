import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  try {
    const doc = await prisma.document.findFirst();
    console.log(JSON.stringify(doc, null, 2));
    await prisma.$disconnect();
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
