import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, forbidden, badRequest, notFound, serverError } from '@/lib/api/error-response'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/teams/[teamId]
 * Editar configuración del equipo (solo ADMIN del equipo)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return unauthorized('No autorizado')
  }

  // Verificar que es miembro del equipo con rol ADMIN
  const membership = await prisma.teamUserMembership.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: 'ADMIN',
      isActive: true,
    },
  })

  if (!membership) {
    return forbidden('No tienes permisos para editar este equipo')
  }

  // Verificar que el equipo existe
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    return notFound('Equipo no encontrado')
  }

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const { name, slug } = parsed.data as { name?: unknown; slug?: unknown }

  const updateData: Record<string, unknown> = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return badRequest('name debe ser un string no vacío')
    }
    updateData.name = name.trim()
  }

  if (slug !== undefined) {
    const trimmedSlug = slug === null ? null : String(slug).trim().toLowerCase()
    if (trimmedSlug && !/^[a-z0-9-]+$/.test(trimmedSlug)) {
      return badRequest('slug debe contener solo letras minúsculas, números y guiones')
    }
    updateData.slug = trimmedSlug
  }

  if (Object.keys(updateData).length === 0) {
    return badRequest('No hay campos para actualizar')
  }

  try {
    const updated = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
  } catch (err) {
    const error = err as { code?: string; meta?: { target?: string[] } } | unknown
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any)?.code === 'P2002' && (error as any)?.meta?.target?.includes('slug')) {
      return NextResponse.json({ error: 'Este slug ya existe' }, { status: 409 })
    }

    console.error('[teams-update]', err)
    return serverError('Error actualizando equipo')
  }
}

/**
 * DELETE /api/teams/[teamId]
 * Eliminar equipo (solo ADMIN del equipo, soft-delete de datos relevantes)
 * Nota: Solo se elimina si el equipo no tiene atletas activos
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return unauthorized('No autorizado')
  }

  const membership = await prisma.teamUserMembership.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: 'ADMIN',
      isActive: true,
    },
  })

  if (!membership) {
    return forbidden('No tienes permisos para eliminar este equipo')
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    return notFound('Equipo no encontrado')
  }

  // Verificar si hay atletas activos en el equipo
  const athleteCount = await prisma.athlete.count({
    where: { teamId },
  })

  if (athleteCount > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: hay ${athleteCount} atletas en este equipo` },
      { status: 409 }
    )
  }

  try {
    // Eliminar memberships del equipo
    await prisma.teamUserMembership.updateMany({
      where: { teamId },
      data: { isActive: false },
    })

    // Eliminar team
    await prisma.team.delete({ where: { id: teamId } })

    return NextResponse.json({ success: true })
  } catch (_err) {
    console.error('[teams-delete]', _err)
    return serverError('Error eliminando equipo')
  }
}
