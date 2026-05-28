import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'
import { parseJsonOrError } from '@/lib/api/json-parser'
import {
  unauthorized,
  forbidden,
  badRequest,
  notFound,
  serverError,
} from '@/lib/api/error-response'
import { teamCoachInviteSchema } from '@/lib/validators'

export const dynamic = 'force-dynamic'

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized('No autorizado')
  }

  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  if (role !== 'COACH' && role !== 'ADMIN') {
    return forbidden('Sin acceso')
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
    // Fallback: el coach no tiene fila en TeamUserMembership (DB legacy o creado sin flujo estándar).
    // Auto-reparar: buscar o crear un team y registrar la membresía, luego devolver el coach propio.
    const selfCoach = await prisma.coach.findUnique({
      where: { userId: session.user.id },
      include: { user: true },
    })
    if (!selfCoach) return NextResponse.json({ teamId: null, coaches: [] })

    // Buscar si existe algún team creado por este usuario (sin membresía activa)
    let repairTeam = await prisma.team.findFirst({
      where: { userMemberships: { some: { userId: session.user.id } } },
    })

    if (!repairTeam) {
      // Crear team propio
      repairTeam = await prisma.team.create({
        data: {
          name: `${selfCoach.displayName} Team`,
          slug: `${selfCoach.displayName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          settings: {
            create: {
              displayName: `${selfCoach.displayName} Team`,
              locale: 'es-ES',
              timezone: 'Europe/Madrid',
              currency: 'EUR',
            },
          },
        },
      })
    }

    // Upsert membresía
    await prisma.teamUserMembership.upsert({
      where: { teamId_userId: { teamId: repairTeam.id, userId: session.user.id } },
      create: { teamId: repairTeam.id, userId: session.user.id, role: 'ADMIN', isActive: true },
      update: { isActive: true },
    })

    return NextResponse.json({
      teamId: repairTeam.id,
      coaches: [
        {
          coachId: selfCoach.id,
          displayName: selfCoach.displayName,
          email: selfCoach.user.email,
          phone: selfCoach.phone,
          role: 'ADMIN',
        },
      ],
    })
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
    return unauthorized('No autorizado')
  }

  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  if (role !== 'COACH' && role !== 'ADMIN') {
    return forbidden('Sin acceso')
  }

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error

  const validated = teamCoachInviteSchema.safeParse(parsed.data)
  if (!validated.success) {
    return badRequest(validated.error.issues[0].message)
  }

  const { teamId, invitedEmail, inviteRole } = validated.data

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
      return forbidden('No eres admin del equipo')
    }
  }

  // Verificar que el equipo existe
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    return notFound('Equipo no encontrado')
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
