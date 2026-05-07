import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'test.otp@example.com' } });
    if (!user) {
      console.error('User not found');
      process.exit(2);
    }
    const token = await prisma.otpToken.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    console.log(JSON.stringify(token, null, 2));
    await prisma.$disconnect();
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
