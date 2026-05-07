import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      fullName: true,
      goal: true,
      phaseLabel: true,
      coachId: true,
      user: { select: { emailVerified: true } },
      bodyMeasurements: {
        where: { weightKg: { not: null } },
        orderBy: { date: "desc" },
        take: 1,
        select: { weightKg: true },
      },
      checkIns: {
        where: { weightKg: { gt: 0 } },
        orderBy: { date: "desc" },
        take: 1,
        select: { weightKg: true },
      },
      dailyLogs: {
        where: { weightKg: { not: null } },
        orderBy: { date: "desc" },
        take: 1,
        select: { weightKg: true },
      },
    },
  });

  if (!athlete) {
    return NextResponse.json({ error: "Sin perfil de atleta" }, { status: 404 });
  }

  const latestWeightKg = athlete.bodyMeasurements[0]?.weightKg
    ?? athlete.dailyLogs[0]?.weightKg
    ?? athlete.checkIns[0]?.weightKg
    ?? null;

  return NextResponse.json({
    id: athlete.id,
    fullName: athlete.fullName,
    goal: athlete.goal.toLowerCase().replace("_", "-"),
    phaseLabel: athlete.phaseLabel,
    coachId: athlete.coachId,
    latestWeightKg,
    emailVerified: athlete.user?.emailVerified ?? null,
  });
}
