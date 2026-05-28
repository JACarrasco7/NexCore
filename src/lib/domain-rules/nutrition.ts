import { prisma } from '@/lib/prisma'
import { auditMutation } from '@/lib/api'
import { BusinessError, ErrorCodes } from '@/lib/errors'
import type { NutritionPlan } from '@/lib/domain'

interface CreateNutritionPlanInput {
  athleteId?: string
  coachId?: string
  title: string
  phase?: string
  kcalTarget?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  notes?: string
  meals?: Array<{
    name: string
    time?: string
    order?: number
    foods?: Array<{
      food: string
      quantity?: number
      unit?: string
      kcal?: number
      proteinG?: number
      carbsG?: number
      fatG?: number
      order?: number
      weekNumber?: number
    }>
  }>
}

export async function createNutritionPlan(
  input: CreateNutritionPlanInput,
  userId?: string
): Promise<NutritionPlan> {
  try {
    const created = await prisma.nutritionPlan.create({
      data: {
        athleteId: input.athleteId,
        coachId: input.coachId ?? undefined,
        title: input.title,
        phase: input.phase ?? 'Activo',
        kcalTarget: input.kcalTarget ?? 0,
        proteinG: input.proteinG ?? 0,
        carbsG: input.carbsG ?? 0,
        fatG: input.fatG ?? 0,
        notes: input.notes ?? undefined,
        meals: {
          create: (input.meals || []).map((m, mIndex) => ({
            name: m.name,
            time: m.time ?? '',
            order: m.order ?? mIndex,
            foods: {
              create: (m.foods || []).map((f, fIndex) => ({
                food: f.food,
                quantity: f.quantity ?? 0,
                unit: f.unit ?? 'g',
                kcal: f.kcal ?? undefined,
                proteinG: f.proteinG ?? undefined,
                carbsG: f.carbsG ?? undefined,
                fatG: f.fatG ?? undefined,
                order: f.order ?? fIndex,
                weekNumber: f.weekNumber ?? 1,
              })),
            },
          })),
        },
      },
      include: { meals: { include: { foods: true } } },
    })

    await auditMutation({
      entity: 'NutritionPlan',
      entityId: created.id,
      action: 'CREATE',
      after: created as any,
      userId,
    })

    return created as unknown as NutritionPlan
  } catch (err) {
    console.error('[domain-rules][nutrition] createNutritionPlan error', err)
    throw new BusinessError('No se pudo crear el plan de nutrición', ErrorCodes.INTERNAL_ERROR, 500)
  }
}

export async function updateNutritionPlan(
  planId: string,
  payload: Partial<{
    title: string
    phase: string
    kcalTarget: number
    proteinG: number
    carbsG: number
    fatG: number
    notes: string
    isActive: boolean
  }>,
  userId?: string
) {
  try {
    const before = await prisma.nutritionPlan.findUnique({ where: { id: planId } })
    if (!before)
      throw new BusinessError('Plan de nutrición no encontrado', ErrorCodes.NOT_FOUND, 404)

    const updated = await prisma.nutritionPlan.update({
      where: { id: planId },
      data: payload as any,
    })

    await auditMutation({
      entity: 'NutritionPlan',
      entityId: planId,
      action: 'UPDATE',
      before: before as any,
      after: updated as any,
      userId,
    })

    return updated
  } catch (err) {
    console.error('[domain-rules][nutrition] updateNutritionPlan error', err)
    throw err
  }
}

export async function activateNutritionPlan(planId: string, userId?: string) {
  try {
    const before = await prisma.nutritionPlan.findUnique({ where: { id: planId } })
    if (!before)
      throw new BusinessError('Plan de nutrición no encontrado', ErrorCodes.NOT_FOUND, 404)

    await prisma.$transaction([
      prisma.nutritionPlan.updateMany({
        where: { athleteId: before.athleteId },
        data: { isActive: false },
      }),
      prisma.nutritionPlan.update({ where: { id: planId }, data: { isActive: true } }),
    ])

    const after = await prisma.nutritionPlan.findUnique({
      where: { id: planId },
      include: { meals: { include: { foods: true } } },
    })

    await auditMutation({
      entity: 'NutritionPlan',
      entityId: planId,
      action: 'UPDATE',
      before: before as any,
      after: after as any,
      userId,
    })

    return after as unknown as NutritionPlan
  } catch (err) {
    console.error('[domain-rules][nutrition] activateNutritionPlan error', err)
    throw err
  }
}

export async function archiveNutritionPlan(planId: string, userId?: string) {
  try {
    const before = await prisma.nutritionPlan.findUnique({ where: { id: planId } })
    if (!before)
      throw new BusinessError('Plan de nutrición no encontrado', ErrorCodes.NOT_FOUND, 404)

    const archived = await prisma.nutritionPlan.update({
      where: { id: planId },
      data: { deletedAt: new Date() },
    })

    await auditMutation({
      entity: 'NutritionPlan',
      entityId: planId,
      action: 'DELETE',
      before: before as any,
      userId,
    })

    return archived
  } catch (err) {
    console.error('[domain-rules][nutrition] archiveNutritionPlan error', err)
    throw err
  }
}

export async function duplicateNutritionPlan(
  planId: string,
  targetAthleteId?: string,
  userId?: string
) {
  try {
    const original = await prisma.nutritionPlan.findUnique({
      where: { id: planId },
      include: { meals: { include: { foods: true } } },
    })
    if (!original)
      throw new BusinessError('Plan de nutrición no encontrado', ErrorCodes.NOT_FOUND, 404)

    const created = await prisma.nutritionPlan.create({
      data: {
        athleteId: targetAthleteId ?? original.athleteId,
        coachId: original.coachId ?? undefined,
        title: `${original.title} (copia)`,
        phase: original.phase,
        kcalTarget: original.kcalTarget,
        proteinG: original.proteinG,
        carbsG: original.carbsG,
        fatG: original.fatG,
        notes: original.notes ?? undefined,
        meals: {
          create: (original.meals || []).map((m, mIndex) => ({
            name: m.name,
            time: m.time,
            order: m.order ?? mIndex,
            foods: {
              create: (m.foods || []).map((f, fIndex) => ({
                food: f.food,
                quantity: f.quantity,
                unit: f.unit,
                kcal: f.kcal ?? undefined,
                proteinG: f.proteinG ?? undefined,
                carbsG: f.carbsG ?? undefined,
                fatG: f.fatG ?? undefined,
                order: f.order ?? fIndex,
              })),
            },
          })),
        },
      },
      include: { meals: { include: { foods: true } } },
    })

    await auditMutation({
      entity: 'NutritionPlan',
      entityId: created.id,
      action: 'CREATE',
      after: created as any,
      userId,
    })

    return created as unknown as NutritionPlan
  } catch (err) {
    console.error('[domain-rules][nutrition] duplicateNutritionPlan error', err)
    throw err
  }
}

/**
 * Interpola macros linealmente entre fases
 */
export function interpolateMacros(
  weekNumber: number,
  phases: Array<{
    weekStart: number
    weekEnd: number
    kcalStart: number
    kcalEnd: number
    proteinG: number
    minFatG: number
  }>
): { kcal: number; proteinG: number; fatG: number } | null {
  const phase = phases.find((p) => weekNumber >= p.weekStart && weekNumber <= p.weekEnd)
  if (!phase) return null

  const progress = (weekNumber - phase.weekStart) / (phase.weekEnd - phase.weekStart)
  return {
    kcal: Math.round(phase.kcalStart + (phase.kcalEnd - phase.kcalStart) * progress),
    proteinG: phase.proteinG,
    fatG: phase.minFatG,
  }
}
