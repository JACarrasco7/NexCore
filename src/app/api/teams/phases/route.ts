import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  const { searchParams } = new URL(request.url)
  const teamIdParam = searchParams.get('teamId') ?? undefined

  if (role === 'ADMIN') {
    if (!teamIdParam) return NextResponse.json({ teamId: null, phases: [], canManage: false })
    const phases = await prisma.teamPhase.findMany({
      where: { teamId: teamIdParam },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ teamId: teamIdParam, phases, canManage: true })
  }

  const ownMemberships = await prisma.teamUserMembership.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { teamId: true },
    orderBy: { createdAt: 'asc' },
  })

  if (ownMemberships.length === 0) {
    return NextResponse.json({ teamId: null, phases: [] })
  }

  const allowedTeamIds = ownMemberships.map((m) => m.teamId)
  const teamId =
    teamIdParam && allowedTeamIds.includes(teamIdParam) ? teamIdParam : allowedTeamIds[0]

  const phases = await prisma.teamPhase.findMany({ where: { teamId }, orderBy: { order: 'asc' } })
  const membership = await prisma.teamUserMembership.findFirst({
    where: { teamId, userId: session.user.id, isActive: true },
    select: { role: true },
  })
  const canManage =
    role === 'ADMIN' || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  return NextResponse.json({ teamId, phases, canManage })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'

  const body = await request.json().catch(() => ({}))
  const { teamId: bodyTeamId, code, label, description, order } = body

  let teamId = bodyTeamId
  if (!teamId) {
    const ownMemberships = await prisma.teamUserMembership.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { teamId: true },
      orderBy: { createdAt: 'asc' },
    })
    if (ownMemberships.length === 0)
      return NextResponse.json({ error: 'No hay equipo asociado' }, { status: 400 })
    teamId = ownMemberships[0].teamId
  }

  const membership = await prisma.teamUserMembership.findFirst({
    where: { teamId, userId: session.user.id, isActive: true },
    select: { role: true },
  })
  const canManage =
    role === 'ADMIN' || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return NextResponse.json({ error: 'Sin acceso al equipo' }, { status: 403 })

  if (!label || !code)
    return NextResponse.json({ error: 'label y code son requeridos' }, { status: 400 })

  try {
    const created = await prisma.teamPhase.create({
      data: {
        teamId,
        code: String(code),
        label: String(label),
        description: description ?? null,
        order: typeof order === 'number' ? order : 0,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('[team/phases] create', err)
    return NextResponse.json({ error: 'Error creando fase' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  if (role !== 'COACH' && role !== 'ADMIN')
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { id, code, label, description, order } = body
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })

  const phase = await prisma.teamPhase.findUnique({ where: { id }, select: { teamId: true } })
  if (!phase) return NextResponse.json({ error: 'Fase no encontrada' }, { status: 404 })

  const membership = await prisma.teamUserMembership.findFirst({
    where: { teamId: phase.teamId, userId: session.user.id, isActive: true },
    select: { role: true },
  })
  const canManage =
    role === 'ADMIN' || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return NextResponse.json({ error: 'Sin acceso al equipo' }, { status: 403 })

  try {
    const updated = await prisma.teamPhase.update({
      where: { id },
      data: {
        code: code ?? undefined,
        label: label ?? undefined,
        description: description ?? undefined,
        order: typeof order === 'number' ? order : undefined,
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[team/phases] patch', err)
    return NextResponse.json({ error: 'Error actualizando fase' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  if (role !== 'COACH' && role !== 'ADMIN')
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })

  const phase = await prisma.teamPhase.findUnique({ where: { id }, select: { teamId: true } })
  if (!phase) return NextResponse.json({ error: 'Fase no encontrada' }, { status: 404 })

  const membership = await prisma.teamUserMembership.findFirst({
    where: { teamId: phase.teamId, userId: session.user.id, isActive: true },
    select: { role: true },
  })
  const canManage =
    role === 'ADMIN' || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return NextResponse.json({ error: 'Sin acceso al equipo' }, { status: 403 })

  try {
    await prisma.teamPhase.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[team/phases] delete', err)
    return NextResponse.json({ error: 'Error eliminando fase' }, { status: 500 })
  }
}
