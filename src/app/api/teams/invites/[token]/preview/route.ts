import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — Obtener datos de una invitación (sin aceptarla)
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Buscar la invitación
  const invite = await prisma.coachInvite.findUnique({
    where: { token },
    include: { team: { select: { name: true } } },
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

  return NextResponse.json({
    invitedEmail: invite.invitedEmail,
    teamName: invite.team.name,
    role: invite.role,
    expiresAt: invite.expiresAt.toISOString(),
  })
}
