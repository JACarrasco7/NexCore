import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, forbidden, badRequest, notFound } from '@/lib/api/error-response'

export const dynamic = 'force-dynamic'

// PATCH — Cambiar rol del coach en el equipo
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params
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
  const { teamId, newRole } = parsed.data as any

  if (!teamId || !newRole) {
    return badRequest('teamId y newRole requeridos')
  }

  if (!['ADMIN', 'MEMBER'].includes(newRole)) {
    return badRequest('newRole debe ser ADMIN o MEMBER')
  }

  // Solo ADMIN puede cambiar roles, o COACH que es ADMIN de su equipo
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

    // Un coach ADMIN no puede demotarse a sí mismo si es el único admin
    if (userId === session.user.id && newRole === 'MEMBER') {
      const adminCount = await prisma.teamUserMembership.count({
        where: { teamId, role: 'ADMIN', isActive: true },
      })
      if (adminCount === 1) {
        return NextResponse.json(
          { error: 'Debe haber al menos un admin en el equipo' },
          { status: 400 }
        )
      }
    }
  }

  // Verificar que el coach existe en el equipo
  const membership = await prisma.teamUserMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
  })

  if (!membership) {
    return notFound('Coach no encontrado en el equipo')
  }

  // Actualizar rol
  const updated = await prisma.teamUserMembership.update({
    where: { teamId_userId: { teamId, userId } },
    data: { role: newRole },
  })

  return NextResponse.json({ updated, ok: true })
}

// DELETE — Remover coach del equipo
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized('No autorizado')
  }

  const role = (session.user as { role?: string }).role ?? 'ATHLETE'
  if (role !== 'COACH' && role !== 'ADMIN') {
    return forbidden('Sin acceso')
  }

  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')

  if (!teamId) {
    return badRequest('teamId requerido')
  }

  // Solo ADMIN puede remover, o COACH que es ADMIN de su equipo
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

    // Un coach no puede removerse a sí mismo si es el único admin
    if (userId === session.user.id) {
      const adminCount = await prisma.teamUserMembership.count({
        where: { teamId, role: 'ADMIN', isActive: true },
      })
      if (adminCount === 1) {
        return NextResponse.json(
          { error: 'Debe haber al menos un admin en el equipo' },
          { status: 400 }
        )
      }
    }
  }

  // Verificar que existe
  const membership = await prisma.teamUserMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
  })

  if (!membership) {
    return notFound('Coach no encontrado en el equipo')
  }

  // Marcar como inactivo (soft delete)
  await prisma.teamUserMembership.update({
    where: { teamId_userId: { teamId, userId } },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}
