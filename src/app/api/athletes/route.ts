import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { Goal } from '@prisma/client'
import { randomUUID } from 'node:crypto'

export const dynamic = 'force-dynamic'

function goalEnum(g: string): Goal {
  const map: Record<string, Goal> = {
    volumen: Goal.VOLUMEN,
    definicion: Goal.DEFINICION,
    mantenimiento: Goal.MANTENIMIENTO,
    'peak-week': Goal.PEAK_WEEK,
  }
  return map[g] ?? Goal.VOLUMEN
}

function cadenceEnum(c?: string): 'DAILY' | 'WEEKLY' | 'WORKOUT' | 'CHECKIN' | 'CUSTOM_DAYS' {
  const map: Record<string, 'DAILY' | 'WEEKLY' | 'WORKOUT' | 'CHECKIN' | 'CUSTOM_DAYS'> = {
    daily: 'DAILY',
    weekly: 'WEEKLY',
    workout: 'WORKOUT',
    checkin: 'CHECKIN',
    'custom-days': 'CUSTOM_DAYS',
  }
  return map[c ?? ''] ?? 'CHECKIN'
}

function reviewCadenceEnum(c?: string): 'WEEKLY' | 'CHECKIN' | 'CUSTOM_DAYS' {
  const map: Record<string, 'WEEKLY' | 'CHECKIN' | 'CUSTOM_DAYS'> = {
    weekly: 'WEEKLY',
    checkin: 'CHECKIN',
    'custom-days': 'CUSTOM_DAYS',
  }
  return map[c ?? ''] ?? 'CHECKIN'
}

function cadenceToApi(value: string | null | undefined) {
  if (!value) return 'checkin'
  return value.toLowerCase().replace('_', '-')
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role

  let athleteWhere: { teamId: string } | { teamId?: string } | undefined

  if (role === 'COACH') {
    const { searchParams } = new URL(request.url)
    const teamIdParam = searchParams.get('teamId') ?? undefined

    // Coach MUST have team memberships
    const memberships = await prisma.teamUserMembership.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { teamId: true },
      orderBy: { createdAt: 'asc' },
    })

    if (memberships.length === 0) {
      return NextResponse.json(
        {
          error: 'Coach no tiene equipos asignados',
          athletes: [],
          teamId: null,
        },
        { status: 200 }
      )
    }

    const allowedTeamIds = memberships.map((m) => m.teamId)
    const resolvedTeamId =
      teamIdParam && allowedTeamIds.includes(teamIdParam) ? teamIdParam : allowedTeamIds[0]

    athleteWhere = { teamId: resolvedTeamId }
  } else if (role === 'ADMIN') {
    // ADMIN may filter by teamId or get all
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId') ?? undefined
    athleteWhere = teamId ? { teamId } : undefined
  } else {
    // ATHLETE cannot list athletes
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const athletes = await prisma.athlete.findMany({
    where: athleteWhere,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true } } },
  })
  const mapped = athletes.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    goal: a.goal.toLowerCase().replace('_', '-'),
    phaseLabel: a.phaseLabel,
    phone: a.phone,
    contactEmail: a.user.email,
    primaryComment: a.primaryComment,
    teamId: a.teamId,
    coachName: 'Coach',
    healthConnections: a.healthConnections ? JSON.parse(a.healthConnections) : [],
  }))
  return NextResponse.json(mapped)
}

export async function POST(request: Request) {
  const body = await request.json()
  if (!body.fullName) {
    return NextResponse.json({ error: 'fullName es requerido' }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sessionRole = (session.user as { role?: string }).role
  if (sessionRole !== 'COACH' && sessionRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  let coachId: string
  let teamId: string | null

  if (sessionRole === 'COACH') {
    // Coach creates athlete in own team
    const coach = await prisma.coach.findUnique({ where: { userId: session.user.id } })
    if (!coach) {
      return NextResponse.json({ error: 'Perfil de coach no encontrado' }, { status: 403 })
    }
    coachId = coach.id

    // Resolve team from active memberships
    const memberships = await prisma.teamUserMembership.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { teamId: true },
      orderBy: { createdAt: 'asc' },
    })

    if (memberships.length === 0) {
      return NextResponse.json(
        {
          error: 'Coach no tiene equipos asignados',
        },
        { status: 403 }
      )
    }

    const allowedTeamIds = memberships.map((m) => m.teamId)
    teamId =
      body.teamId && allowedTeamIds.includes(body.teamId)
        ? body.teamId
        : (allowedTeamIds[0] ?? null)
  } else {
    // ADMIN: requires both coachId and teamId
    if (!body.coachId || !body.teamId) {
      return NextResponse.json(
        {
          error: 'ADMIN requiere coachId y teamId',
        },
        { status: 400 }
      )
    }

    // Verify coach exists
    const coach = await prisma.coach.findUnique({ where: { id: body.coachId } })
    if (!coach) {
      return NextResponse.json({ error: 'Coach no encontrado' }, { status: 404 })
    }

    // Verify coach is member of requested team
    const membership = await prisma.teamUserMembership.findFirst({
      where: {
        userId: coach.userId,
        teamId: body.teamId,
        isActive: true,
      },
    })
    if (!membership) {
      return NextResponse.json(
        {
          error: 'Coach no es miembro del equipo',
        },
        { status: 403 }
      )
    }

    coachId = body.coachId
    teamId = body.teamId
  }

  const contactEmail = body.contactEmail ? String(body.contactEmail).trim().toLowerCase() : null

  const athleteEmail = `athlete-${randomUUID()}@demo.local`
  const { athleteUser, athlete } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { email: athleteEmail, name: body.fullName, role: 'ATHLETE' },
    })

    const createdAthlete = await tx.athlete.create({
      data: {
        userId: createdUser.id,
        coachId: coachId,
        teamId: teamId,
        fullName: body.fullName,
        phone: body.phone ? String(body.phone).trim() : null,
        contactEmail: contactEmail ?? athleteEmail,
        primaryComment: body.primaryComment ? String(body.primaryComment).trim() : null,
        goal: goalEnum(body.goal ?? 'volumen'),
        phaseLabel: body.phaseLabel ?? 'Semana 1',
        measurementCadence: cadenceEnum(body.measurementCadence),
        measurementEveryDays:
          body.measurementCadence === 'custom-days' ? Number(body.measurementEveryDays ?? 7) : null,
        reviewCadence: reviewCadenceEnum(body.reviewCadence),
        reviewEveryDays:
          body.reviewCadence === 'custom-days' ? Number(body.reviewEveryDays ?? 7) : null,
        healthConnections: JSON.stringify(body.healthConnections ?? []),
      },
    })

    return { athleteUser: createdUser, athlete: createdAthlete }
  })

  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    select: { displayName: true },
  })

  return NextResponse.json(
    {
      id: athlete.id,
      fullName: athlete.fullName,
      goal: athlete.goal.toLowerCase().replace('_', '-'),
      phaseLabel: athlete.phaseLabel,
      phone: athlete.phone,
      contactEmail: athleteUser.email,
      primaryComment: athlete.primaryComment,
      teamId: athlete.teamId,
      measurementCadence: cadenceToApi(athlete.measurementCadence),
      measurementEveryDays: athlete.measurementEveryDays,
      reviewCadence: cadenceToApi(athlete.reviewCadence),
      reviewEveryDays: athlete.reviewEveryDays,
      coachName: coach?.displayName ?? 'Coach',
      healthConnections: body.healthConnections ?? [],
    },
    { status: 201 }
  )
}
