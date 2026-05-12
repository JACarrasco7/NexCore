import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const profile = await prisma.coach.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { email: true } } },
  })

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    id: profile.id,
    displayName: profile.displayName,
    phone: profile.phone,
    phoneVerified: profile.phoneVerified,
    bio: profile.bio,
    email: profile.user.email,
    trialEndsAt: profile.trialEndsAt?.toISOString() ?? null,
  })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { displayName, bio } = body

  if (!displayName || displayName.trim().length === 0) {
    return NextResponse.json({ error: 'displayName es requerido' }, { status: 400 })
  }

  const updated = await prisma.coach.update({
    where: { userId: session.user.id },
    data: {
      displayName: displayName.trim(),
      bio: bio ? bio.trim() : null,
    },
    include: { user: { select: { email: true } } },
  })

  return NextResponse.json({
    id: updated.id,
    displayName: updated.displayName,
    phone: updated.phone,
    phoneVerified: updated.phoneVerified,
    bio: updated.bio,
    email: updated.user.email,
    trialEndsAt: updated.trialEndsAt?.toISOString() ?? null,
  })
}
