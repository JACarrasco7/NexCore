import { NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/cron/inactive-athletes
 * Notifica al coach por cada atleta inactivo (>7 días sin sesión ni check-in).
 * Optimización: 3 queries en lugar de N+1.
 * Invoke with: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  // 1. Atletas con actividad reciente
  const [recentCheckIns, recentSessions] = await Promise.all([
    prisma.checkIn.findMany({
      where: { date: { gte: cutoff } },
      select: { athleteId: true },
      distinct: ["athleteId"],
    }),
    prisma.sessionLog.findMany({
      where: { date: { gte: cutoff } },
      select: { athleteId: true },
      distinct: ["athleteId"],
    }),
  ]);

  const activeIds = new Set([
    ...recentCheckIns.map((c) => c.athleteId),
    ...recentSessions.map((s) => s.athleteId),
  ]);

  // 2. Solo atletas inactivos con coach
  const inactiveAthletes = await prisma.athlete.findMany({
    where: {
      id: { notIn: activeIds.size > 0 ? [...activeIds] : ["__none__"] },
    },
    select: {
      id: true,
      fullName: true,
      coach: { select: { userId: true } },
      checkIns: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
      sessionLogs: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
    },
  });

  if (inactiveAthletes.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // 3. Batch-create notificaciones en transacción (solo para atletas con coach)
  const notificationsToCreate = inactiveAthletes
    .filter((a) => a.coach !== null) // Solo atletas con coach asignado
    .map((athlete) => {
      const lastCheckIn = athlete.checkIns[0]?.date ?? null;
      const lastSession = athlete.sessionLogs[0]?.date ?? null;
      const mostRecent = [lastCheckIn, lastSession]
        .filter(Boolean)
        .map((d) => new Date(d!))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      const daysInactive = mostRecent
        ? Math.floor((Date.now() - mostRecent.getTime()) / 86_400_000)
        : null;

      return prisma.notification.create({
        data: {
          userId: athlete.coach!.userId, // Safe because of filter above
          type: NotificationType.ALERT_ADHERENCE_LOW,
          title: `${athlete.fullName} lleva ${daysInactive ?? "varios"} días sin actividad`,
          body: daysInactive
            ? `Sin check-in ni sesión registrada en ${daysInactive} días. Considera contactarle.`
            : "Sin actividad registrada desde el inicio.",
          link: `/coach/athletes/${athlete.id}`,
        },
      });
    });

  if (notificationsToCreate.length > 0) {
    await prisma.$transaction(notificationsToCreate);
  }

  return NextResponse.json({ ok: true, notified: notificationsToCreate.length });
}
