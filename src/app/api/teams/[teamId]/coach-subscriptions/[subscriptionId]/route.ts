import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { TeamRole } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validación de entrada
const updateCoachSubscriptionSchema = z.object({
  autoRenewal: z.boolean().optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).optional(),
})

type UpdateCoachSubscriptionInput = z.infer<typeof updateCoachSubscriptionSchema>

/**
 * GET /teams/[teamId]/coach-subscriptions/[subscriptionId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; subscriptionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { teamId, subscriptionId } = await params

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

    const subscription = await prisma.coachSubscription.findFirst({
      where: {
        id: subscriptionId,
        teamId,
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

    if (!subscription) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    return NextResponse.json(subscription, { status: 200 })
  } catch (error) {
    console.error('Error en GET coach-subscription:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PUT /teams/[teamId]/coach-subscriptions/[subscriptionId]
 * Actualiza una suscripción de coach
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; subscriptionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { teamId, subscriptionId } = await params

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
    const validation = updateCoachSubscriptionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', issues: validation.error.issues },
        { status: 422 }
      )
    }

    // Verificar que la suscripción existe
    const existing = await prisma.coachSubscription.findFirst({
      where: {
        id: subscriptionId,
        teamId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    const updated = await prisma.coachSubscription.update({
      where: { id: subscriptionId },
      data: validation.data,
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

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('Error en PUT coach-subscription:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /teams/[teamId]/coach-subscriptions/[subscriptionId]
 * Cancela una suscripción de coach
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; subscriptionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { teamId, subscriptionId } = await params

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

    // Verificar que la suscripción existe
    const existing = await prisma.coachSubscription.findFirst({
      where: {
        id: subscriptionId,
        teamId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    await prisma.coachSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })

    return NextResponse.json(null, { status: 204 })
  } catch (error) {
    console.error('Error en DELETE coach-subscription:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
