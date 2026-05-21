import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, badRequest, serverError, notFound } from '@/lib/api/error-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized('No autorizado')
  }

  const profile = await prisma.coach.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { email: true } } },
  })

  if (!profile) {
    return notFound('Perfil no encontrado')
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
    return unauthorized('No autorizado')
  }

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const body = parsed.data as any
  const { displayName, bio } = body

  if (!displayName || displayName.trim().length === 0) {
    return badRequest('displayName es requerido')
  }

  try {
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
  } catch (err) {
    console.error('[me/coach] patch', err)
    return serverError('Error actualizando perfil')
  }
}
