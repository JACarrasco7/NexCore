import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, forbidden, notFound, badRequest } from '@/lib/api/error-response'

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
  if (!session?.user?.id) return unauthorized('No autenticado')

  const coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!coach) return forbidden('No es coach')

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!plan) return notFound('Plan no encontrado')
  if (plan.coachId !== coach.id) return forbidden('Sin acceso')

  const parsed = await parseJsonOrError(req)
  if (!parsed.ok) return parsed.error
  const body: { name?: string; description?: string; splitType?: string } = parsed.data as any
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
