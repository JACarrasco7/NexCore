import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/plans/[id]/save-as-template
 * Crea una TrainingTemplate a partir de un Plan existente.
 * Body: { name: string; description?: string; splitType?: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!coach) return NextResponse.json({ error: "No es coach" }, { status: 403 });

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  if (plan.coachId !== coach.id) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const body: { name?: string; description?: string; splitType?: string } = await req.json().catch(() => ({}));
  const name = body.name?.trim() || plan.title;

  const payload = {
    sessions: plan.sessions.map((s) => ({
      name: s.name,
      block: s.block,
      exercises: s.exercises.map((e) => ({
        exercise: e.exercise,
        sets: e.sets,
        reps: e.reps,
        targetRir: e.targetRir,
        restSeconds: e.restSeconds,
        notes: e.notes,
        technique: e.technique,
        techniqueDetail: e.techniqueDetail,
        loadKg: e.loadKg,
        loadNote: e.loadNote,
        tempoEcc: e.tempoEcc,
        tempoPause: e.tempoPause,
        tempoConc: e.tempoConc,
        coachCue: e.coachCue,
        progressionNote: e.progressionNote,
        videoUrl: e.videoUrl,
      })),
    })),
  };

  const template = await prisma.trainingTemplate.create({
    data: {
      coachId: coach.id,
      name,
      description: body.description ?? null,
      splitType: body.splitType ?? null,
      payload,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
