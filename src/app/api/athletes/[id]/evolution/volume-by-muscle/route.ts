/**
 * GET /api/athletes/[id]/evolution/volume-by-muscle
 * Volumen detallado por grupo muscular
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { calculateWeeklyVolumeByMuscle, getVolumeComparison } from '@/lib/evolution'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Obtener parámetro de semanas atrás (default: 0 = actual)
    const weeksBack = parseInt(req.nextUrl.searchParams.get('weeksBack') || '0')

    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay() - weeksBack * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const volume = await calculateWeeklyVolumeByMuscle(id, weekStart, weekEnd)
    const comparison = await getVolumeComparison(id)

    return NextResponse.json({
      period: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
        weeksBack,
      },
      muscles: volume,
      comparison: {
        currentWeek: comparison.currentWeek,
        previousWeek: comparison.previousWeek,
        changes: comparison.changes,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/athletes/[id]/evolution/volume-by-muscle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
