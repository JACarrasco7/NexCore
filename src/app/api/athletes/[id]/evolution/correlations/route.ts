/**
 * GET /api/athletes/[id]/evolution/correlations
 * Análisis de correlaciones: volumen ↔ peso ↔ adherencia
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { analyzeCorrelations } from '@/lib/evolution'

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

    const correlations = await analyzeCorrelations(id)

    return NextResponse.json({
      insights: {
        description:
          'Análisis de correlaciones entre métricas de entrenamiento. Valores cercanos a 1 indican relación directa, cercanos a -1 relación inversa, cercanos a 0 sin relación.',
      },
      correlations,
      recommendations: correlations
        .filter((c) => c.strength === 'fuerte')
        .map((c) => ({
          metrics: `${c.metric1} ↔ ${c.metric2}`,
          correlation: c.correlation.toFixed(2),
          action:
            c.correlation > 0.5
              ? `Aumentar ambos mantiene el progreso.`
              : `Cuidado: aumentar uno reduce el otro.`,
        })),
    })
  } catch (error) {
    console.error('Error in GET /api/athletes/[id]/evolution/correlations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
