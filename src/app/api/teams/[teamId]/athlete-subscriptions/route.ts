import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { TeamRole } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validación de entrada
const createAthleteSubscriptionSchema = z.object({
  athleteId: z.string().min(1, 'Athlete ID requerido'),
  teamBillingPlanId: z.string().min(1, 'Plan ID requerido'),
})

type CreateAthleteSubscriptionInput = z.infer<typeof createAthleteSubscriptionSchema>

/**
 * GET /teams/[teamId]/athlete-subscriptions
 * Lista todas las suscripciones de atletas para un equipo
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { teamId } = await params

    // Verificar que el usuario es miembro del equipo y COACH_ADMIN
    const membership = await prisma.teamUserMembership.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: session.user.id!,
        },
      },
    })

    if (!membership || membership.role !== TeamRole.ADMIN) {
      return NextResponse.json({ error: 'No tienes permisos para acceder a esto' }, { status: 403 })
    }

    // Obtener suscripciones de atletas
    const subscriptions = await prisma.athleteSubscription.findMany({
      where: {
        teamBillingPlan: {
          teamId,
        },
      },
      include: {
        athlete: {
          select: {
            id: true,
            fullName: true,
            userId: true,
          },
        },
        teamBillingPlan: {
          select: {
            id: true,
            planName: true,
            maxAthletes: true,
            price: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(subscriptions, { status: 200 })
  } catch (error) {
    console.error('Error en GET athlete-subscriptions:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /teams/[teamId]/athlete-subscriptions
 * Asigna un atleta a un plan (inicia trial de 30 días)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { teamId } = await params

    // Verificar que el usuario es miembro del equipo y COACH_ADMIN
    const membership = await prisma.teamUserMembership.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: session.user.id!,
        },
      },
    })

    if (!membership || membership.role !== TeamRole.ADMIN) {
      return NextResponse.json({ error: 'No tienes permisos para acceder a esto' }, { status: 403 })
    }

    // Validar entrada
    const body = await req.json()
    const validation = createAthleteSubscriptionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', issues: validation.error.issues },
        { status: 422 }
      )
    }

    const { athleteId, teamBillingPlanId } = validation.data

    // Verificar que el atleta existe y pertenece al team
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        teamId,
      },
    })

    if (!athlete) {
      return NextResponse.json(
        { error: 'Atleta no encontrado o no pertenece al equipo' },
        { status: 404 }
      )
    }

    // Verificar que el plan existe y pertenece al team
    const plan = await prisma.teamBillingPlan.findFirst({
      where: {
        id: teamBillingPlanId,
        teamId,
      },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan de facturación no encontrado' }, { status: 404 })
    }

    // Verificar que no existe suscripción activa para este atleta y plan
    const existing = await prisma.athleteSubscription.findUnique({
      where: {
        athleteId_teamBillingPlanId: {
          athleteId,
          teamBillingPlanId,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'El atleta ya está asignado a este plan' }, { status: 409 })
    }

    // Validar maxAthletes: contar atletas ACTIVE en este plan
    if (plan.maxAthletes) {
      const activeCount = await prisma.athleteSubscription.count({
        where: {
          teamBillingPlanId,
          status: 'ACTIVE',
        },
      })

      if (activeCount >= plan.maxAthletes) {
        return NextResponse.json(
          { error: `El plan ha alcanzado el máximo de ${plan.maxAthletes} atletas` },
          { status: 422 }
        )
      }
    }

    // Crear suscripción con trial de 30 días
    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const subscription = await prisma.athleteSubscription.create({
      data: {
        athleteId,
        teamBillingPlanId,
        status: 'ACTIVE',
        trialEndsAt,
        paymentMethod: 'MANUAL',
        manualRenewal: false,
      },
      include: {
        athlete: {
          select: {
            id: true,
            fullName: true,
            userId: true,
          },
        },
        teamBillingPlan: {
          select: {
            id: true,
            planName: true,
            maxAthletes: true,
            price: true,
            currency: true,
          },
        },
      },
    })

    // Generar factura automática
    await prisma.invoice.create({
      data: {
        entityType: 'ATHLETE',
        athleteSubscriptionId: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        status: 'DRAFT',
        dueDate,
        createdByUserId: session.user.id,
      },
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('Error en POST athlete-subscriptions:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
