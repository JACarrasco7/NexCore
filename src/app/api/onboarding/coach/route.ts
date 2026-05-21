import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { displayName, bio, specialty } = await req.json()
    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'displayName requerido' }, { status: 400 })
    }

    // Si el token tiene userId stale (tras seed), resolver por email
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    })
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { id: true, email: true },
      })
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Sesión desactualizada. Cierra sesión y vuelve a entrar.' },
        { status: 401 }
      )
    }

    const existing = await prisma.coach.findUnique({ where: { userId: user.id } })

    const coach = await prisma.$transaction(async (tx) => {
      const coachData = existing
        ? await tx.coach.update({
            where: { id: existing.id },
            data: {
              displayName: displayName.trim(),
              bio: bio?.trim() || null,
            },
          })
        : await tx.coach.create({
            data: {
              userId: user.id,
              displayName: displayName.trim(),
              bio: bio?.trim() || null,
              trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
            },
          })

      await tx.user.update({
        where: { id: user.id },
        data: { name: displayName.trim() },
      })

      return coachData
    })

    return NextResponse.json({
      id: coach.id,
      displayName: coach.displayName,
      specialty: specialty ?? null,
    })
  } catch (error) {
    console.error('onboarding/coach POST failed', error)
    return NextResponse.json(
      { error: 'Error interno al guardar onboarding de coach' },
      { status: 500 }
    )
  }
}
