import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compareAthletesSchema } from "@/lib/validators";
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, forbidden, badRequest, notFound } from '@/lib/api/error-response'

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized('Unauthorized')

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN")
    return forbidden('Solo el coach puede comparar atletas')

  const parsedBody = await parseJsonOrError(req)
  if (!parsedBody.ok) return parsedBody.error
  const body = parsedBody.data as any
  const parsed = compareAthletesSchema.safeParse(body);
  if (!parsed.success)
    return badRequest('ids debe ser array de 2-5 elementos', parsed.error.flatten().fieldErrors);
  const ids = parsed.data.ids;

  const coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!coach) return notFound('Perfil de coach no encontrado')

  // Fetch athlete data with optimized queries: reduce data transfer, filter at DB level where possible
  const athletes = await prisma.athlete.findMany({
    where: { id: { in: ids }, coachId: coach.id },
    include: {
      checkIns: { 
        orderBy: { date: "desc" }, 
        take: 12,
        select: { date: true, coachNote: true, weightKg: true, adherencePct: true, sleepHours: true }
      },
      dailyLogs: { 
        orderBy: { date: "desc" }, 
        take: 20, // Reduced from 90 — only need ~14-20 to cover 2 weeks + margin
        select: { date: true, weightKg: true, sleepHours: true, steps: true }
      },
      sessionLogs: { 
        where: {
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days at DB level
          },
        },
        orderBy: { date: "desc" },
        select: { date: true }
      },
      bodyMeasurements: { 
        orderBy: { date: "desc" }, 
        take: 3, // Reduced from 10 — only need the latest
        select: { date: true, bodyFatPct: true, waistCm: true }
      },
    },
  });

  if (athletes.length !== ids.length)
    return notFound('Uno o más atletas no encontrados o no pertenecen al coach')

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

    // Sesiones registradas último mes (now filtered at DB level)
    const sessionsLast30 = a.sessionLogs.length;

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
