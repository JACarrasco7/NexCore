import { prisma } from '@/lib/prisma';
import { auditMutation } from '@/lib/api';
import { BusinessError, ErrorCodes } from '@/lib/errors';
import type { WorkoutSession, TrainingPlan } from '@/lib/domain';

interface CreatePlanInput {
  athleteId: string;
  title: string;
  weekLabel: string;
  sessions: Array<Omit<WorkoutSession, 'id'>>;
}

/**
 * Crea un plan con sesiones y ejercicios (nested create).
 */
export async function createPlan(input: CreatePlanInput, userId?: string): Promise<TrainingPlan> {
  try {
    const created = await prisma.plan.create({
      data: {
        athleteId: input.athleteId,
        title: input.title,
        weekLabel: input.weekLabel,
        sessions: {
          create: input.sessions.map((s, sIndex) => ({
            name: s.name,
            block: s.block ?? 'Bloque importado',
            order: sIndex,
            exercises: {
              create: (s.exercises || []).map((e, eIndex) => ({
                exercise: e.exercise,
                sets: e.sets,
                reps: String(e.reps),
                targetRir: e.targetRir ?? undefined,
                restSeconds: e.restSeconds ?? undefined,
                notes: e.notes ?? undefined,
                technique: e.technique ?? undefined,
                techniqueDetail: e.techniqueDetail ?? undefined,
                loadKg: e.loadKg ?? undefined,
                loadNote: e.loadNote ?? undefined,
                tempoEcc: e.tempoEcc ?? undefined,
                tempoPause: e.tempoPause ?? undefined,
                tempoConc: e.tempoConc ?? undefined,
                coachCue: e.coachCue ?? undefined,
                progressionNote: e.progressionNote ?? undefined,
                videoUrl: e.videoUrl ?? undefined,
                order: eIndex,
              })),
            },
          })),
        },
      },
      include: { sessions: { include: { exercises: true } } },
    });

    await auditMutation({
      entity: 'Plan',
      entityId: created.id,
      action: 'CREATE',
      after: created,
      userId,
    });

    // Map to domain type shape (simplified)
    return created as unknown as TrainingPlan;
  } catch (err) {
    console.error('[domain-rules][training] createPlan error', err);
    throw new BusinessError('No se pudo crear el plan', ErrorCodes.INTERNAL_ERROR, 500);
  }
}

export async function updatePlan(planId: string, payload: Partial<{ title: string; weekLabel: string }>, userId?: string) {
  try {
    const before = await prisma.plan.findUnique({ where: { id: planId } });
    if (!before) throw new BusinessError('Plan no encontrado', ErrorCodes.NOT_FOUND, 404);

    const updated = await prisma.plan.update({ where: { id: planId }, data: payload });

    await auditMutation({ entity: 'Plan', entityId: planId, action: 'UPDATE', before: before as any, after: updated as any, userId });

    return updated;
  } catch (err) {
    console.error('[domain-rules][training] updatePlan error', err);
    throw err;
  }
}

export async function archivePlan(planId: string, userId?: string) {
  try {
    const before = await prisma.plan.findUnique({ where: { id: planId } });
    if (!before) throw new BusinessError('Plan no encontrado', ErrorCodes.NOT_FOUND, 404);

    const archived = await prisma.plan.update({ where: { id: planId }, data: { deletedAt: new Date() } });

    await auditMutation({ entity: 'Plan', entityId: planId, action: 'DELETE', before: before as any, userId });

    return archived;
  } catch (err) {
    console.error('[domain-rules][training] archivePlan error', err);
    throw err;
  }
}

export async function duplicatePlan(planId: string, targetAthleteId?: string, userId?: string) {
  try {
    const original = await prisma.plan.findUnique({
      where: { id: planId },
      include: { sessions: { include: { exercises: true } } },
    });
    if (!original) throw new BusinessError('Plan no encontrado', ErrorCodes.NOT_FOUND, 404);

    const created = await prisma.plan.create({
      data: {
        athleteId: targetAthleteId ?? original.athleteId,
        title: `${original.title} (copia)`,
        weekLabel: original.weekLabel,
        sessions: {
          create: (original.sessions || []).map((s, sIndex) => ({
            name: s.name,
            block: s.block,
            order: sIndex,
            exercises: {
              create: (s.exercises || []).map((e, eIndex) => ({
                exercise: e.exercise,
                sets: e.sets,
                reps: e.reps,
                targetRir: e.targetRir ?? undefined,
                restSeconds: e.restSeconds ?? undefined,
                notes: e.notes ?? undefined,
                technique: e.technique ?? undefined,
                techniqueDetail: e.techniqueDetail ?? undefined,
                loadKg: e.loadKg ?? undefined,
                loadNote: e.loadNote ?? undefined,
                tempoEcc: e.tempoEcc ?? undefined,
                tempoPause: e.tempoPause ?? undefined,
                tempoConc: e.tempoConc ?? undefined,
                coachCue: e.coachCue ?? undefined,
                progressionNote: e.progressionNote ?? undefined,
                videoUrl: e.videoUrl ?? undefined,
                order: eIndex,
              })),
            },
          })),
        },
      },
      include: { sessions: { include: { exercises: true } } },
    });

    await auditMutation({ entity: 'Plan', entityId: created.id, action: 'CREATE', after: created as any, userId });

    return created as unknown as TrainingPlan;
  } catch (err) {
    console.error('[domain-rules][training] duplicatePlan error', err);
    throw err;
  }
}
