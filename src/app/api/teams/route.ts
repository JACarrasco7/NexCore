import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp, getRateLimitKey } from '@/lib/rate-limit'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { badRequest, unauthorized, forbidden, tooManyRequests, serverError } from '@/lib/api/error-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/teams
 * Lista los equipos en los que el usuario es miembro (para coaches)
 * ADMIN puede listar todos los equipos
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role

  if (role === 'COACH') {
    // Coach: listar sus equipos
    const memberships = await prisma.teamUserMembership.findMany({
      where: { userId: session.user.id, isActive: true },
      include: { team: true },
      orderBy: { createdAt: 'asc' },
    })

    const teams = memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      slug: m.team.slug,
      role: m.role,
      createdAt: m.team.createdAt,
      updatedAt: m.team.updatedAt,
    }))

    return NextResponse.json(teams)
  } else if (role === 'ADMIN') {
    // ADMIN: listar todos los equipos (con limit)
    const teams = await prisma.team.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(teams)
  } else {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }
}

/**
 * POST /api/teams
 * Crear nuevo equipo (solo COACH y ADMIN)
 * El creador se convierte automáticamente en ADMIN del equipo
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Rate limiting to prevent team creation spam
  const clientIp = getClientIp(request.headers)
  const rateLimitKey = getRateLimitKey(clientIp, session.user.id)
  const { ok } = await checkRateLimit(rateLimitKey, 5, 60) // 5 req/min per user
  if (!ok) return tooManyRequests()

  const role = (session.user as { role?: string }).role
  if (role !== 'COACH' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo coaches pueden crear equipos' }, { status: 403 })
  }

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const body = parsed.data as any
  const { name, slug } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return badRequest('name es requerido y debe ser un string no vacío')
  }

  const trimmedName = name.trim()
  const trimmedSlug = slug ? String(slug).trim().toLowerCase() : null

  // Validar slug si se proporciona
  if (trimmedSlug && !/^[a-z0-9-]+$/.test(trimmedSlug)) {
    return NextResponse.json(
      { error: 'slug debe contener solo letras minúsculas, números y guiones' },
      { status: 400 }
    )
  }

  try {
    // Crear equipo en transacción
    const { team, membership } = await prisma.$transaction(async (tx) => {
      // Crear team
      const newTeam = await tx.team.create({
        data: {
          name: trimmedName,
          slug: trimmedSlug,
        },
      })

      // Crear membresía del creador como ADMIN
      const newMembership = await tx.teamUserMembership.create({
        data: {
          teamId: newTeam.id,
          userId: session.user.id,
          role: 'ADMIN',
          isActive: true,
        },
      })

      return { team: newTeam, membership: newMembership }
    })

    return NextResponse.json(
      {
        id: team.id,
        name: team.name,
        slug: team.slug,
        role: membership.role,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      },
      { status: 201 }
    )
  } catch (err: any) {
    // Validar violación de unique constraint en slug
    if (err?.code === 'P2002' && err?.meta?.target?.includes('slug')) {
      return NextResponse.json({ error: 'Este slug ya existe' }, { status: 409 })
    }
    console.error('[teams-create]', err)
    return serverError('Error creando equipo')
  }
}
