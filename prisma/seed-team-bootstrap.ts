import { PrismaClient, TeamRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Bootstrapping teams from current coach-athlete links...");

  const coaches = await prisma.coach.findMany({
    include: {
      user: { select: { name: true, email: true } },
      athletes: { select: { id: true, teamId: true } },
    },
  });

  for (const coach of coaches) {
    // Reuse first team membership by user if exists (new model), fallback legacy
    const membership = await prisma.teamUserMembership.findFirst({
      where: { userId: coach.userId, isActive: true },
      select: { teamId: true },
      orderBy: { createdAt: "asc" },
    });

    const legacyMembership = membership
      ? null
      : await prisma.teamMembership.findFirst({
          where: { coachId: coach.id, isActive: true },
          select: { teamId: true },
          orderBy: { createdAt: "asc" },
        });

    let teamId = membership?.teamId ?? legacyMembership?.teamId;
    if (!teamId) {
      const baseName = coach.displayName || coach.user.name || coach.user.email || "Equipo";
      const team = await prisma.team.create({
        data: { name: `${baseName} Team` },
        select: { id: true },
      });
      teamId = team.id;

      await prisma.teamMembership.create({
        data: {
          teamId,
          coachId: coach.id,
          role: TeamRole.ADMIN,
          isActive: true,
        },
      });
    }

    const athleteIds = coach.athletes.filter((a) => !a.teamId).map((a) => a.id);
    if (athleteIds.length > 0) {
      await prisma.athlete.updateMany({
        where: { id: { in: athleteIds } },
        data: { teamId },
      });
    }

    await prisma.teamUserMembership.upsert({
      where: { teamId_userId: { teamId, userId: coach.userId } },
      update: { isActive: true, role: TeamRole.ADMIN },
      create: {
        teamId,
        userId: coach.userId,
        role: TeamRole.ADMIN,
        isActive: true,
      },
    });

    const teamAthletes = await prisma.athlete.findMany({
      where: { teamId, userId: { not: "" } },
      select: { userId: true },
    });

    for (const athlete of teamAthletes) {
      await prisma.teamUserMembership.upsert({
        where: { teamId_userId: { teamId, userId: athlete.userId } },
        update: { isActive: true, role: TeamRole.MEMBER },
        create: {
          teamId,
          userId: athlete.userId,
          role: TeamRole.MEMBER,
          isActive: true,
        },
      });
    }

    console.log(`Coach ${coach.displayName}: team ${teamId}, athletes migrated ${athleteIds.length}`);
  }

  console.log("Team bootstrap complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
