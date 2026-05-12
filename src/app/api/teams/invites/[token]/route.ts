import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

// POST — Aceptar invitación por token
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Buscar la invitación
  const invite = await prisma.coachInvite.findUnique({
    where: { token },
    include: { team: true },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Token inválido o no existe' }, { status: 404 })
  }

  // Verificar que no esté expirada
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invitación expirada' }, { status: 410 })
  }

  // Verificar que no esté ya aceptada
  if (invite.acceptedAt) {
    return NextResponse.json({ error: 'Invitación ya aceptada' }, { status: 409 })
  }

  // Verificar que el email del usuario coincida
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user || user.email !== invite.invitedEmail) {
    return NextResponse.json({ error: 'Email no coincide con la invitación' }, { status: 403 })
  }

  // Crear coach profile si no existe
  let coachProfile = await prisma.coach.findUnique({
    where: { userId: session.user.id },
  })

  if (!coachProfile) {
    coachProfile = await prisma.coach.create({
      data: {
        userId: session.user.id,
        displayName: user.name ?? user.email ?? 'Coach',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      },
    })
  }

  // Crear membership en el equipo
  const membership = await prisma.teamUserMembership.create({
    data: {
      teamId: invite.teamId,
      userId: session.user.id,
      role: invite.role,
      isActive: true,
    },
  })

  // Marcar invitación como aceptada
  const acceptedInvite = await prisma.coachInvite.update({
    where: { id: invite.id },
    data: {
      acceptedAt: new Date(),
      acceptedByUserId: session.user.id,
    },
  })

  return NextResponse.json({
    ok: true,
    team: { id: invite.team.id, name: invite.team.name },
    membership,
    invite: acceptedInvite,
  })
}
