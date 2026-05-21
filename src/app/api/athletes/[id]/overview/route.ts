import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const athlete = await prisma.athlete.findUnique({
    where: { id },
    include: {
      checkIns: { orderBy: { date: 'desc' }, take: 12, select: { id: true, weekLabel: true, date: true, weightKg: true, stepsAvg: true, sleepHours: true, adherencePct: true, sensations: true, notes: true, coachNote: true } },
      dailyLogs: { orderBy: { date: 'desc' }, take: 50, select: { date: true, weightKg: true, sleepHours: true, steps: true } }, // Reduced from 90
      plans: {
        where: { deletedAt: null },
        select: { id: true, title: true, weekLabel: true, createdAt: true, _count: { select: { sessions: true } } }, // No nested sessions/exercises
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      nutritionPlans: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, title: true, phase: true, kcalTarget: true, proteinG: true, carbsG: true, fatG: true, isActive: true, notes: true }, // No nested meals/foods
      },
      sessionLogs: { orderBy: { date: 'desc' }, take: 30, select: { id: true, sessionName: true, date: true, durationMin: true, kcalBurned: true, heartRateAvg: true, source: true } },
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, title: true, category: true, fileName: true, createdAt: true } },
      bodyMeasurements: { orderBy: { date: 'asc' }, take: 13, select: { id: true, date: true, weightKg: true, bodyFatPct: true, waistCm: true, hipCm: true, chestCm: true, armCm: true, quadCm: true, calfCm: true, glutesCm: true, neckCm: true, notes: true } }, // Reduced from 52 to ~weekly
      contextProfile: { select: { restrictedFoodsJson: true, restrictedExercises: true } },
    },
  })

  if (!athlete) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verificar que el coach autenticado es el de este atleta
  const coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!coach || athlete.coachId !== coach.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Tendencia de peso (últimos 90 dailyLogs)
  const weightTrend = athlete.dailyLogs
    .filter((l) => l.weightKg && l.weightKg > 0)
    .map((l) => ({
      date: l.date.toISOString().split('T')[0],
      weightKg: l.weightKg,
    }))
    .reverse()

  // Tendencia diaria de sueño y pasos
  const sleepTrend = athlete.dailyLogs
    .filter((l) => l.sleepHours != null && l.sleepHours > 0)
    .map((l) => ({ date: l.date.toISOString().split('T')[0], value: l.sleepHours as number }))
    .reverse()

  const stepsTrend = athlete.dailyLogs
    .filter((l) => l.steps != null && l.steps > 0)
    .map((l) => ({ date: l.date.toISOString().split('T')[0], value: l.steps as number }))
    .reverse()

  // Adherencia promedio (últimos 4 check-ins)
  const last4 = athlete.checkIns.slice(0, 4)
  const avgAdherence = last4.length
    ? Math.round(last4.reduce((s, c) => s + c.adherencePct, 0) / last4.length)
    : null

  const measurementCadence = athlete.measurementCadence
    ? athlete.measurementCadence.toLowerCase().replace('_', '-')
    : 'checkin'
  const reviewCadence = athlete.reviewCadence
    ? athlete.reviewCadence.toLowerCase().replace('_', '-')
    : 'checkin'

  // nextCheckInDueAt
  const cadenceDays: Record<string, number> = {
    daily: 1,
    weekly: 7,
    checkin: 7,
    workout: 7,
  }
  const days =
    athlete.measurementCadence === 'CUSTOM_DAYS'
      ? (athlete.measurementEveryDays ?? 7)
      : (cadenceDays[measurementCadence] ?? 7)
  const lastCIDate = athlete.checkIns[0]?.date ?? null
  const nextCheckInDueAt = lastCIDate
    ? new Date(lastCIDate.getTime() + days * 86_400_000).toISOString().split('T')[0]
    : null

  // streakWeeks — consecutive 7-day windows with at least one check-in
  function computeStreakWeeks(dates: Date[]): number {
    if (dates.length === 0) return 0
    const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime())
    const anchor = sorted[0]
    let streak = 0
    let windowEnd = anchor.getTime() + 86_400_000 // inclusive end
    let windowStart = windowEnd - 8 * 86_400_000 // 8-day window with tolerance
    for (const d of sorted) {
      if (d.getTime() >= windowStart && d.getTime() < windowEnd) {
        if (streak === 0 || d.getTime() < windowEnd - 8 * 86_400_000 + 86_400_000) {
          // first entry in this window
        }
        streak++
        // Slide window back
        windowEnd = windowStart
        windowStart = windowEnd - 8 * 86_400_000
      }
    }
    return streak
  }
  // Simpler streak: count consecutive weekly check-ins
  function weekStreak(dates: Date[]): number {
    if (dates.length === 0) return 0
    const weeks = new Set(
      dates.map((d) => {
        const dt = new Date(d)
        dt.setHours(0, 0, 0, 0)
        const jan4 = new Date(dt.getFullYear(), 0, 4)
        const weekNo = Math.ceil(
          ((dt.getTime() - jan4.getTime()) / 86_400_000 + jan4.getDay() + 1) / 7
        )
        return `${dt.getFullYear()}-${weekNo}`
      })
    )
    const sorted = [...weeks].sort().reverse()
    let streak = 0
    let prevYear = -1,
      prevWeek = -1
    for (const w of sorted) {
      const [y, wk] = w.split('-').map(Number)
      if (streak === 0) {
        streak = 1
        prevYear = y
        prevWeek = wk
        continue
      }
      const expectedPrevWeek = prevWeek === 1 ? 52 : prevWeek - 1
      const expectedPrevYear = prevWeek === 1 ? prevYear - 1 : prevYear
      if (y === expectedPrevYear && wk === expectedPrevWeek) {
        streak++
        prevYear = y
        prevWeek = wk
      } else {
        break
      }
    }
    return streak
  }
  const streakWeeks = weekStreak(athlete.checkIns.map((c) => c.date))

  // restrictionsCount from contextProfile
  let restrictionsCount = 0
  if (athlete.contextProfile) {
    const foods = Array.isArray(athlete.contextProfile.restrictedFoodsJson)
      ? athlete.contextProfile.restrictedFoodsJson
      : []
    const exercises = Array.isArray(athlete.contextProfile.restrictedExercises)
      ? athlete.contextProfile.restrictedExercises
      : []
    restrictionsCount = foods.length + exercises.length
  }

  // latestWeightKg — from last check-in or last daily log
  const latestWeightKg =
    athlete.checkIns[0]?.weightKg ??
    athlete.dailyLogs.find((l) => l.weightKg != null)?.weightKg ??
    null

  return NextResponse.json({
    id: athlete.id,
    fullName: athlete.fullName,
    goal: athlete.goal.toLowerCase().replace('_', '-'),
    phaseLabel: athlete.phaseLabel,
    measurementCadence,
    measurementEveryDays: athlete.measurementEveryDays,
    reviewCadence,
    reviewEveryDays: athlete.reviewEveryDays,
    checkIns: athlete.checkIns.map((c) => ({
      id: c.id,
      weekLabel: c.weekLabel,
      date: c.date.toISOString().split('T')[0],
      weightKg: c.weightKg,
      stepsAvg: c.stepsAvg,
      sleepHours: c.sleepHours,
      adherencePct: c.adherencePct,
      sensations: c.sensations,
      notes: c.notes,
      coachNote: c.coachNote,
    })),
    weightTrend,
    sleepTrend,
    stepsTrend,
    plans: athlete.plans.map((p) => ({
      id: p.id,
      title: p.title,
      weekLabel: p.weekLabel,
      sessionsCount: p._count.sessions,
      createdAt: p.createdAt.toISOString().split('T')[0],
    })),
    nutritionPlans: athlete.nutritionPlans.map((n) => ({
      id: n.id,
      title: n.title,
      phase: n.phase,
      kcalTarget: n.kcalTarget,
      proteinG: n.proteinG,
      carbsG: n.carbsG,
      fatG: n.fatG,
      isActive: n.isActive,
      notes: n.notes,
    })),
    recentSessions: athlete.sessionLogs.map((s) => ({
      id: s.id,
      sessionName: s.sessionName,
      date: s.date.toISOString().split('T')[0],
      durationMin: s.durationMin,
      kcalBurned: s.kcalBurned,
      heartRateAvg: s.heartRateAvg,
      source: s.source,
    })),
    documents: athlete.documents.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      fileName: d.fileName,
      createdAt: d.createdAt.toISOString().split('T')[0],
    })),
    stats: {
      totalCheckIns: athlete.checkIns.length,
      totalSessions: athlete.sessionLogs.length,
      avgAdherence,
      lastCheckInDate: athlete.checkIns[0]?.date.toISOString().split('T')[0] ?? null,
      nextCheckInDueAt,
      streakWeeks,
      restrictionsCount,
      latestWeightKg,
    },
    bodyMeasurements: athlete.bodyMeasurements.map((m) => ({
      id: m.id,
      date: m.date.toISOString().split('T')[0],
      weightKg: m.weightKg,
      bodyFatPct: m.bodyFatPct,
      waistCm: m.waistCm,
      hipCm: m.hipCm,
      chestCm: m.chestCm,
      armCm: m.armCm,
      quadCm: m.quadCm,
      calfCm: m.calfCm,
      glutesCm: m.glutesCm,
      neckCm: m.neckCm,
      notes: m.notes,
    })),
  })
}
