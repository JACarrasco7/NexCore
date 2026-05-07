import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET todas las medidas del atleta
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coach.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const athlete = await prisma.athlete.findUnique({ where: { id }, select: { coachId: true } });

  if (!coach || !athlete || athlete.coachId !== coach.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const measurements = await prisma.bodyMeasurement.findMany({
    where: { athleteId: id },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(
    measurements.map((m) => ({
      id: m.id,
      date: m.date.toISOString().split("T")[0],
      weightKg: m.weightKg,
      bodyFatPct: m.bodyFatPct,
      waistCm: m.waistCm,
      hipCm: m.hipCm,
      chestCm: m.chestCm,
      armCm: m.armCm,
      quadCm: m.quadCm,
      calfCm: m.calfCm,
      glutesCm: m.glutesCm,
      neckCm: m.neckCm,
      notes: m.notes,
    }))
  );
}

// POST crear nueva medida
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coach.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const athlete = await prisma.athlete.findUnique({ where: { id }, select: { coachId: true } });

  if (!coach || !athlete || athlete.coachId !== coach.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const m = await prisma.bodyMeasurement.create({
    data: {
      athleteId: id,
      date: body.date ? new Date(body.date) : new Date(),
      weightKg: body.weightKg ? Number(body.weightKg) : null,
      bodyFatPct: body.bodyFatPct ? Number(body.bodyFatPct) : null,
      waistCm: body.waistCm ? Number(body.waistCm) : null,
      hipCm: body.hipCm ? Number(body.hipCm) : null,
      chestCm: body.chestCm ? Number(body.chestCm) : null,
      armCm: body.armCm ? Number(body.armCm) : null,
      quadCm: body.quadCm ? Number(body.quadCm) : null,
      calfCm: body.calfCm ? Number(body.calfCm) : null,
      glutesCm: body.glutesCm ? Number(body.glutesCm) : null,
      neckCm: body.neckCm ? Number(body.neckCm) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json({ ...m, date: m.date.toISOString().split("T")[0] }, { status: 201 });
}
