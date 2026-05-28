import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/teams/[teamId]
 * Editar configuración del equipo (solo ADMIN del equipo)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role

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
    return NextResponse.json(
      { error: 'No tienes permisos para editar este equipo' },
      { status: 403 }
    )
  }

  // Verificar que el equipo existe
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const { name, slug } = body

  const updateData: any = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name debe ser un string no vacío' }, { status: 400 })
    }
    updateData.name = name.trim()
  }

  if (slug !== undefined) {
    const trimmedSlug = slug === null ? null : String(slug).trim().toLowerCase()
    if (trimmedSlug && !/^[a-z0-9-]+$/.test(trimmedSlug)) {
      return NextResponse.json(
        { error: 'slug debe contener solo letras minúsculas, números y guiones' },
        { status: 400 }
      )
    }
    updateData.slug = trimmedSlug
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
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
  } catch (err: any) {
    if (err?.code === 'P2002' && err?.meta?.target?.includes('slug')) {
      return NextResponse.json({ error: 'Este slug ya existe' }, { status: 409 })
    }

    console.error('[teams-update]', err)
    return NextResponse.json({ error: 'Error actualizando equipo' }, { status: 500 })
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
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
    return NextResponse.json(
      { error: 'No tienes permisos para eliminar este equipo' },
      { status: 403 }
    )
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
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
  } catch (err: any) {
    console.error('[teams-delete]', err)
    return NextResponse.json({ error: 'Error eliminando equipo' }, { status: 500 })
  }
}
