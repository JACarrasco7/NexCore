import { NextResponse } from 'next/server'
import { NotificationType } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { checkInSchema } from '@/lib/validators'
import { paginationSchema, buildPaginationResponse } from '@/lib/api'
import { parseJsonOrError } from '@/lib/api/json-parser'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const athleteId = searchParams.get('athleteId') ?? undefined
  if (!athleteId) return NextResponse.json({ error: 'athleteId requerido' }, { status: 400 })

  const role = (session.user as { role?: string }).role
  const allowed =
    role === 'ADMIN' ||
    (role === 'ATHLETE' &&
      (await prisma.athlete
        .findFirst({ where: { id: athleteId, userId: session.user.id }, select: { id: true } })
        .then(Boolean))) ||
    (role === 'COACH' &&
      (await prisma.athlete
        .findFirst({
          where: { id: athleteId, coach: { userId: session.user.id } },
          select: { id: true },
        })
        .then(Boolean)))
  if (!allowed) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const takeParam = searchParams.get('take') ?? searchParams.get('limit') ?? undefined
  const cursorParam = searchParams.get('cursor') ?? undefined
  const pagination = paginationSchema.safeParse({
    take: takeParam,
    cursor: cursorParam,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  })
  const { take, cursor, from, to } = pagination.success
    ? pagination.data
    : { take: 20, cursor: undefined, from: undefined, to: undefined }

  const where: Record<string, unknown> = { athleteId }
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const rows = await prisma.checkIn.findMany({
    where,
    orderBy: { date: 'desc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const { items, nextCursor } = buildPaginationResponse(
    rows.map((c) => ({
      id: c.id,
      athleteId: c.athleteId,
      weekLabel: c.weekLabel,
      date: c.date.toISOString(),
      weightKg: c.weightKg,
      stepsAvg: c.stepsAvg,
      sleepHours: c.sleepHours,
      adherencePct: c.adherencePct,
      sensations: c.sensations ?? '',
      notes: c.notes ?? '',
      coachNote: c.coachNote ?? null,
    })),
    take
  )

  return NextResponse.json({ items, nextCursor })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  const result = await parseJsonOrError(request)
  if (!result.ok) return result.error
  const body = result.data as any // Already validated by parseJsonOrError

  const parsed = checkInSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }
  const data = parsed.data
  if (!data.athleteId) {
    return NextResponse.json({ error: 'athleteId es requerido' }, { status: 400 })
  }

  const athlete = await prisma.athlete.findUnique({
    where: { id: data.athleteId },
    include: { coach: { select: { userId: true, displayName: true } } },
  })
  if (!athlete) {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
  }

  const canCreate =
    role === 'ADMIN' ||
    (role === 'COACH' && athlete.coach?.userId === session.user.id) ||
    (role === 'ATHLETE' && athlete.userId === session.user.id)
  if (!canCreate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const row = await prisma.$transaction(async (tx) => {
    const checkIn = await tx.checkIn.create({
      data: {
        athleteId: athlete.id,
        weekLabel: data.weekLabel ?? body.weekLabel ?? '',
        date: data.date ? new Date(data.date) : new Date(),
        weightKg: data.weightKg ?? 0,
        stepsAvg: data.stepsAvg ?? 0,
        sleepHours: data.sleepAvg ?? body.sleepHours ?? 0,
        adherencePct: data.adherencePct ?? 0,
        sensations: body.sensations ?? '',
        notes: data.notes ?? '',
      },
    })

    if (athlete.coach?.userId) {
      await tx.notification.create({
        data: {
          userId: athlete.coach!.userId,
          type: NotificationType.CHECK_IN_RESPONDED,
          title: `Nuevo check-in de ${athlete.fullName}`,
          body: `Semana: ${checkIn.weekLabel} · Peso: ${checkIn.weightKg ?? '-'} kg`,
          link: `/coach/athletes/${athlete.id}?tab=checkins`,
        },
      })
    }

    return checkIn
  })

  return NextResponse.json(
    { ...row, date: row.date.toISOString(), coachNote: null },
    { status: 201 }
  )
}
