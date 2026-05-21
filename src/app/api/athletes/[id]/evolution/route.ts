/**
 * GET /api/athletes/[id]/evolution
 * Dashboard principal de evolución y tracking de volumen
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  calculateWeeklyVolumeByMuscle,
  getVolumeComparison,
  generateAutoSuggestions,
  analyzeCorrelations,
} from '@/lib/evolution'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que el usuario es coach del atleta o el atleta mismo
    const athlete = await prisma.athlete.findUnique({
      where: { id },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // RBAC: Solo coach o atleta mismo
    if (session.user.id !== athlete.userId && session.user.id !== athlete.coachId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Obtener configuración de evolución
    const setting = await prisma.evolutionSetting.findUnique({
      where: { athleteId: id },
    })

    // Calcular volumen actual
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay()) // Domingo
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6) // Sábado

    const currentVolume = await calculateWeeklyVolumeByMuscle(id, weekStart, weekEnd)
    const comparison = await getVolumeComparison(id)
    const suggestions = await generateAutoSuggestions(id)
    const correlations = await analyzeCorrelations(id)

    // Obtener plan activo para revisar frecuencia
    const activePlan = await prisma.plan.findFirst({
      where: {
        athleteId: id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        reviewFrequencyDays: true,
        lastReviewDate: true,
      },
    })

    // Verificar si necesita revisión
    let needsReview = false
    if (activePlan && activePlan.lastReviewDate && activePlan.reviewFrequencyDays) {
      const daysSinceReview = Math.floor(
        (today.getTime() - activePlan.lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      needsReview = daysSinceReview >= activePlan.reviewFrequencyDays
    }

    return NextResponse.json({
      athlete: {
        id: athlete.id,
        fullName: athlete.fullName,
      },
      setting,
      currentWeek: {
        period: {
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0],
        },
        volume: currentVolume,
      },
      comparison: {
        changes: comparison.changes,
      },
      suggestions,
      correlations,
      review: {
        active: activePlan,
        needsReview,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/athletes/[id]/evolution:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
