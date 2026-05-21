import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export type UserRole = 'COACH' | 'ATHLETE' | 'ADMIN'

/**
 * Validar que el usuario autenticado tiene un rol específico (server-side)
 * No debe confiar solo en JWT — verifica en BD si es necesario
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<{
  user: { id: string; email: string; role: UserRole } | null
  response: NextResponse | null
}> {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const userRole = (session.user as { role?: string }).role as UserRole | undefined

  if (!userRole || !allowedRoles.includes(userRole)) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email || '',
      role: userRole,
    },
    response: null,
  }
}

/**
 * Validar que un athlete pertenece a una relación válida con el coach
 * Para evitar que un coach acceda a athletes de otro coach
 */
export async function validateCoachAthleteRelation(
  coachId: string,
  athleteId: string
): Promise<boolean> {
  const relation = await prisma.athlete.findFirst({
    where: {
      id: athleteId,
      coach: { userId: coachId },
    },
    select: { id: true },
  })

  return Boolean(relation)
}

/**
 * Validar que un usuario tiene acceso a un team
 */
export async function validateTeamAccess(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamUserMembership.findFirst({
    where: {
      userId,
      teamId,
    },
    select: { id: true },
  })

  return Boolean(membership)
}

/**
 * Helper para responder con error de validación
 */
export function validationError(message: string, statusCode = 400) {
  return NextResponse.json({ error: message }, { status: statusCode })
}
