import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Goal, Coach, VerificationMethod } from '@prisma/client'
import { onboardingAthleteSchema, planSchema, nutritionPlanSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = onboardingAthleteSchema.safeParse(await req.json())
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json({ error: firstError.message }, { status: 400 })
    }

    const {
      fullName,
      goal,
      coachEmail,
      weightKg,
      phone,
      contactEmail,
      coachId,
      teamId,
      verificationMethod,
    } = parsed.data

    // Atleta debe tener al menos email o teléfono para contacto
    if (!contactEmail?.trim() && !phone?.trim()) {
      return NextResponse.json(
        { error: 'Email o teléfono requerido para contacto' },
        { status: 400 }
      )
    }

    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    })
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { id: true, email: true },
      })
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Sesión desactualizada. Cierra sesión y vuelve a entrar.' },
        { status: 401 }
      )
    }

    let coach: Coach | null = null

    // 1. Si se envía coachId, usarlo directamente
    if (coachId?.trim()) {
      coach = await prisma.coach.findUnique({ where: { id: coachId } })
      if (!coach) {
        return NextResponse.json({ error: 'Coach no encontrado' }, { status: 404 })
      }
    }
    // 2. Si se envía coachEmail, buscar por email
    else if (coachEmail?.trim()) {
      const coachUser = await prisma.user.findUnique({
        where: { email: coachEmail.trim().toLowerCase() },
        select: { id: true, role: true },
      })
      if (!coachUser || coachUser.role !== 'COACH') {
        return NextResponse.json(
          { error: 'No se encontró un coach con ese email' },
          { status: 404 }
        )
      }

      coach = await prisma.coach.findUnique({ where: { userId: coachUser.id } })
      if (!coach) {
        // Crear coach profile si no existe (puede pasar tras seed manual)
        coach = await prisma.coach.create({
          data: {
            userId: coachUser.id,
            displayName: 'Coach',
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
          },
        })
      }
    } else {
      return NextResponse.json({ error: 'Coach requerido (coachId o coachEmail)' }, { status: 400 })
    }

    // Resolver teamId basado en las membresías del coach
    const coachMemberships = await prisma.teamUserMembership.findMany({
      where: { userId: coach.userId, isActive: true },
      select: { teamId: true },
      orderBy: { createdAt: 'asc' },
    })

    let resolvedTeamId: string | null = null

    if (coachMemberships.length === 0) {
      return NextResponse.json(
        {
          error: 'El coach no tiene equipos asignados. No se puede asignar un atleta.',
        },
        { status: 400 }
      )
    } else if (coachMemberships.length === 1) {
      // Si el coach tiene un solo equipo, usarlo automáticamente
      resolvedTeamId = coachMemberships[0].teamId
    } else {
      // Si el coach tiene múltiples equipos, se requiere teamId explícito
      if (!teamId) {
        return NextResponse.json(
          {
            error: 'El coach está en múltiples equipos. Se requiere teamId.',
            allowedTeams: coachMemberships.map((m) => m.teamId),
          },
          { status: 400 }
        )
      }

      // Validar que teamId es válido
      const validTeam = coachMemberships.find((m) => m.teamId === teamId)
      if (!validTeam) {
        return NextResponse.json(
          {
            error: 'El coach no es miembro del equipo especificado',
          },
          { status: 403 }
        )
      }

      resolvedTeamId = teamId
    }

    const existing = await prisma.athlete.findUnique({ where: { userId: user.id } })
    if (existing) {
      return NextResponse.json({ id: existing.id, alreadyExists: true })
    }

    const goalEnum: Goal =
      goal === 'DEFINICION'
        ? Goal.DEFINICION
        : goal === 'MANTENIMIENTO'
          ? Goal.MANTENIMIENTO
          : goal === 'PEAK_WEEK'
            ? Goal.PEAK_WEEK
            : Goal.VOLUMEN

    // Determinar método de verificación (default EMAIL)
    const verMethod: VerificationMethod =
      verificationMethod === 'SMS' ? VerificationMethod.SMS : VerificationMethod.EMAIL

    // Usar transacción para atomicidad: verificar coach, crear atleta, actualizar user
    const athlete = await prisma.$transaction(async (tx) => {
      // Re-validar que el coach sigue existiendo (prevenir race condition)
      const coachExists = await tx.coach.findUnique({
        where: { id: coach.id },
        select: { id: true },
      })
      if (!coachExists) {
        throw new Error('Coach no encontrado. Intenta nuevamente.')
      }

      // Re-validar que el atleta no existe aún
      const existingAthleteInTx = await tx.athlete.findUnique({ where: { userId: user.id } })
      if (existingAthleteInTx) {
        throw new Error('El perfil de atleta ya existe.')
      }

      const newAthlete = await tx.athlete.create({
        data: {
          userId: user.id,
          coachId: coach.id,
          teamId: resolvedTeamId,
          fullName: fullName.trim(),
          goal: goalEnum,
          phaseLabel: weightKg ? `Inicio — ${weightKg} kg` : 'Semana 1',
          phone: phone?.trim() || null,
          contactEmail: contactEmail?.trim() || null,
          verificationMethod: verMethod,
          phoneVerified: verificationMethod === 'SMS' ? true : false,
        },
      })

      await tx.user.update({
        where: { id: user.id },
        data: { name: fullName.trim() },
      })

      // Crear plan de entrenamiento inicial
      const createdPlan = await tx.plan.create({
        data: {
          athleteId: newAthlete.id,
          title: 'Semana 1 - Inicio',
          weekLabel: 'Semana 1',
          sessions: {
            create: [
              {
                name: 'Día 1 - Full Body',
                order: 0,
                exercises: {
                  create: [
                    { exercise: 'Sentadilla', sets: 3, reps: '8-10', order: 0 },
                    { exercise: 'Press de banca', sets: 3, reps: '8-10', order: 1 },
                    { exercise: 'Remo', sets: 3, reps: '8-10', order: 2 },
                  ],
                },
              },
              {
                name: 'Día 2 - Full Body',
                order: 1,
                exercises: {
                  create: [
                    { exercise: 'Peso muerto', sets: 3, reps: '6-8', order: 0 },
                    { exercise: 'Dominadas', sets: 3, reps: '6-8', order: 1 },
                    { exercise: 'Press militar', sets: 3, reps: '8-10', order: 2 },
                  ],
                },
              },
            ],
          },
        },
      })

      // Crear plan de nutrición inicial
      const createdNutritionPlan = await tx.nutritionPlan.create({
        data: {
          athleteId: newAthlete.id,
          title: 'Plan Inicial',
          phase: 'Mantenimiento',
          kcalTarget: 2000,
          proteinG: 150,
          carbsG: 200,
          fatG: 70,
          meals: {
            create: [
              {
                name: 'Desayuno',
                time: '08:00',
                order: 0,
                foods: {
                  create: [
                    {
                      food: 'Avena',
                      quantity: 50,
                      unit: 'g',
                      kcal: 190,
                      proteinG: 7,
                      carbsG: 33,
                      fatG: 3,
                      order: 0,
                    },
                    {
                      food: 'Huevo',
                      quantity: 2,
                      unit: 'unidad',
                      kcal: 140,
                      proteinG: 12,
                      carbsG: 1,
                      fatG: 10,
                      order: 1,
                    },
                  ],
                },
              },
              {
                name: 'Comida',
                time: '13:00',
                order: 1,
                foods: {
                  create: [
                    {
                      food: 'Pollo',
                      quantity: 150,
                      unit: 'g',
                      kcal: 250,
                      proteinG: 30,
                      carbsG: 0,
                      fatG: 15,
                      order: 0,
                    },
                    {
                      food: 'Arroz',
                      quantity: 100,
                      unit: 'g',
                      kcal: 130,
                      proteinG: 3,
                      carbsG: 28,
                      fatG: 0,
                      order: 1,
                    },
                  ],
                },
              },
              {
                name: 'Cena',
                time: '20:00',
                order: 2,
                foods: {
                  create: [
                    {
                      food: 'Pescado',
                      quantity: 150,
                      unit: 'g',
                      kcal: 200,
                      proteinG: 25,
                      carbsG: 0,
                      fatG: 12,
                      order: 0,
                    },
                    {
                      food: 'Ensalada',
                      quantity: 100,
                      unit: 'g',
                      kcal: 20,
                      proteinG: 1,
                      carbsG: 4,
                      fatG: 0,
                      order: 1,
                    },
                  ],
                },
              },
            ],
          },
        },
      })

      return {
        athlete: newAthlete,
        planId: createdPlan.id,
        nutritionPlanId: createdNutritionPlan.id,
      }
    })

    return NextResponse.json(
      {
        id: athlete.athlete.id,
        coachId: coach.id,
        teamId: resolvedTeamId,
        planId: athlete.planId,
        nutritionPlanId: athlete.nutritionPlanId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('onboarding/athlete POST failed', error)
    return NextResponse.json(
      { error: 'Error interno al guardar onboarding de atleta' },
      { status: 500 }
    )
  }
}
