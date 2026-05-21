import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { TeamRole } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validación de entrada
const updateAthleteSubscriptionSchema = z.object({
  paymentMethod: z.enum(['MANUAL', 'STRIPE', 'CASH']).optional(),
  manualRenewal: z.boolean().optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'INACTIVE', 'CANCELED']).optional(),
})

type UpdateAthleteSubscriptionInput = z.infer<typeof updateAthleteSubscriptionSchema>

/**
 * GET /teams/[teamId]/athlete-subscriptions/[subscriptionId]
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

    const subscription = await prisma.athleteSubscription.findFirst({
      where: {
        id: subscriptionId,
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
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    return NextResponse.json(subscription, { status: 200 })
  } catch (error) {
    console.error('Error en GET athlete-subscription:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PUT /teams/[teamId]/athlete-subscriptions/[subscriptionId]
 * Actualiza una suscripción de atleta
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
    const validation = updateAthleteSubscriptionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', issues: validation.error.issues },
        { status: 422 }
      )
    }

    // Verificar que la suscripción existe
    const existing = await prisma.athleteSubscription.findFirst({
      where: {
        id: subscriptionId,
        teamBillingPlan: {
          teamId,
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    const updated = await prisma.athleteSubscription.update({
      where: { id: subscriptionId },
      data: validation.data,
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

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('Error en PUT athlete-subscription:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /teams/[teamId]/athlete-subscriptions/[subscriptionId]
 * Cancela una suscripción de atleta
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
    const existing = await prisma.athleteSubscription.findFirst({
      where: {
        id: subscriptionId,
        teamBillingPlan: {
          teamId,
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    await prisma.athleteSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'INACTIVE',
        cancelledAt: new Date(),
      },
    })

    return NextResponse.json(null, { status: 204 })
  } catch (error) {
    console.error('Error en DELETE athlete-subscription:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
