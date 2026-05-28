import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

async function resolveTeamId(session: any, teamIdParam?: string | undefined) {
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  if (role === 'ADMIN' && teamIdParam) return teamIdParam

  const ownMemberships = await prisma.teamUserMembership.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { teamId: true },
    orderBy: { createdAt: 'asc' },
  })
  if (ownMemberships.length === 0) return null
  return teamIdParam && ownMemberships.map((m) => m.teamId).includes(teamIdParam)
    ? teamIdParam
    : ownMemberships[0].teamId
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const teamIdParam = searchParams.get('teamId') ?? undefined
  const teamId = await resolveTeamId(session, teamIdParam)
  if (!teamId) return NextResponse.json({ teamId: null, tags: [] })
  const settings = await prisma.teamSettings.findUnique({ where: { teamId } })
  const tags = (settings?.metadata as any)?.tags ?? []
  const membership = await prisma.teamUserMembership.findFirst({
    where: { teamId, userId: session.user.id, isActive: true },
    select: { role: true },
  })
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  const canManage =
    role === 'ADMIN' || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  return NextResponse.json({ teamId, tags, canManage })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { teamId: bodyTeamId, name } = body
  if (!name) return NextResponse.json({ error: 'name es requerido' }, { status: 400 })

  const teamId = await resolveTeamId(session, bodyTeamId)
  if (!teamId) return NextResponse.json({ error: 'No hay equipo asociado' }, { status: 400 })

  const membership = await prisma.teamUserMembership.findFirst({
    where: { teamId, userId: session.user.id, isActive: true },
    select: { role: true },
  })
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  const canManage =
    role === 'ADMIN' || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return NextResponse.json({ error: 'Sin acceso al equipo' }, { status: 403 })

  // Get existing metadata
  const settings = await prisma.teamSettings.findUnique({ where: { teamId } })
  const metadata = (settings?.metadata as any) ?? {}
  const tags = Array.isArray(metadata.tags) ? metadata.tags.slice() : []

  const newTag = {
    id: crypto.randomUUID(),
    name: String(name),
    slug: String(name).toLowerCase().replace(/\s+/g, '-'),
    createdAt: new Date().toISOString(),
  }
  tags.push(newTag)

  if (settings) {
    await prisma.teamSettings.update({
      where: { teamId },
      data: { metadata: { ...metadata, tags } },
    })
  } else {
    await prisma.teamSettings.create({ data: { teamId, metadata: { tags } } })
  }

  return NextResponse.json(newTag, { status: 201 })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { teamId: bodyTeamId, id, name } = body
  if (!id || !name) return NextResponse.json({ error: 'id y name son requeridos' }, { status: 400 })

  const teamId = await resolveTeamId(session, bodyTeamId)
  if (!teamId) return NextResponse.json({ error: 'No hay equipo asociado' }, { status: 400 })

  const membership = await prisma.teamUserMembership.findFirst({
    where: { teamId, userId: session.user.id, isActive: true },
    select: { role: true },
  })
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  const canManage =
    role === 'ADMIN' || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return NextResponse.json({ error: 'Sin acceso al equipo' }, { status: 403 })

  const settings = await prisma.teamSettings.findUnique({ where: { teamId } })
  const metadata = (settings?.metadata as any) ?? {}
  const tags = Array.isArray(metadata.tags) ? metadata.tags.slice() : []

  const idx = tags.findIndex((t: any) => t.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Tag no encontrado' }, { status: 404 })
  tags[idx] = {
    ...tags[idx],
    name: String(name),
    slug: String(name).toLowerCase().replace(/\s+/g, '-'),
  }

  await prisma.teamSettings.upsert({
    where: { teamId },
    update: { metadata: { ...metadata, tags } },
    create: { teamId, metadata: { tags } },
  })

  return NextResponse.json(tags[idx])
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { teamId: bodyTeamId, id } = body
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })

  const teamId = await resolveTeamId(session, bodyTeamId)
  if (!teamId) return NextResponse.json({ error: 'No hay equipo asociado' }, { status: 400 })

  const membership = await prisma.teamUserMembership.findFirst({
    where: { teamId, userId: session.user.id, isActive: true },
    select: { role: true },
  })
  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  const canManage =
    role === 'ADMIN' || (role === 'COACH' && !!membership) || membership?.role === 'ADMIN'
  if (!canManage) return NextResponse.json({ error: 'Sin acceso al equipo' }, { status: 403 })

  const settings = await prisma.teamSettings.findUnique({ where: { teamId } })
  const metadata = (settings?.metadata as any) ?? {}
  const tags = Array.isArray(metadata.tags) ? metadata.tags.slice() : []

  const newTags = tags.filter((t: any) => t.id !== id)
  await prisma.teamSettings.upsert({
    where: { teamId },
    update: { metadata: { ...metadata, tags: newTags } },
    create: { teamId, metadata: { tags: newTags } },
  })

  return NextResponse.json({ ok: true })
}
