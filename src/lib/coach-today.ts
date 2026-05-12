import { prisma } from '@/lib/prisma'

export type CoachTodayData = {
  coach: {
    id: string
    displayName: string
  }
  stats: {
    totalAthletes: number
    pendingCheckIns: number
    atRisk: number
    avgAdherence: number | null
    unreadMessages: number
    unreadNotifications: number
    sessionsLast7d: number
  }
  pendingCheckIns: Array<{
    athleteId: string
    fullName: string
    phaseLabel: string
    daysSinceCheckIn: number | null
    lastCheckInAt: string | null
  }>
  riskAthletes: Array<{
    athleteId: string
    fullName: string
    adherencePct: number
    sleepHours: number
    flags: string[]
  }>
  unreadMessages: Array<{
    athleteId: string
    userId: string
    fullName: string
    unreadCount: number
    lastMessage: string | null
    lastMessageAt: string | null
  }>
  recentSessions: Array<{
    id: string
    athleteId: string
    athleteName: string
    sessionName: string
    date: string
    durationMin: number | null
  }>
  topAthletes: Array<{
    athleteId: string
    fullName: string
    adherencePct: number | null
    lastCheckInAt: string | null
    sessionsLast7d: number
  }>
}

function daysBetween(from: Date | null, to = new Date()) {
  if (!from) return null
  const diff = to.getTime() - from.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export async function getCoachToday(userId: string): Promise<CoachTodayData> {
  if (!userId || userId.trim() === '') {
    throw new Error('Coach: userId no válido. Por favor, inicia sesión nuevamente.')
  }

  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  })

  // Si no lo encuentra por ID, intenta por email (puede ser un mismatch ID/session)
  if (!user) {
    const session = await import('@/auth').then((m) => m.auth?.())
    if (session?.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true },
      })

      // Si existe pero con otro ID, es un mismatch. Log y usa lo que encuentre.
      if (user && user.id !== userId) {
        console.warn(
          `[Coach] ID mismatch: session ID="${userId}" != DB ID="${user.id}". Usando DB ID.`
        )
      }
    }
  }

  if (!user) {
    throw new Error(
      'Coach: usuario no encontrado en BD. Verifica que la sesión sea válida ' +
        'y que la base de datos tenga datos (ejecuta: npx prisma db seed).'
    )
  }

  const coach = await prisma.coach.upsert({
    where: { userId: user.id }, // Usar user.id encontrado en BD, no el userId de la sesión
    update: {},
    create: {
      userId: user.id, // Idem
      displayName: user.name ?? user.email ?? 'Coach',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    },
    select: { id: true, displayName: true },
  })

  const athletes = await prisma.athlete.findMany({
    where: { coachId: coach.id },
    include: {
      user: { select: { id: true } },
      checkIns: {
        orderBy: { date: 'desc' },
        take: 1,
        select: { date: true, adherencePct: true, sleepHours: true },
      },
      sessionLogs: {
        where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const athleteUserIds = athletes
    .map((athlete) => athlete.user?.id)
    .filter((value): value is string => Boolean(value))
  const athleteIdByUserId = new Map(
    athletes.filter((athlete) => athlete.user?.id).map((athlete) => [athlete.user!.id, athlete.id])
  )
  const athleteNameById = new Map(athletes.map((athlete) => [athlete.id, athlete.fullName]))

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentSessions = await prisma.sessionLog.findMany({
    where: { athleteId: { in: athletes.map((athlete) => athlete.id) } },
    orderBy: { date: 'desc' },
    take: 8,
    select: {
      id: true,
      athleteId: true,
      sessionName: true,
      date: true,
      durationMin: true,
    },
  })

  const unreadMessageRows =
    athleteUserIds.length > 0
      ? await prisma.message.findMany({
          where: {
            fromUserId: { in: athleteUserIds },
            toUserId: userId,
            readAt: null,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            fromUserId: true,
            content: true,
            createdAt: true,
          },
        })
      : []

  const unreadMessagesMap = new Map<string, CoachTodayData['unreadMessages'][number]>()
  for (const row of unreadMessageRows) {
    const athleteId = athleteIdByUserId.get(row.fromUserId)
    if (!athleteId) continue
    const existing = unreadMessagesMap.get(athleteId)
    if (existing) {
      existing.unreadCount += 1
      continue
    }
    unreadMessagesMap.set(athleteId, {
      athleteId,
      userId: row.fromUserId,
      fullName: athleteNameById.get(athleteId) ?? 'Atleta',
      unreadCount: 1,
      lastMessage: row.content,
      lastMessageAt: row.createdAt.toISOString(),
    })
  }

  const pendingCheckIns = athletes
    .filter((athlete) => {
      const latest = athlete.checkIns[0]?.date ?? null
      return !latest || latest < sevenDaysAgo
    })
    .map((athlete) => ({
      athleteId: athlete.id,
      fullName: athlete.fullName,
      phaseLabel: athlete.phaseLabel,
      daysSinceCheckIn: daysBetween(athlete.checkIns[0]?.date ?? null),
      lastCheckInAt: athlete.checkIns[0]?.date?.toISOString() ?? null,
    }))
    .sort((a, b) => (b.daysSinceCheckIn ?? 0) - (a.daysSinceCheckIn ?? 0))

  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)

  const riskAthletes = athletes
    .map((athlete) => {
      const latest = athlete.checkIns[0]
      const flags: string[] = []
      if (latest) {
        if (latest.adherencePct < 60) flags.push(`Adherencia ${Math.round(latest.adherencePct)}%`)
        if (latest.sleepHours < 6) flags.push(`Sueño ${latest.sleepHours.toFixed(1)} h`)
      }
      const lastCheckIn = athlete.checkIns[0]?.date ?? null
      if (!lastCheckIn || lastCheckIn < tenDaysAgo) {
        const days = lastCheckIn
          ? Math.floor((Date.now() - lastCheckIn.getTime()) / 86_400_000)
          : null
        flags.push(days ? `Sin check-in: ${days}d` : 'Sin check-in')
      }
      if (athlete.sessionLogs.length === 0) flags.push('Sin sesiones (7d)')
      if (flags.length === 0) return null
      return {
        athleteId: athlete.id,
        fullName: athlete.fullName,
        adherencePct: latest?.adherencePct ?? 0,
        sleepHours: latest?.sleepHours ?? 0,
        flags,
      }
    })
    .filter((value): value is CoachTodayData['riskAthletes'][number] => value !== null)

  const adherenceValues = athletes
    .map((athlete) => athlete.checkIns[0]?.adherencePct ?? null)
    .filter((value): value is number => value !== null)

  const topAthletes = athletes
    .map((athlete) => ({
      athleteId: athlete.id,
      fullName: athlete.fullName,
      adherencePct: athlete.checkIns[0]?.adherencePct ?? null,
      lastCheckInAt: athlete.checkIns[0]?.date?.toISOString() ?? null,
      sessionsLast7d: athlete.sessionLogs.length,
    }))
    .sort((a, b) => {
      const adherenceDiff = (b.adherencePct ?? -1) - (a.adherencePct ?? -1)
      if (adherenceDiff !== 0) return adherenceDiff
      return b.sessionsLast7d - a.sessionsLast7d
    })
    .slice(0, 5)

  const unreadNotifications = await prisma.notification.count({
    where: { userId, read: false },
  })

  return {
    coach,
    stats: {
      totalAthletes: athletes.length,
      pendingCheckIns: pendingCheckIns.length,
      atRisk: riskAthletes.length,
      avgAdherence:
        adherenceValues.length > 0
          ? Math.round(
              adherenceValues.reduce((sum, value) => sum + value, 0) / adherenceValues.length
            )
          : null,
      unreadMessages: unreadMessageRows.length,
      unreadNotifications,
      sessionsLast7d: recentSessions.filter((session) => session.date >= sevenDaysAgo).length,
    },
    pendingCheckIns,
    riskAthletes,
    unreadMessages: [...unreadMessagesMap.values()].sort((a, b) =>
      (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')
    ),
    recentSessions: recentSessions.map((session) => ({
      id: session.id,
      athleteId: session.athleteId,
      athleteName: athleteNameById.get(session.athleteId) ?? 'Atleta',
      sessionName: session.sessionName,
      date: session.date.toISOString(),
      durationMin: session.durationMin,
    })),
    topAthletes,
  }
}
