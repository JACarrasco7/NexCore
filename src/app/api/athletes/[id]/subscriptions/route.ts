import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/athletes/[id]/subscriptions
 * Listar suscripciones de un atleta
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar que el atleta existe y que el usuario tiene acceso
  const athlete = await prisma.athlete.findUnique({
    where: { id },
    include: { team: { select: { id: true } } },
  })

  if (!athlete) {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
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
      return NextResponse.json({ error: 'Sin acceso a este atleta' }, { status: 403 })
    }
  } else if (role !== 'ADMIN' && role !== 'ATHLETE') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  // Si es ATHLETE, verificar que es su propio perfil
  if (role === 'ATHLETE' && session.user.id !== athlete.userId) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  // Obtener suscripciones
  const subscriptions = await prisma.athleteSubscription.findMany({
    where: { athleteId: id },
    include: { servicePlan: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      cancelledAt: sub.cancelledAt,
      priceEurPaid: sub.priceEurPaid,
      notes: sub.notes,
      servicePlan: {
        id: sub.servicePlan.id,
        name: sub.servicePlan.name,
      },
    }))
  )
}

/**
 * POST /api/athletes/[id]/subscriptions
 * Asignar un plan de servicio a un atleta
 * (Coach del equipo o ADMIN)
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (role !== 'COACH' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { servicePlanId, startDate, priceEurPaid, notes } = body

  if (!servicePlanId) {
    return NextResponse.json({ error: 'servicePlanId es requerido' }, { status: 400 })
  }

  // Obtener atleta
  const athlete = await prisma.athlete.findUnique({
    where: { id },
    include: { team: { select: { id: true } } },
  })

  if (!athlete) {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
  }

  // Validar acceso
  if (role === 'COACH') {
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
      return NextResponse.json({ error: 'Sin acceso a este atleta' }, { status: 403 })
    }
  }

  // Obtener plan de servicio
  const servicePlan = await prisma.servicePlan.findUnique({
    where: { id: servicePlanId },
  })

  if (!servicePlan) {
    return NextResponse.json({ error: 'Plan de servicio no encontrado' }, { status: 404 })
  }

  // Validar que el plan pertenece al coach (si es coach)
  if (role === 'COACH') {
    const coach = await prisma.coach.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!coach || servicePlan.coachId !== coach.id) {
      return NextResponse.json({ error: 'Solo puedes asignar tus propios planes' }, { status: 403 })
    }
  }

  // Verificar que no hay otra suscripción activa al mismo plan
  const existing = await prisma.athleteSubscription.findFirst({
    where: {
      athleteId: id,
      servicePlanId: servicePlanId,
      status: 'ACTIVE',
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'Este atleta ya tiene una suscripción activa a este plan' },
      { status: 409 }
    )
  }

  try {
    const subscription = await prisma.athleteSubscription.create({
      data: {
        athleteId: id,
        servicePlanId: servicePlanId,
        status: 'ACTIVE',
        startDate: startDate ? new Date(startDate) : new Date(),
        priceEurPaid: typeof priceEurPaid === 'number' ? priceEurPaid : 0,
        notes: notes ? String(notes).trim() : null,
      },
      include: { servicePlan: true },
    })

    return NextResponse.json(
      {
        id: subscription.id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        priceEurPaid: subscription.priceEurPaid,
        notes: subscription.notes,
        servicePlan: {
          id: subscription.servicePlan.id,
          name: subscription.servicePlan.name,
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[athlete-subscriptions-create]', err)
    return NextResponse.json({ error: 'Error creando suscripción' }, { status: 500 })
  }
}
