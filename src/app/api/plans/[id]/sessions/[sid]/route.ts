import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function getCoachId(userId: string) {
  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  return coach?.id ?? null;
}

async function canManagePlan(coachId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { coachId: true } });
  return plan?.coachId === coachId;
}

/** PATCH /api/plans/[id]/sessions/[sid] — editar sesión */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { id, sid } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManagePlan(coachId, id))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  // Verificar que la sesión pertenece al plan
  const existing = await prisma.workoutSession.findUnique({ where: { id: sid }, select: { planId: true } });
  if (!existing || existing.planId !== id) return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });

  const body: { name?: string; block?: string; order?: number } = await req.json();
  const updated = await prisma.workoutSession.update({
    where: { id: sid },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.block !== undefined && { block: body.block }),
      ...(body.order !== undefined && { order: body.order }),
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(updated);
}

/** DELETE /api/plans/[id]/sessions/[sid] — eliminar sesión */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { id, sid } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManagePlan(coachId, id))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const existing = await prisma.workoutSession.findUnique({ where: { id: sid }, select: { planId: true } });
  if (!existing || existing.planId !== id) return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });

  await prisma.workoutSession.delete({ where: { id: sid } });
  return NextResponse.json({ ok: true });
}

/** POST /api/plans/[id]/sessions/[sid] — añadir ejercicio a la sesión */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { id, sid } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManagePlan(coachId, id))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const existing = await prisma.workoutSession.findUnique({ where: { id: sid }, select: { planId: true } });
  if (!existing || existing.planId !== id) return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });

  const count = await prisma.exercisePrescription.count({ where: { sessionId: sid } });
  const body = await req.json();

  const ex = await prisma.exercisePrescription.create({
    data: {
      sessionId: sid,
      exercise: body.exercise ?? "Nuevo ejercicio",
      sets: body.sets ?? 3,
      reps: body.reps ?? "8-10",
      targetRir: body.targetRir,
      restSeconds: body.restSeconds,
      notes: body.notes,
      technique: body.technique,
      techniqueDetail: body.techniqueDetail,
      loadKg: body.loadKg,
      loadNote: body.loadNote,
      tempoEcc: body.tempoEcc,
      tempoPause: body.tempoPause,
      tempoConc: body.tempoConc,
      coachCue: body.coachCue,
      progressionNote: body.progressionNote,
      videoUrl: body.videoUrl,
      order: count,
    },
  });

  return NextResponse.json(ex, { status: 201 });
}
