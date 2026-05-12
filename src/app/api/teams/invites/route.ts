import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

// GET — Listar invitaciones pendientes del equipo
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  if (role !== 'COACH' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')

  if (!teamId) {
    return NextResponse.json({ error: 'teamId requerido' }, { status: 400 })
  }

  // Solo ADMIN, o COACH que es miembro del equipo
  if (role === 'COACH') {
    const isMember = await prisma.teamUserMembership.findFirst({
      where: {
        userId: session.user.id,
        teamId,
        isActive: true,
      },
    })
    if (!isMember) {
      return NextResponse.json({ error: 'No eres miembro del equipo' }, { status: 403 })
    }
  }

  // Listar invitaciones pendientes (no aceptadas y no expiradas)
  const invites = await prisma.coachInvite.findMany({
    where: {
      teamId,
      acceptedAt: null,
      expiresAt: { gt: new Date() }, // No expiradas
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    teamId,
    invites: invites.map((inv) => ({
      id: inv.id,
      token: inv.token, // Safe: solo lo ve el admin del equipo
      invitedEmail: inv.invitedEmail,
      role: inv.role,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
      acceptedAt: inv.acceptedAt?.toISOString() ?? null,
    })),
  })
}
