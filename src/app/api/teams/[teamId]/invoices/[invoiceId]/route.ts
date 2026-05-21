import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { TeamRole } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validación de entrada
const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  paidAt: z.string().datetime().optional(),
})

type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>

/**
 * GET /teams/[teamId]/invoices/[invoiceId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; invoiceId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { teamId, invoiceId } = await params

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

    // Obtener factura
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        OR: [
          {
            coachSubscription: {
              teamId,
            },
          },
          {
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
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    return NextResponse.json(invoice, { status: 200 })
  } catch (error) {
    console.error('Error en GET invoice:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PUT /teams/[teamId]/invoices/[invoiceId]
 * Actualiza una factura
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; invoiceId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { teamId, invoiceId } = await params

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
    const validation = updateInvoiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', issues: validation.error.issues },
        { status: 422 }
      )
    }

    // Verificar que la factura existe
    const existing = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        OR: [
          {
            coachSubscription: {
              teamId,
            },
          },
          {
            athleteSubscription: {
              teamBillingPlan: {
                teamId,
              },
            },
          },
        ],
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    // Preparar datos de actualización
    const updateData: Record<string, any> = { ...validation.data }
    if (validation.data.paidAt) {
      updateData.paidAt = new Date(validation.data.paidAt)
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
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

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('Error en PUT invoice:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
