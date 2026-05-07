import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compareAthletesSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN")
    return NextResponse.json({ error: "Solo el coach puede comparar atletas" }, { status: 403 });

  const body: { ids?: string[] } = await req.json().catch(() => ({}));
  const parsed = compareAthletesSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "ids debe ser array de 2-5 elementos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const ids = parsed.data.ids;

  const coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!coach) return NextResponse.json({ error: "Perfil de coach no encontrado" }, { status: 404 });

  const athletes = await prisma.athlete.findMany({
    where: { id: { in: ids }, coachId: coach.id },
    include: {
      checkIns: { orderBy: { date: "desc" }, take: 12 },
      dailyLogs: { orderBy: { date: "desc" }, take: 90 },
      sessionLogs: { orderBy: { date: "desc" }, take: 30 },
      bodyMeasurements: { orderBy: { date: "desc" }, take: 10 },
    },
  });

  if (athletes.length !== ids.length)
    return NextResponse.json({ error: "Uno o más atletas no encontrados o no pertenecen al coach" }, { status: 404 });

  const result = athletes.map((a) => {
    // Adherencia: check-ins últimas 12 semanas
    const totalCheckIns = a.checkIns.length;
    const respondedCheckIns = a.checkIns.filter((c) => c.coachNote).length;
    const adherencePct = totalCheckIns > 0 ? Math.round((respondedCheckIns / totalCheckIns) * 100) : null;

    // Último peso
    const latestWeight = a.dailyLogs.find((l) => l.weightKg && l.weightKg > 0)?.weightKg ?? null;

    // Sueño promedio últimas 2 semanas
    const recentSleep = a.dailyLogs
      .filter((l) => l.sleepHours != null && l.sleepHours > 0)
      .slice(0, 14)
      .map((l) => l.sleepHours as number);
    const avgSleep = recentSleep.length
      ? +(recentSleep.reduce((s, v) => s + v, 0) / recentSleep.length).toFixed(1)
      : null;

    // Pasos promedio últimas 2 semanas
    const recentSteps = a.dailyLogs
      .filter((l) => l.steps != null && (l.steps as number) > 0)
      .slice(0, 14)
      .map((l) => l.steps as number);
    const avgSteps = recentSteps.length
      ? Math.round(recentSteps.reduce((s, v) => s + v, 0) / recentSteps.length)
      : null;

    // Sesiones registradas último mes
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const sessionsLast30 = a.sessionLogs.filter((s) => s.date >= cutoff).length;

    // Última medición corporal
    const lastMeasurement = a.bodyMeasurements[0] ?? null;

    // Último check-in
    const lastCheckIn = a.checkIns[0]
      ? {
          date: a.checkIns[0].date.toISOString().split("T")[0],
          weightKg: a.checkIns[0].weightKg,
          adherencePct: a.checkIns[0].adherencePct,
          sleepHours: a.checkIns[0].sleepHours,
        }
      : null;

    return {
      id: a.id,
      fullName: a.fullName,
      goal: a.goal,
      phaseLabel: a.phaseLabel,
      metrics: {
        adherencePct,
        latestWeightKg: latestWeight,
        avgSleepH: avgSleep,
        avgStepsDay: avgSteps,
        sessionsLast30,
        lastCheckIn,
        lastMeasurement: lastMeasurement
          ? {
              date: lastMeasurement.date.toISOString().split("T")[0],
              bodyFatPct: lastMeasurement.bodyFatPct,
              waistCm: lastMeasurement.waistCm,
            }
          : null,
      },
    };
  });

  return NextResponse.json(result);
}
