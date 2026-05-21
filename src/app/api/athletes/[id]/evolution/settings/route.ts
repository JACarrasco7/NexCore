/**
 * PUT /api/athletes/[id]/evolution/settings
 * Actualizar configuración de evolución del atleta
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface UpdateSettingsPayload {
  muscleGroups?: string[]
  volumeGoals?: Record<string, [number, number]>
  enableAutoSuggestions?: boolean
  suggestionThreshold?: number
  enabledCharts?: Record<string, boolean>
}

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificación de autorización - solo el coach del atleta
    const athlete = await prisma.athlete.findUnique({
      where: { id },
      select: { userId: true, coachId: true },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // Solo coach puede actualizar settings
    if (session.user.id !== athlete.coachId) {
      return NextResponse.json(
        { error: 'Forbidden - only coach can update settings' },
        { status: 403 }
      )
    }

    const body: UpdateSettingsPayload = await _req.json()

    // Validaciones
    if (body.muscleGroups && !Array.isArray(body.muscleGroups)) {
      return NextResponse.json({ error: 'muscleGroups must be an array' }, { status: 400 })
    }

    if (body.volumeGoals && typeof body.volumeGoals !== 'object') {
      return NextResponse.json({ error: 'volumeGoals must be an object' }, { status: 400 })
    }

    if (body.suggestionThreshold !== undefined) {
      if (body.suggestionThreshold < 0 || body.suggestionThreshold > 100) {
        return NextResponse.json(
          { error: 'suggestionThreshold must be between 0 and 100' },
          { status: 400 }
        )
      }
    }

    // Obtener o crear EvolutionSetting
    let setting = await prisma.evolutionSetting.findUnique({
      where: { athleteId: id },
    })

    if (!setting) {
      setting = await prisma.evolutionSetting.create({
        data: {
          athleteId: id,
          muscleGroups: body.muscleGroups || [],
          volumeGoals: body.volumeGoals || {},
          enableAutoSuggestions: body.enableAutoSuggestions ?? true,
          suggestionThreshold: body.suggestionThreshold ?? 15,
          enabledCharts: body.enabledCharts || {},
        },
      })
    } else {
      // Actualizar
      setting = await prisma.evolutionSetting.update({
        where: { athleteId: id },
        data: {
          ...(body.muscleGroups !== undefined && { muscleGroups: body.muscleGroups }),
          ...(body.volumeGoals !== undefined && { volumeGoals: body.volumeGoals }),
          ...(body.enableAutoSuggestions !== undefined && {
            enableAutoSuggestions: body.enableAutoSuggestions,
          }),
          ...(body.suggestionThreshold !== undefined && {
            suggestionThreshold: body.suggestionThreshold,
          }),
          ...(body.enabledCharts !== undefined && { enabledCharts: body.enabledCharts }),
        },
      })
    }

    return NextResponse.json({
      message: 'Evolution settings updated',
      setting,
    })
  } catch (error) {
    console.error('Error in PUT /api/athletes/[id]/evolution/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
