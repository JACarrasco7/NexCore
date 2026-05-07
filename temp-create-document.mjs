import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'test.otp@example.com' } });
    if (!user) {
      console.error('User not found');
      process.exit(2);
    }
    const athlete = await prisma.athlete.findUnique({ where: { userId: user.id } });
    if (!athlete) {
      console.error('Athlete not found');
      process.exit(3);
    }
    const doc = await prisma.document.create({
      data: {
        athleteId: athlete.id,
        coachId: athlete.coachId,
        title: 'Contrato de muestra',
        category: 'GENERAL',
        fileUrl: '/uploads/docs/contrato-muestra.pdf',
        fileName: 'contrato-muestra.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        notes: 'Documento de prueba para firma'
      }
    });
    console.log('Created document:', doc.id);
    await prisma.$disconnect();
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
