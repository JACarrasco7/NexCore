import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { TeamRole } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validación de entrada
const createInvoiceSchema = z.object({
  entityType: z.enum(['COACH', 'ATHLETE']),
  coachSubscriptionId: z.string().optional(),
  athleteSubscriptionId: z.string().optional(),
})

type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>

/**
 * GET /teams/[teamId]/invoices
 * Lista todas las facturas del equipo
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

    // Obtener facturas
    // Las facturas de coach están vinculadas directamente con teamId
    // Las facturas de atleta están vinculadas a través de athleteSubscription -> teamBillingPlan -> teamId
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          {
            entityType: 'COACH',
            coachSubscription: {
              teamId,
            },
          },
          {
            entityType: 'ATHLETE',
            athleteSubscription: {
              teamBillingPlan: {
                teamId,
              },
            },
          },
        ],
      },
      include: {
        coachSubscription: {
          select: {
            id: true,
            teamBillingPlan: {
              select: {
                planName: true,
              },
            },
          },
        },
        athleteSubscription: {
          select: {
            id: true,
            athlete: {
              select: {
                fullName: true,
              },
            },
            teamBillingPlan: {
              select: {
                planName: true,
              },
            },
          },
        },
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invoices, { status: 200 })
  } catch (error) {
    console.error('Error en GET invoices:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /teams/[teamId]/invoices
 * Crea una nueva factura
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
    const validation = createInvoiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', issues: validation.error.issues },
        { status: 422 }
      )
    }

    const { entityType, coachSubscriptionId, athleteSubscriptionId } = validation.data

    let subscription
    let amount = 0
    let currency = 'EUR'

    if (entityType === 'COACH') {
      if (!coachSubscriptionId) {
        return NextResponse.json(
          { error: 'coachSubscriptionId requerido para facturas de coach' },
          { status: 422 }
        )
      }

      subscription = await prisma.coachSubscription.findFirst({
        where: {
          id: coachSubscriptionId,
          teamId,
        },
        include: {
          teamBillingPlan: true,
        },
      })

      if (!subscription) {
        return NextResponse.json({ error: 'Suscripción de coach no encontrada' }, { status: 404 })
      }

      amount = subscription.teamBillingPlan.price
      currency = subscription.teamBillingPlan.currency
    } else if (entityType === 'ATHLETE') {
      if (!athleteSubscriptionId) {
        return NextResponse.json(
          { error: 'athleteSubscriptionId requerido para facturas de atleta' },
          { status: 422 }
        )
      }

      subscription = await prisma.athleteSubscription.findFirst({
        where: {
          id: athleteSubscriptionId,
          teamBillingPlan: {
            teamId,
          },
        },
        include: {
          teamBillingPlan: true,
        },
      })

      if (!subscription) {
        return NextResponse.json({ error: 'Suscripción de atleta no encontrada' }, { status: 404 })
      }

      amount = subscription.teamBillingPlan.price
      currency = subscription.teamBillingPlan.currency
    }

    // Calcular fecha de vencimiento (30 días desde ahora)
    const now = new Date()
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Crear factura
    const invoice = await prisma.invoice.create({
      data: {
        entityType,
        coachSubscriptionId: entityType === 'COACH' ? coachSubscriptionId : undefined,
        athleteSubscriptionId: entityType === 'ATHLETE' ? athleteSubscriptionId : undefined,
        amount,
        currency,
        status: 'SENT',
        dueDate,
        createdByUserId: session.user.id,
      },
      include: {
        coachSubscription: {
          select: {
            id: true,
            teamBillingPlan: {
              select: {
                planName: true,
              },
            },
          },
        },
        athleteSubscription: {
          select: {
            id: true,
            athlete: {
              select: {
                fullName: true,
              },
            },
            teamBillingPlan: {
              select: {
                planName: true,
              },
            },
          },
        },
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error en POST invoices:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
