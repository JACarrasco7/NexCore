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

async function getExerciseSession(eid: string) {
  return prisma.exercisePrescription.findUnique({
    where: { id: eid },
    select: { sessionId: true },
  });
}

/** PATCH /api/plans/[id]/sessions/[sid]/exercises/[eid] */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; sid: string; eid: string }> }
) {
  const { id, sid, eid } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManagePlan(coachId, id))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const ex = await getExerciseSession(eid);
  if (!ex || ex.sessionId !== sid) return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.exercisePrescription.update({
    where: { id: eid },
    data: {
      ...(body.exercise !== undefined && { exercise: body.exercise }),
      ...(body.sets !== undefined && { sets: body.sets }),
      ...(body.reps !== undefined && { reps: body.reps }),
      ...(body.targetRir !== undefined && { targetRir: body.targetRir }),
      ...(body.restSeconds !== undefined && { restSeconds: body.restSeconds }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.technique !== undefined && { technique: body.technique }),
      ...(body.techniqueDetail !== undefined && { techniqueDetail: body.techniqueDetail }),
      ...(body.loadKg !== undefined && { loadKg: body.loadKg }),
      ...(body.loadNote !== undefined && { loadNote: body.loadNote }),
      ...(body.tempoEcc !== undefined && { tempoEcc: body.tempoEcc }),
      ...(body.tempoPause !== undefined && { tempoPause: body.tempoPause }),
      ...(body.tempoConc !== undefined && { tempoConc: body.tempoConc }),
      ...(body.coachCue !== undefined && { coachCue: body.coachCue }),
      ...(body.progressionNote !== undefined && { progressionNote: body.progressionNote }),
      ...(body.videoUrl !== undefined && { videoUrl: body.videoUrl }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });

  return NextResponse.json(updated);
}

/** DELETE /api/plans/[id]/sessions/[sid]/exercises/[eid] */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; sid: string; eid: string }> }
) {
  const { id, sid, eid } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManagePlan(coachId, id))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const ex = await getExerciseSession(eid);
  if (!ex || ex.sessionId !== sid) return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });

  await prisma.exercisePrescription.delete({ where: { id: eid } });
  return NextResponse.json({ ok: true });
}
