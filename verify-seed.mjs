import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      contractTemplate: true,
      settings: {
        select: { id: true, displayName: true, locale: true, contractVersion: true }
      }
    }
  });

  console.log('=== Teams ===');
  console.log(JSON.stringify(teams, null, 2));

  const postsCount = await prisma.teamPost.findMany({
    select: { id: true, teamId: true, content: true }
  });
  console.log(`\n=== TeamPosts (${postsCount.length}) ===`);
  if (postsCount.length > 0) {
    console.log(JSON.stringify(postsCount.slice(0, 2), null, 2));
  }

} catch (e) {
  console.error('Error:', e);
} finally {
  await prisma.$disconnect();
  process.exit(0);
}
