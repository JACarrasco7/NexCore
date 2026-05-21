import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import crypto from 'crypto'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { badRequest, unauthorized, forbidden, notFound, serverError } from '@/lib/api/error-response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  const { searchParams } = new URL(request.url)
  const teamIdParam = searchParams.get('teamId') ?? undefined

  if (role === 'ADMIN') {
    if (!teamIdParam) return NextResponse.json({ teamId: null, phases: [], canManage: false })
    const phases = await prisma.teamPhase.findMany({ where: { teamId: teamIdParam }, orderBy: { order: 'asc' } })
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
  const teamId = teamIdParam && allowedTeamIds.includes(teamIdParam) ? teamIdParam : allowedTeamIds[0]

  const phases = await prisma.teamPhase.findMany({ where: { teamId }, orderBy: { order: 'asc' } })
  const membership = await prisma.teamUserMembership.findFirst({ where: { teamId, userId: session.user.id, isActive: true }, select: { role: true } })
  const canManage = (role === 'ADMIN') || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  return NextResponse.json({ teamId, phases, canManage })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized('No autorizado')
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const body = parsed.data as any
  const { teamId: bodyTeamId, code, label, description, order } = body

  let teamId = bodyTeamId
  if (!teamId) {
    const ownMemberships = await prisma.teamUserMembership.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { teamId: true },
      orderBy: { createdAt: 'asc' },
    })
    if (ownMemberships.length === 0) return badRequest('No hay equipo asociado')
    teamId = ownMemberships[0].teamId
  }

  const membership = await prisma.teamUserMembership.findFirst({ where: { teamId, userId: session.user.id, isActive: true }, select: { role: true } })
  const canManage = (role === 'ADMIN') || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return forbidden('Sin acceso al equipo')

  if (!label || !code) return badRequest('label y code son requeridos')

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
    return serverError('Error creando fase')
  }
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  if (role !== 'COACH' && role !== 'ADMIN') return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const body = parsed.data as any
  const { id, code, label, description, order } = body
  if (!id) return badRequest('id es requerido')

  const phase = await prisma.teamPhase.findUnique({ where: { id }, select: { teamId: true } })
  if (!phase) return notFound('Fase no encontrada')

  const membership = await prisma.teamUserMembership.findFirst({ where: { teamId: phase.teamId, userId: session.user.id, isActive: true }, select: { role: true } })
  const canManage = (role === 'ADMIN') || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return forbidden('Sin acceso al equipo')

  try {
    const updated = await prisma.teamPhase.update({ where: { id }, data: { code: code ?? undefined, label: label ?? undefined, description: description ?? undefined, order: typeof order === 'number' ? order : undefined } })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[team/phases] patch', err)
    return serverError('Error actualizando fase')
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  if (role !== 'COACH' && role !== 'ADMIN') return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const body = parsed.data as any
  const { id } = body
  if (!id) return badRequest('id es requerido')

  const phase = await prisma.teamPhase.findUnique({ where: { id }, select: { teamId: true } })
  if (!phase) return notFound('Fase no encontrada')

  const membership = await prisma.teamUserMembership.findFirst({ where: { teamId: phase.teamId, userId: session.user.id, isActive: true }, select: { role: true } })
  const canManage = (role === 'ADMIN') || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return forbidden('Sin acceso al equipo')

  try {
    await prisma.teamPhase.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[team/phases] delete', err)
    return serverError('Error eliminando fase')
  }
}
