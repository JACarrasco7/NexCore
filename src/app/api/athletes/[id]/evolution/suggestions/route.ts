/**
 * GET /api/athletes/[id]/evolution/suggestions
 * Sugerencias automáticas basadas en volumen y correlaciones
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateAutoSuggestions } from '@/lib/evolution'

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

    const suggestions = await generateAutoSuggestions(id)

    // Agrupar por tipo
    const byType = {
      aumento: suggestions.filter((s) => s.type === 'aumento'),
      reduccion: suggestions.filter((s) => s.type === 'reduccion'),
      advertencia: suggestions.filter((s) => s.type === 'advertencia'),
      mantenimiento: suggestions.filter((s) => s.type === 'mantenimiento'),
    }

    return NextResponse.json({
      summary: {
        total: suggestions.length,
        hasSuggestions: suggestions.length > 0,
        priority:
          byType.advertencia.length > 0
            ? 'alta'
            : byType.aumento.length > 0 || byType.reduccion.length > 0
              ? 'media'
              : 'baja',
      },
      byType,
      all: suggestions,
    })
  } catch (error) {
    console.error('Error in GET /api/athletes/[id]/evolution/suggestions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
