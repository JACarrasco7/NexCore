import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  assertAthleteAccess,
  assertCoachOwnsAthlete,
  requireAthleteId,
  paginationSchema,
  buildPaginationResponse,
} from '@/lib/api'
import { sessionLogSchema } from '@/lib/validators'
import { parseJsonOrError } from '@/lib/api/json-parser'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  let session
  try {
    session = await requireSession()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const athleteId = searchParams.get('athleteId') ?? undefined
  if (!athleteId) return NextResponse.json({ error: 'athleteId requerido' }, { status: 400 })

  try {
    await assertAthleteAccess(athleteId)
  } catch {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

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

  const logs = await prisma.sessionLog.findMany({
    where,
    include: { sets: true },
    orderBy: { date: 'desc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const { items, nextCursor } = buildPaginationResponse(
    logs.map((l) => ({
      id: l.id,
      athleteId: l.athleteId,
      planId: l.planId,
      sessionId: l.sessionId,
      sessionName: l.sessionName,
      date: l.date.toISOString(),
      notes: l.notes ?? '',
      durationMin: l.durationMin ?? null,
      kcalBurned: l.kcalBurned ?? null,
      heartRateAvg: l.heartRateAvg ?? null,
      source: l.source,
      sets: l.sets.map((s) => ({
        exerciseIndex: s.exerciseIndex,
        exercise: s.exercise,
        setNumber: s.setNumber,
        loadKg: s.loadKg,
        reps: s.reps,
        rir: s.rir,
      })),
    })),
    take
  )

  return NextResponse.json({ items, nextCursor })
}

export async function POST(request: Request) {
  let session
  try {
    session = await requireSession()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const parseResult = await parseJsonOrError(request)
  if (!parseResult.ok) return parseResult.error
  const parsed = sessionLogSchema.safeParse(parseResult.data)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }
  const body = parsed.data

  // Enforce athleteId from session for ATHLETE role
  let resolvedAthleteId: string
  if (session.role === 'ATHLETE') {
    try {
      resolvedAthleteId = await requireAthleteId()
    } catch {
      return NextResponse.json({ error: 'Perfil de atleta no encontrado' }, { status: 404 })
    }
  } else {
    if (!body.athleteId) return NextResponse.json({ error: 'athleteId requerido' }, { status: 400 })
    try {
      await assertCoachOwnsAthlete(body.athleteId)
    } catch {
      return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
    }
    resolvedAthleteId = body.athleteId
  }

  if (!body.planId || !body.sessionId) {
    return NextResponse.json({ error: 'planId y sessionId son requeridos' }, { status: 400 })
  }

  // Immutability check: logs older than 7 days cannot be created with a backdated date
  if (body.date) {
    const logDate = new Date(body.date)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    if (logDate < cutoff) {
      return NextResponse.json(
        { error: 'No se puede registrar sesiones con más de 7 días de antigüedad' },
        { status: 422 }
      )
    }
  }

  const log = await prisma.$transaction(async (tx) => {
    return tx.sessionLog.create({
      data: {
        athleteId: resolvedAthleteId,
        planId: body.planId,
        sessionId: body.sessionId,
        sessionName: body.sessionName,
        date: body.date ? new Date(body.date) : new Date(),
        notes: body.notes ?? '',
        durationMin: body.durationMin ?? null,
        kcalBurned: body.kcalBurned ?? null,
        heartRateAvg: body.heartRateAvg ?? null,
        source: body.source ?? 'manual',
        sets: {
          create: (body.sets ?? []).map((s) => ({
            exerciseIndex: s.exerciseIndex,
            exercise: s.exercise,
            setNumber: s.setNumber,
            loadKg: s.loadKg ?? 0,
            reps: s.reps ?? 0,
            rir: s.rir ?? 0,
          })),
        },
      },
      include: { sets: true },
    })
  })

  return NextResponse.json(
    {
      id: log.id,
      athleteId: log.athleteId,
      planId: log.planId,
      sessionId: log.sessionId,
      sessionName: log.sessionName,
      date: log.date.toISOString(),
      notes: log.notes ?? '',
      durationMin: log.durationMin ?? null,
      kcalBurned: log.kcalBurned ?? null,
      heartRateAvg: log.heartRateAvg ?? null,
      source: log.source,
      sets: log.sets,
    },
    { status: 201 }
  )
}
