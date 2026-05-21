/**
 * POST /api/athletes/[id]/evolution/review
 * Marcar revisión de evolución como completada
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { markEvolutionReview } from '@/lib/evolution'

export const dynamic = 'force-dynamic'

interface ReviewPayload {
  planId: string
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificación de autorización - solo coach
    const athlete = await prisma.athlete.findUnique({
      where: { id },
      select: { userId: true, coachId: true },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    if (session.user.id !== athlete.coachId) {
      return NextResponse.json({ error: 'Forbidden - only coach can mark review' }, { status: 403 })
    }

    const body: ReviewPayload = await _req.json()

    if (!body.planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    // Verificar que el plan existe y pertenece al atleta
    const plan = await prisma.plan.findUnique({
      where: { id: body.planId },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (plan.athleteId !== id) {
      return NextResponse.json({ error: 'Plan does not belong to this athlete' }, { status: 400 })
    }

    // Marcar revisión
    await markEvolutionReview(id, body.planId)

    return NextResponse.json({
      message: 'Evolution review marked as completed',
      plan: {
        id: body.planId,
        lastReviewDate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error in POST /api/athletes/[id]/evolution/review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
