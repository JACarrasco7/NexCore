/**
 * GET /api/athletes/[id]/evolution/volume-summary
 * Volumen total y resumen agregado
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { calculateWeeklyVolumeByMuscle } from '@/lib/evolution'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificación de autorización
    const athlete = await prisma.athlete.findUnique({
      where: { id },
      select: { userId: true, coachId: true },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    if (session.user.id !== athlete.userId && session.user.id !== athlete.coachId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculando volumen actual
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const volume = await calculateWeeklyVolumeByMuscle(id, weekStart, weekEnd)
    const totalVolume = volume.reduce((sum, m) => sum + m.volume, 0)

    // Volumen de semana anterior para comparativa
    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(weekStart.getDate() - 7)
    const prevWeekEnd = new Date(prevWeekStart)
    prevWeekEnd.setDate(prevWeekStart.getDate() + 6)

    const prevVolume = await calculateWeeklyVolumeByMuscle(id, prevWeekStart, prevWeekEnd)
    const prevTotalVolume = prevVolume.reduce((sum, m) => sum + m.volume, 0)

    const percentageChange =
      prevTotalVolume > 0
        ? Math.round(((totalVolume - prevTotalVolume) / prevTotalVolume) * 100)
        : 0

    return NextResponse.json({
      summary: {
        currentWeek: {
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0],
          totalVolume,
        },
        previousWeek: {
          start: prevWeekStart.toISOString().split('T')[0],
          end: prevWeekEnd.toISOString().split('T')[0],
          totalVolume: prevTotalVolume,
        },
        percentageChange,
        trend: percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'stable',
      },
      byMuscle: volume,
    })
  } catch (error) {
    console.error('Error in GET /api/athletes/[id]/evolution/volume-summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
