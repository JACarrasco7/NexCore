import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { assertAthleteAccess, assertCoachOwnsAthlete, auditMutation } from "@/lib/api";
import { planSchema } from "@/lib/validators";
import type { TrainingPlan } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const athleteId = searchParams.get("athleteId") ?? undefined;

  if (!athleteId) return NextResponse.json({ error: "athleteId requerido" }, { status: 400 });

  try {
    await assertAthleteAccess(athleteId);
  } catch {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const plans = await prisma.plan.findMany({
    where: { athleteId, deletedAt: null },
    include: { sessions: { include: { exercises: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  const mapped: TrainingPlan[] = plans.map((p) => ({
    id: p.id,
    athleteId: p.athleteId,
    title: p.title,
    weekLabel: p.weekLabel,
    sessions: p.sessions.map((s) => ({
      id: s.id,
      name: s.name,
      block: s.block,
      exercises: s.exercises.map((e) => ({
        exercise:        e.exercise,
        sets:            e.sets,
        reps:            e.reps,
        targetRir:       e.targetRir        ?? undefined,
        restSeconds:     e.restSeconds      ?? undefined,
        notes:           e.notes            ?? undefined,
        technique:       e.technique        ?? undefined,
        techniqueDetail: e.techniqueDetail  ?? undefined,
        loadKg:          e.loadKg           ?? undefined,
        loadNote:        e.loadNote         ?? undefined,
        tempoEcc:        e.tempoEcc         ?? undefined,
        tempoPause:      e.tempoPause       ?? undefined,
        tempoConc:       e.tempoConc        ?? undefined,
        coachCue:        e.coachCue         ?? undefined,
        progressionNote: e.progressionNote  ?? undefined,
        videoUrl:        e.videoUrl         ?? undefined,
      })),
    })),
  }));
  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let rawBody: unknown;
  try { rawBody = await request.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = planSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 });
  }
  const body = parsed.data;

  try {
    await assertCoachOwnsAthlete(body.athleteId);
  } catch {
    return NextResponse.json({ error: "Sin acceso al atleta" }, { status: 403 });
  }

  const coach = await prisma.coach.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!coach) return NextResponse.json({ error: "Coach no encontrado" }, { status: 403 });

  const plan = await prisma.$transaction(async (tx) => {
    return tx.plan.create({
      data: {
        athleteId: body.athleteId,
        coachId: coach.id,
        title: body.title,
        weekLabel: body.weekLabel,
        sessions: {
          create: body.sessions.map((s, si) => ({
            name: s.name,
            block: s.block ?? "",
            order: s.order ?? si,
            exercises: {
              create: s.exercises.map((e, ei) => ({
                exercise:        e.exercise,
                sets:            e.sets,
                reps:            e.reps,
                targetRir:       e.targetRir,
                restSeconds:     e.restSeconds,
                notes:           e.notes,
                technique:       e.technique,
                techniqueDetail: e.techniqueDetail,
                loadKg:          e.loadKg,
                loadNote:        e.loadNote,
                tempoEcc:        e.tempoEcc,
                tempoPause:      e.tempoPause,
                tempoConc:       e.tempoConc,
                coachCue:        e.coachCue,
                progressionNote: e.progressionNote,
                videoUrl:        e.videoUrl ?? null,
                order:           e.order ?? ei,
              })),
            },
          })),
        },
      },
      include: { sessions: { include: { exercises: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
    });
  });

  await auditMutation({
    entity: "Plan",
    entityId: plan.id,
    action: "CREATE",
    after: { athleteId: plan.athleteId, title: plan.title },
    userId: session.user.id,
  });

  return NextResponse.json({
    id: plan.id,
    athleteId: plan.athleteId,
    title: plan.title,
    weekLabel: plan.weekLabel,
    sessions: plan.sessions.map((s) => ({
      id: s.id,
      name: s.name,
      block: s.block,
      exercises: s.exercises.map((e) => ({
        exercise:        e.exercise,
        sets:            e.sets,
        reps:            e.reps,
        targetRir:       e.targetRir        ?? undefined,
        restSeconds:     e.restSeconds      ?? undefined,
        notes:           e.notes            ?? undefined,
        technique:       e.technique        ?? undefined,
        techniqueDetail: e.techniqueDetail  ?? undefined,
        loadKg:          e.loadKg           ?? undefined,
        loadNote:        e.loadNote         ?? undefined,
        tempoEcc:        e.tempoEcc         ?? undefined,
        tempoPause:      e.tempoPause       ?? undefined,
        tempoConc:       e.tempoConc        ?? undefined,
        coachCue:        e.coachCue         ?? undefined,
        progressionNote: e.progressionNote  ?? undefined,
        videoUrl:        e.videoUrl         ?? undefined,
      })),
    })),
  }, { status: 201 });
}
