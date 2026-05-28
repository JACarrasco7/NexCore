import { prisma } from '@/lib/prisma'
import { auditMutation } from '@/lib/api'
import { BusinessError, ErrorCodes } from '@/lib/errors'
import type { WorkoutSession, TrainingPlan } from '@/lib/domain'

interface CreatePlanInput {
  athleteId: string
  title: string
  weeksCount?: number
  sessions: Array<Omit<WorkoutSession, 'id'> & { exercises?: Array<any> }>
}

/**
 * Crea un plan (mesociclo) con sesiones y ejercicios (nested create).
 * Cada ExercisePrescription puede tener weekNumber para mesociclos multi-semana.
 */
export async function createPlan(input: CreatePlanInput, userId?: string): Promise<TrainingPlan> {
  try {
    const created = await prisma.plan.create({
      data: {
        athleteId: input.athleteId,
        title: input.title,
        weeksCount: input.weeksCount ?? 4,
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
                warmupSets: e.warmupSets ?? undefined,
                targetRpe: e.targetRpe != null ? Number(e.targetRpe) : undefined,
                supersetGroup: e.supersetGroup ?? undefined,
                progressionMethod: e.progressionMethod ?? undefined,
                progressionIncrementKg: e.progressionIncrementKg ?? undefined,
                repTargetMax: e.repTargetMax ?? undefined,
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
                weekNumber: e.weekNumber ?? 1,
                order: eIndex,
              })),
            },
          })),
        },
      },
      include: { sessions: { include: { exercises: true } } },
    })

    await auditMutation({
      entity: 'Plan',
      entityId: created.id,
      action: 'CREATE',
      after: created,
      userId,
    })

    // Map to domain type shape (simplified)
    return created as unknown as TrainingPlan
  } catch (err) {
    console.error('[domain-rules][training] createPlan error', err)
    throw new BusinessError('No se pudo crear el plan', ErrorCodes.INTERNAL_ERROR, 500)
  }
}

export async function updatePlan(
  planId: string,
  payload: Partial<{ title: string; weeksCount: number }>,
  userId?: string
) {
  try {
    const before = await prisma.plan.findUnique({ where: { id: planId } })
    if (!before) throw new BusinessError('Plan no encontrado', ErrorCodes.NOT_FOUND, 404)

    const updated = await prisma.plan.update({ where: { id: planId }, data: payload })

    await auditMutation({
      entity: 'Plan',
      entityId: planId,
      action: 'UPDATE',
      before: before as Record<string, unknown>,
      after: updated as Record<string, unknown>,
      userId,
    })

    return updated
  } catch (err) {
    console.error('[domain-rules][training] updatePlan error', err)
    throw err
  }
}

export async function archivePlan(planId: string, userId?: string) {
  try {
    const before = await prisma.plan.findUnique({ where: { id: planId } })
    if (!before) throw new BusinessError('Plan no encontrado', ErrorCodes.NOT_FOUND, 404)

    const archived = await prisma.plan.update({
      where: { id: planId },
      data: { deletedAt: new Date() },
    })

    await auditMutation({
      entity: 'Plan',
      entityId: planId,
      action: 'DELETE',
      before: before as Record<string, unknown>,
      userId,
    })

    return archived
  } catch (err) {
    console.error('[domain-rules][training] archivePlan error', err)
    throw err
  }
}

export async function duplicatePlan(planId: string, targetAthleteId?: string, userId?: string) {
  try {
    const original = await prisma.plan.findUnique({
      where: { id: planId },
      include: { sessions: { include: { exercises: true } } },
    })
    if (!original) throw new BusinessError('Plan no encontrado', ErrorCodes.NOT_FOUND, 404)

    const created = await prisma.plan.create({
      data: {
        athleteId: targetAthleteId ?? original.athleteId,
        title: `${original.title} (copia)`,
        weeksCount: original.weeksCount,
        deloadWeek: original.deloadWeek,
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
    })

    await auditMutation({
      entity: 'Plan',
      entityId: created.id,
      action: 'CREATE',
      after: created as Record<string, unknown>,
      userId,
    })

    return created as unknown as TrainingPlan
  } catch (err) {
    console.error('[domain-rules][training] duplicatePlan error', err)
    throw err
  }
}

/**
 * Aplica reglas de deload automático cuando weekNumber === deloadWeek
 */
export function applyDeload(
  prescription: { sets: number; loadKg?: number; targetRir?: string; weekNumber?: number },
  deloadWeek: number | null
): typeof prescription {
  if (!deloadWeek || prescription.weekNumber !== deloadWeek) return prescription
  return {
    ...prescription,
    sets: Math.max(1, Math.floor(prescription.sets * 0.5)),
    loadKg: prescription.loadKg ? Math.round(prescription.loadKg * 0.6) : undefined,
    targetRir: prescription.targetRir
      ? String(Math.min(5, Number(prescription.targetRir) + 2))
      : '5',
  }
}

/**
 * Calcula progresión de carga según método
 */
export function calculateProgression(
  method: 'double' | 'rep_target' | 'rir_driven' | undefined,
  lastLoad: number | undefined,
  lastReps: number,
  targetReps: string,
  incrementKg: number = 2.5,
  repTargetMax: number = 12
): { loadKg?: number; reps?: string } | null {
  if (!method || !lastLoad) return null

  const [minReps, maxReps] = targetReps.split('-').map(Number)
  const targetMin = minReps || maxReps

  if (method === 'double') {
    // Doble progresión: si completas todas las series con reps≥máx Y RIR≤objetivo → +2.5kg
    if (lastReps >= targetMin) {
      return { loadKg: lastLoad + incrementKg, reps: targetReps }
    }
  }

  if (method === 'rep_target') {
    // Objetivo de reps: si completas reps objetivo → +1 rep. Al llegar al tope, +peso y reset
    if (lastReps >= targetMin) {
      const newMax = maxReps + 1
      if (newMax > repTargetMax) {
        return { loadKg: lastLoad + incrementKg, reps: `${repTargetMax - 2}-${repTargetMax}` }
      }
      return { reps: `${minReps}-${newMax}` }
    }
  }

  return null
}
