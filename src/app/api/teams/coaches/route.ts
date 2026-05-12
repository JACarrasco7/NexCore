import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

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
  const teamIdParam = searchParams.get('teamId') ?? undefined

  // ADMIN can inspect any team by query. COACH is restricted to own memberships.
  if (role === 'ADMIN') {
    if (!teamIdParam) return NextResponse.json({ teamId: null, coaches: [] })

    const memberships = await prisma.teamUserMembership.findMany({
      where: { teamId: teamIdParam, isActive: true },
      include: { user: { include: { coachProfile: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({
      teamId: teamIdParam,
      coaches: memberships
        .filter((m) => m.user.coachProfile)
        .map((m) => ({
          coachId: m.user.coachProfile!.id,
          displayName: m.user.coachProfile!.displayName,
          email: m.user.email,
          phone: m.user.coachProfile!.phone,
          role: m.role,
        })),
    })
  }

  const ownMemberships = await prisma.teamUserMembership.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { teamId: true },
    orderBy: { createdAt: 'asc' },
  })

  if (ownMemberships.length === 0) {
    return NextResponse.json({ teamId: null, coaches: [] })
  }

  const allowedTeamIds = ownMemberships.map((m) => m.teamId)
  const teamId =
    teamIdParam && allowedTeamIds.includes(teamIdParam) ? teamIdParam : allowedTeamIds[0]

  const memberships = await prisma.teamUserMembership.findMany({
    where: { teamId, isActive: true },
    include: { user: { include: { coachProfile: true } } },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json({
    teamId,
    coaches: memberships
      .filter((m) => m.user.coachProfile)
      .map((m) => ({
        coachId: m.user.coachProfile!.id,
        displayName: m.user.coachProfile!.displayName,
        email: m.user.email,
        phone: m.user.coachProfile!.phone,
        role: m.role,
      })),
  })
}

// POST — Invitar coach por email al equipo
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  if (role !== 'COACH' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { teamId, invitedEmail, inviteRole = 'MEMBER' } = body

  if (!teamId || !invitedEmail) {
    return NextResponse.json({ error: 'teamId y invitedEmail requeridos' }, { status: 400 })
  }

  // Solo ADMIN puede invitar, o COACH que es ADMIN de su equipo
  if (role === 'COACH') {
    const hasAdminRole = await prisma.teamUserMembership.findFirst({
      where: {
        userId: session.user.id,
        teamId,
        role: 'ADMIN',
        isActive: true,
      },
    })
    if (!hasAdminRole) {
      return NextResponse.json({ error: 'No eres admin del equipo' }, { status: 403 })
    }
  }

  // Verificar que el equipo existe
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  }

  // Evitar invitación duplicada
  const existing = await prisma.coachInvite.findUnique({
    where: { teamId_invitedEmail: { teamId, invitedEmail } },
  })
  if (existing && !existing.acceptedAt) {
    return NextResponse.json({ error: 'Invitación pendiente ya existe' }, { status: 409 })
  }

  // Crear invitación
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días

  const invite = await prisma.coachInvite.create({
    data: {
      teamId,
      invitedEmail,
      invitedByUserId: session.user.id,
      token,
      role: inviteRole === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      expiresAt,
    },
  })

  // Enviar email con enlace de aceptación
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const acceptUrl = `${baseUrl}/auth/accept-invite?token=${token}`
    const roleLabel = inviteRole === 'ADMIN' ? 'Administrador' : 'Miembro'

    await sendEmail({
      to: invitedEmail,
      subject: `Invitación a unirte a ${team.name} — CARRIX Coach`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1a1a1a">¡Has sido invitado!</h2>
          <p style="color:#555">Se te ha invitado a unirte al equipo <strong>${team.name}</strong> como <strong>${roleLabel}</strong>.</p>
          <p style="color:#555">Esta invitación caduca en 7 días.</p>
          <a href="${acceptUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:9999px;text-decoration:none;font-weight:600">
            Aceptar invitación
          </a>
          <p style="color:#aaa;font-size:12px">Si no esperabas esta invitación, puedes ignorar este mensaje.</p>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('[coach-invite:email-failed]', emailErr)
    // No fallar la creación de invitación si el email falla
    // El usuario admin puede reintentar desde la UI
  }

  return NextResponse.json({ invite, ok: true })
}
