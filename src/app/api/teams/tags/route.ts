import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import crypto from 'crypto'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, badRequest, forbidden } from '@/lib/api/error-response'
import type { TeamMetadata, CreateTagPayload, UpdateTagPayload, DeleteTagPayload } from '@/types/webhooks'

export const dynamic = 'force-dynamic'

async function resolveTeamId(session: { user: { id: string; role?: string } }, teamIdParam?: string | undefined) {
  const role = session.user.role ?? 'ATHLETE'
  if (role === 'ADMIN' && teamIdParam) return teamIdParam

  const ownMemberships = await prisma.teamUserMembership.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { teamId: true },
    orderBy: { createdAt: 'asc' },
  })
  if (ownMemberships.length === 0) return null
  return teamIdParam && ownMemberships.map((m) => m.teamId).includes(teamIdParam) ? teamIdParam : ownMemberships[0].teamId
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized('No autorizado')
  const { searchParams } = new URL(request.url)
  const teamIdParam = searchParams.get('teamId') ?? undefined
  const teamId = await resolveTeamId(session, teamIdParam)
  if (!teamId) return NextResponse.json({ teamId: null, tags: [] })
  const settings = await prisma.teamSettings.findUnique({ where: { teamId } })
  const metadata = settings?.metadata as TeamMetadata | undefined
  const tags = metadata?.tags ?? []
  const membership = await prisma.teamUserMembership.findFirst({ where: { teamId, userId: session.user.id, isActive: true }, select: { role: true } })
  const role = session.user.role ?? 'ATHLETE'
  const canManage = (role === 'ADMIN') || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  return NextResponse.json({ teamId, tags, canManage })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized('No autorizado')

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const { teamId: bodyTeamId, name } = parsed.data as CreateTagPayload
  if (!name) return badRequest('name es requerido')

  const teamId = await resolveTeamId(session, bodyTeamId)
  if (!teamId) return badRequest('No hay equipo asociado')

  const membership = await prisma.teamUserMembership.findFirst({ where: { teamId, userId: session.user.id, isActive: true }, select: { role: true } })
  const role = session.user.role ?? 'ATHLETE'
  const canManage = (role === 'ADMIN') || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return forbidden('Sin acceso al equipo')

  // Get existing metadata
  const settings = await prisma.teamSettings.findUnique({ where: { teamId } })
  const metadata = (settings?.metadata as TeamMetadata | undefined) ?? {}
  const tags = Array.isArray(metadata.tags) ? metadata.tags.slice() : []

  const newTag = { id: crypto.randomUUID(), name: String(name), slug: String(name).toLowerCase().replace(/\s+/g, '-'), createdAt: new Date().toISOString() }
  tags.push(newTag)

  if (settings) {
    await prisma.teamSettings.update({ where: { teamId }, data: { metadata: { ...metadata, tags } } })
  } else {
    await prisma.teamSettings.create({ data: { teamId, metadata: { tags } } })
  }

  return NextResponse.json(newTag, { status: 201 })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized('No autorizado')

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const { teamId: bodyTeamId, id, name } = parsed.data as UpdateTagPayload
  if (!id || !name) return badRequest('id y name son requeridos')

  const teamId = await resolveTeamId(session, bodyTeamId)
  if (!teamId) return badRequest('No hay equipo asociado')

  const membership = await prisma.teamUserMembership.findFirst({ where: { teamId, userId: session.user.id, isActive: true }, select: { role: true } })
  const role = session.user.role ?? 'ATHLETE'
  const canManage = (role === 'ADMIN') || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return forbidden('Sin acceso al equipo')

  const settings = await prisma.teamSettings.findUnique({ where: { teamId } })
  const metadata = (settings?.metadata as TeamMetadata | undefined) ?? {}
  const tags = Array.isArray(metadata.tags) ? metadata.tags.slice() : []

  const idx = tags.findIndex((t) => t.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Tag no encontrado' }, { status: 404 })
  tags[idx] = { ...tags[idx], name: String(name), slug: String(name).toLowerCase().replace(/\s+/g, '-') }

  await prisma.teamSettings.upsert({
    where: { teamId },
    update: { metadata: { ...metadata, tags } },
    create: { teamId, metadata: { tags } },
  })

  return NextResponse.json(tags[idx])
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized('No autorizado')

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const { teamId: bodyTeamId, id } = parsed.data as DeleteTagPayload
  if (!id) return badRequest('id es requerido')

  const teamId = await resolveTeamId(session, bodyTeamId)
  if (!teamId) return badRequest('No hay equipo asociado')

  const membership = await prisma.teamUserMembership.findFirst({ where: { teamId, userId: session.user.id, isActive: true }, select: { role: true } })
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  const canManage = (role === 'ADMIN') || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return forbidden('Sin acceso al equipo')

  const settings = await prisma.teamSettings.findUnique({ where: { teamId } })
  const metadata = (settings?.metadata as any) ?? {}
  const tags = Array.isArray(metadata.tags) ? metadata.tags.slice() : []

  const newTags = tags.filter((t: any) => t.id !== id)
  await prisma.teamSettings.upsert({ where: { teamId }, update: { metadata: { ...metadata, tags: newTags } }, create: { teamId, metadata: { tags: newTags } } })

  return NextResponse.json({ ok: true })
}
