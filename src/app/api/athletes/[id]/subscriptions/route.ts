import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, forbidden, badRequest, notFound } from '@/lib/api/error-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/athletes/[id]/subscriptions
 * Listar suscripciones de un atleta a TeamBillingPlans
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return unauthorized('No autorizado')
  }

  // Verificar que el atleta existe y que el usuario tiene acceso
  const athlete = await prisma.athlete.findUnique({
    where: { id },
    include: { team: { select: { id: true } } },
  })

  if (!athlete) {
    return notFound('Atleta no encontrado')
  }

  const role = (session.user as { role?: string }).role

  if (role === 'COACH') {
    // Verificar que el coach es miembro del equipo del atleta
    if (!athlete.teamId) {
      return NextResponse.json({ error: 'Atleta no tiene equipo asignado' }, { status: 403 })
    }

    const membership = await prisma.teamUserMembership.findFirst({
      where: {
        teamId: athlete.teamId,
        userId: session.user.id,
        isActive: true,
      },
    })

    if (!membership) {
      return forbidden('Sin acceso a este atleta')
    }
  } else if (role !== 'ADMIN' && role !== 'ATHLETE') {
    return forbidden('Sin acceso')
  }

  // Si es ATHLETE, verificar que es su propio perfil
  if (role === 'ATHLETE' && session.user.id !== athlete.userId) {
    return forbidden('Sin acceso')
  }

  // Obtener suscripciones
  const subscriptions = await prisma.athleteSubscription.findMany({
    where: { athleteId: id },
    include: {
      teamBillingPlan: {
        select: {
          id: true,
          planName: true,
          description: true,
          price: true,
          currency: true,
          billingCycle: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      cancelledAt: sub.cancelledAt,
      trialEndsAt: sub.trialEndsAt,
      paymentMethod: sub.paymentMethod,
      manualRenewal: sub.manualRenewal,
      teamBillingPlan: {
        id: sub.teamBillingPlan.id,
        planName: sub.teamBillingPlan.planName,
        description: sub.teamBillingPlan.description,
        price: sub.teamBillingPlan.price,
        currency: sub.teamBillingPlan.currency,
        billingCycle: sub.teamBillingPlan.billingCycle,
      },
    }))
  )
}

/**
 * POST /api/athletes/[id]/subscriptions
 * Asignar un plan de equipo a un atleta
 * (Coach del equipo o ADMIN)
 * @deprecated Use POST /teams/[teamId]/athlete-subscriptions instead
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized('No autorizado')
  }

  const role = (session.user as { role?: string }).role
  if (role !== 'COACH' && role !== 'ADMIN') {
    return forbidden('Sin acceso')
  }

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const { teamBillingPlanId } = parsed.data as any

  if (!teamBillingPlanId) {
    return badRequest('teamBillingPlanId requerido')
  }

  // Verificar que el atleta existe
  const athlete = await prisma.athlete.findUnique({
    where: { id },
    include: { team: true },
  })

  if (!athlete) {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
  }

  if (!athlete.teamId) {
    return NextResponse.json({ error: 'Atleta no tiene equipo asignado' }, { status: 403 })
  }

  // Verificar que el usuario es coach del equipo
  const membership = await prisma.teamUserMembership.findFirst({
    where: {
      teamId: athlete.teamId,
      userId: session.user.id,
      isActive: true,
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Sin acceso a este atleta' }, { status: 403 })
  }

  // Verificar que el plan existe y pertenece al equipo
  const plan = await prisma.teamBillingPlan.findFirst({
    where: {
      id: teamBillingPlanId,
      teamId: athlete.teamId,
    },
  })

  if (!plan) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
  }

  // Verificar que no existe suscripción activa
  const existing = await prisma.athleteSubscription.findUnique({
    where: {
      athleteId_teamBillingPlanId: {
        athleteId: id,
        teamBillingPlanId,
      },
    },
  })

  if (existing) {
    return NextResponse.json({ error: 'El atleta ya está asignado a este plan' }, { status: 409 })
  }

  // Validar maxAthletes
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

  const subscription = await prisma.athleteSubscription.create({
    data: {
      athleteId: id,
      teamBillingPlanId,
      status: 'ACTIVE',
      trialEndsAt,
      paymentMethod: 'MANUAL',
      manualRenewal: false,
    },
    include: {
      teamBillingPlan: {
        select: {
          id: true,
          planName: true,
          price: true,
          currency: true,
        },
      },
    },
  })

  return NextResponse.json(subscription, { status: 201 })
}
