import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAthleteAccess, requireSession, requireAthleteId, paginationSchema, buildPaginationResponse } from "@/lib/api";
import { dailyLogSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try { await requireSession(); } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const athleteId = searchParams.get("athleteId") ?? undefined;
  if (!athleteId) return NextResponse.json({ error: "athleteId requerido" }, { status: 400 });

  try {
    await assertAthleteAccess(athleteId);
  } catch {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const pagination = paginationSchema.safeParse({
    take: searchParams.get("take") ?? 90,
    cursor: searchParams.get("cursor") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  const { take, cursor, from, to } = pagination.success ? pagination.data : { take: 90, cursor: undefined, from: undefined, to: undefined };

  const where: Record<string, unknown> = { athleteId };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const rows = await prisma.dailyLog.findMany({
    where,
    orderBy: { date: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const { items, nextCursor } = buildPaginationResponse(
    rows.map((r) => ({
      id: r.id,
      athleteId: r.athleteId,
      date: r.date.toISOString(),
      weightKg: r.weightKg,
      steps: r.steps,
      sleepHours: r.sleepHours,
      waistCm: r.waistCm,
      bodyFatPct: r.bodyFatPct,
      notes: r.notes ?? "",
    })),
    take,
  );

  return NextResponse.json({ items, nextCursor });
}

export async function POST(request: Request) {
  let session;
  try { session = await requireSession(); } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();

  const parsed = dailyLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const data = parsed.data;

  // ATHLETE role: force own athleteId
  let resolvedAthleteId: string;
  if (session.role === "ATHLETE") {
    try {
      resolvedAthleteId = await requireAthleteId();
    } catch {
      return NextResponse.json({ error: "Perfil de atleta no encontrado" }, { status: 404 });
    }
  } else {
    try {
      await assertAthleteAccess(data.athleteId);
    } catch {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
    resolvedAthleteId = data.athleteId;
  }

  const row = await prisma.dailyLog.create({
    data: {
      athleteId: resolvedAthleteId,
      date: data.date ? new Date(data.date) : new Date(),
      weightKg: data.weightKg ?? 0,
      sleepHours: data.sleepHours ?? 0,
      steps: data.steps ?? 0,
      waistCm: data.waistCm ?? null,
      bodyFatPct: data.bodyFatPct ?? null,
      notes: data.notes ?? "",
    },
  });

  return NextResponse.json({
    id: row.id,
    athleteId: row.athleteId,
    date: row.date.toISOString(),
    weightKg: row.weightKg,
    steps: row.steps,
    sleepHours: row.sleepHours,
    waistCm: row.waistCm,
    bodyFatPct: row.bodyFatPct,
    notes: row.notes ?? "",
  }, { status: 201 });
}
