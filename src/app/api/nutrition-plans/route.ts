import { apiHandler } from '@/lib/api/api-handler'
import { prisma } from '@/lib/prisma'
import { assertAthleteAccess, assertCoachOwnsAthlete } from '@/lib/api'
import { nutritionPlanSchema } from '@/lib/validators'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { nutritionService } from '@/lib/services/nutrition'

export const GET = apiHandler({
  auth: 'session',
  handler: async ({ req, session }) => {
    const { searchParams } = new URL(req.url)
    const athleteId = searchParams.get('athleteId')

    const userId = (session.user as { id: string }).id
    const role = (session.user as { role: string }).role

    let resolvedAthleteId = athleteId

    if (!resolvedAthleteId && role === 'ATHLETE') {
      const athlete = await prisma.athlete.findFirst({ where: { userId }, select: { id: true } })
      resolvedAthleteId = athlete?.id ?? null
    }

    if (!resolvedAthleteId) {
      throw new Error('athleteId required')
    }

    await assertAthleteAccess(resolvedAthleteId)

    const plans = await prisma.nutritionPlan.findMany({
      where: { athleteId: resolvedAthleteId, deletedAt: null },
      include: {
        meals: {
          orderBy: { order: 'asc' },
          include: { foods: { orderBy: { order: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return plans
  },
})

export const POST = apiHandler({
  auth: 'coach',
  handler: async ({ req, session }) => {
    const parseResult = await parseJsonOrError(req)
    if (!parseResult.ok) return parseResult.error

    const parsed = nutritionPlanSchema.safeParse(parseResult.data)
    if (!parsed.success) {
      return { error: 'Datos inválidos', details: parsed.error.flatten() } as any
    }

    const body = parsed.data

    // Verify coach exists
    const userId = (session.user as { id: string }).id
    const coach = await prisma.coach.findFirst({ where: { userId } })
    if (!coach) throw new Error('Coach not found')

    // Verify athlete ownership if athleteId provided
    if (body.athleteId) {
      await assertCoachOwnsAthlete(body.athleteId)
    }

    // Normalize null -> undefined to match service input types
    const normalizedMeals = (body.meals || []).map((m: any, mIndex: number) => ({
      name: m.name,
      time: m.time ?? '',
      order: m.order ?? mIndex,
      foods: (m.foods || []).map((f: any, fIndex: number) => ({
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
    }))

    const created = await nutritionService.createPlan(
      {
        athleteId: body.athleteId,
        coachId: coach.id,
        title: body.title,
        phase: body.phase,
        kcalTarget: body.kcalTarget ?? 0,
        proteinG: body.proteinG ?? undefined,
        carbsG: body.carbsG ?? undefined,
        fatG: body.fatG ?? undefined,
        notes: body.notes ?? undefined,
        meals: normalizedMeals,
      },
      userId
    )

    return created
  },
})
