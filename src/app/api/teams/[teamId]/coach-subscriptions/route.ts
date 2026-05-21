import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { TeamRole } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validación de entrada
const createCoachSubscriptionSchema = z.object({
  teamBillingPlanId: z.string().min(1, 'Plan ID requerido'),
})

type CreateCoachSubscriptionInput = z.infer<typeof createCoachSubscriptionSchema>

/**
 * GET /teams/[teamId]/coach-subscriptions
 * Lista todas las suscripciones de coach para un equipo
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

    // Obtener suscripciones del coach
    const subscriptions = await prisma.coachSubscription.findMany({
      where: { teamId },
      include: {
        teamBillingPlan: {
          select: {
            id: true,
            planName: true,
            description: true,
            price: true,
            currency: true,
            billingCycle: true,
            maxAthletes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(subscriptions, { status: 200 })
  } catch (error) {
    console.error('Error en GET coach-subscriptions:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /teams/[teamId]/coach-subscriptions
 * Crea una nueva suscripción de coach (inicia trial de 30 días)
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
    const validation = createCoachSubscriptionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', issues: validation.error.issues },
        { status: 422 }
      )
    }

    const { teamBillingPlanId } = validation.data

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

    // Verificar que no existe suscripción activa para este plan
    const existing = await prisma.coachSubscription.findUnique({
      where: {
        teamId_teamBillingPlanId: {
          teamId,
          teamBillingPlanId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una suscripción activa para este plan' },
        { status: 409 }
      )
    }

    // Crear suscripción con trial de 30 días
    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const subscription = await prisma.coachSubscription.create({
      data: {
        teamId,
        teamBillingPlanId,
        status: 'TRIAL',
        trialEndsAt,
        autoRenewal: true,
      },
      include: {
        teamBillingPlan: {
          select: {
            id: true,
            planName: true,
            description: true,
            price: true,
            currency: true,
            billingCycle: true,
            maxAthletes: true,
          },
        },
      },
    })

    // Generar factura automática
    await prisma.invoice.create({
      data: {
        entityType: 'COACH',
        coachSubscriptionId: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        status: 'DRAFT',
        dueDate,
        createdByUserId: session.user.id,
      },
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('Error en POST coach-subscriptions:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
