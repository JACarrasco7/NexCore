import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'test.otp@example.com' } });
    if (!user) {
      console.error('User not found');
      process.exit(2);
    }
    const existing = await prisma.athlete.findUnique({ where: { userId: user.id } });
    if (existing) {
      console.log('Athlete already exists:', existing.id);
      process.exit(0);
    }
    const coach = await prisma.coach.findFirst();
    if (!coach) {
      console.error('No coach found in DB to assign as coach. Create one first.');
      process.exit(3);
    }

    const athlete = await prisma.athlete.create({
      data: {
        userId: user.id,
        coachId: coach.id,
        fullName: user.name ?? user.email,
        contactEmail: user.email,
      },
    });
    console.log('Created athlete:', athlete.id);
    await prisma.$disconnect();
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
