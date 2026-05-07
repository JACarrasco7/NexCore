import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coach.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!coach) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const athlete = await prisma.athlete.findUnique({ where: { id }, select: { coachId: true } });
  if (!athlete || athlete.coachId !== coach.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rangeParam = req.nextUrl.searchParams.get("range") ?? "90";
  const rangeMap: Record<string, number | null> = { "7": 7, "30": 30, "90": 90, "all": null };
  const rangeDays = Object.prototype.hasOwnProperty.call(rangeMap, rangeParam) ? rangeMap[rangeParam] : 90;
  const dateFilter = rangeDays != null
    ? { gte: new Date(Date.now() - rangeDays * 86_400_000) }
    : undefined;

  const sessionLogs = await prisma.sessionLog.findMany({
    where: { athleteId: id, ...(dateFilter ? { date: dateFilter } : {}) },
    orderBy: { date: "asc" },
    take: rangeDays != null ? undefined : 200,
    include: { sets: { orderBy: [{ exerciseIndex: "asc" }, { setNumber: "asc" }] } },
  });

  return NextResponse.json({
    sessions: sessionLogs.map((s) => ({
      id: s.id,
      date: s.date.toISOString().split("T")[0],
      sessionName: s.sessionName,
      durationMin: s.durationMin,
      kcalBurned: s.kcalBurned,
      heartRateAvg: s.heartRateAvg,
      source: s.source,
      sets: s.sets.map((st) => ({
        exercise: st.exercise,
        setNumber: st.setNumber,
        loadKg: st.loadKg,
        reps: st.reps,
        rir: st.rir,
      })),
    })),
  });
}
