/**
 * GET /api/athletes/[id]/evolution/volume-by-exercise
 * Volumen agregado por ejercicio individual
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

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

    // Volumen por ejercicio en últimas 4 semanas
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    const sessionLogs = await prisma.sessionLog.findMany({
      where: {
        athleteId: id,
        date: {
          gte: fourWeeksAgo,
        },
      },
      include: {
        sets: true,
      },
    })

    // Agregar volumen por ejercicio
    const volumeByExercise: Record<
      string,
      {
        exercise: string
        volume: number
        sessions: Set<string>
        avgLoadKg: number
        avgReps: number
      }
    > = {}

    for (const session of sessionLogs) {
      for (const set of session.sets) {
        if (!volumeByExercise[set.exercise]) {
          volumeByExercise[set.exercise] = {
            exercise: set.exercise,
            volume: 0,
            sessions: new Set(),
            avgLoadKg: 0,
            avgReps: 0,
          }
        }
        volumeByExercise[set.exercise].volume += 1
        volumeByExercise[set.exercise].sessions.add(session.id)
        volumeByExercise[set.exercise].avgLoadKg += set.loadKg || 0
        volumeByExercise[set.exercise].avgReps += set.reps || 0
      }
    }

    // Convertir a array y calcular promedios
    const result = Object.values(volumeByExercise)
      .map((item) => ({
        exercise: item.exercise,
        volume: item.volume,
        sessions: item.sessions.size,
        avgLoadKg: Math.round((item.avgLoadKg / item.volume) * 10) / 10,
        avgReps: Math.round((item.avgReps / item.volume) * 10) / 10,
      }))
      .sort((a, b) => b.volume - a.volume)

    return NextResponse.json({
      period: {
        start: fourWeeksAgo.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        label: '4 semanas',
      },
      exercises: result,
      totalUniqueExercises: result.length,
      totalVolume: result.reduce((sum, e) => sum + e.volume, 0),
    })
  } catch (error) {
    console.error('Error in GET /api/athletes/[id]/evolution/volume-by-exercise:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
