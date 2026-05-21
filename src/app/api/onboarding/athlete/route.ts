import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Goal, Coach, VerificationMethod } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      fullName,
      goal,
      coachEmail,
      weightKg,
      phone,
      contactEmail,
      coachId,
      teamId,
      verificationMethod,
    } = await req.json()

    if (!fullName?.trim())
      return NextResponse.json({ error: 'fullName requerido' }, { status: 400 })

    // Atleta debe tener al menos email o teléfono para contacto
    if (!contactEmail?.trim() && !phone?.trim()) {
      return NextResponse.json(
        { error: 'Email o teléfono requerido para contacto' },
        { status: 400 }
      )
    }

    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    })
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { id: true, email: true },
      })
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Sesión desactualizada. Cierra sesión y vuelve a entrar.' },
        { status: 401 }
      )
    }

    let coach: Coach | null = null

    // 1. Si se envía coachId, usarlo directamente
    if (coachId?.trim()) {
      coach = await prisma.coach.findUnique({ where: { id: coachId } })
      if (!coach) {
        return NextResponse.json({ error: 'Coach no encontrado' }, { status: 404 })
      }
    }
    // 2. Si se envía coachEmail, buscar por email
    else if (coachEmail?.trim()) {
      const coachUser = await prisma.user.findUnique({
        where: { email: coachEmail.trim().toLowerCase() },
        select: { id: true, role: true },
      })
      if (!coachUser || coachUser.role !== 'COACH') {
        return NextResponse.json(
          { error: 'No se encontró un coach con ese email' },
          { status: 404 }
        )
      }

      coach = await prisma.coach.findUnique({ where: { userId: coachUser.id } })
      if (!coach) {
        // Crear coach profile si no existe (puede pasar tras seed manual)
        coach = await prisma.coach.create({
          data: {
            userId: coachUser.id,
            displayName: 'Coach',
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
          },
        })
      }
    } else {
      return NextResponse.json({ error: 'Coach requerido (coachId o coachEmail)' }, { status: 400 })
    }

    // Resolver teamId basado en las membresías del coach
    const coachMemberships = await prisma.teamUserMembership.findMany({
      where: { userId: coach.userId, isActive: true },
      select: { teamId: true },
      orderBy: { createdAt: 'asc' },
    })

    let resolvedTeamId: string | null = null

    if (coachMemberships.length === 0) {
      return NextResponse.json(
        {
          error: 'El coach no tiene equipos asignados. No se puede asignar un atleta.',
        },
        { status: 400 }
      )
    } else if (coachMemberships.length === 1) {
      // Si el coach tiene un solo equipo, usarlo automáticamente
      resolvedTeamId = coachMemberships[0].teamId
    } else {
      // Si el coach tiene múltiples equipos, se requiere teamId explícito
      if (!teamId) {
        return NextResponse.json(
          {
            error: 'El coach está en múltiples equipos. Se requiere teamId.',
            allowedTeams: coachMemberships.map((m) => m.teamId),
          },
          { status: 400 }
        )
      }

      // Validar que teamId es válido
      const validTeam = coachMemberships.find((m) => m.teamId === teamId)
      if (!validTeam) {
        return NextResponse.json(
          {
            error: 'El coach no es miembro del equipo especificado',
          },
          { status: 403 }
        )
      }

      resolvedTeamId = teamId
    }

    const existing = await prisma.athlete.findUnique({ where: { userId: user.id } })
    if (existing) {
      return NextResponse.json({ id: existing.id, alreadyExists: true })
    }

    const goalEnum: Goal =
      goal === 'DEFINICION'
        ? Goal.DEFINICION
        : goal === 'MANTENIMIENTO'
          ? Goal.MANTENIMIENTO
          : goal === 'PEAK_WEEK'
            ? Goal.PEAK_WEEK
            : Goal.VOLUMEN

    // Determinar método de verificación (default EMAIL)
    const verMethod: VerificationMethod =
      verificationMethod === 'SMS' ? VerificationMethod.SMS : VerificationMethod.EMAIL

    // Usar transacción para atomicidad: verificar coach, crear atleta, actualizar user
    const athlete = await prisma.$transaction(async (tx) => {
      // Re-validar que el coach sigue existiendo (prevenir race condition)
      const coachExists = await tx.coach.findUnique({
        where: { id: coach.id },
        select: { id: true },
      })
      if (!coachExists) {
        throw new Error('Coach no encontrado. Intenta nuevamente.')
      }

      // Re-validar que el atleta no existe aún
      const existingAthleteInTx = await tx.athlete.findUnique({ where: { userId: user.id } })
      if (existingAthleteInTx) {
        throw new Error('El perfil de atleta ya existe.')
      }

      const newAthlete = await tx.athlete.create({
        data: {
          userId: user.id,
          coachId: coach.id,
          teamId: resolvedTeamId,
          fullName: fullName.trim(),
          goal: goalEnum,
          phaseLabel: weightKg ? `Inicio — ${weightKg} kg` : 'Semana 1',
          phone: phone?.trim() || null,
          contactEmail: contactEmail?.trim() || null,
          verificationMethod: verMethod,
          phoneVerified: verificationMethod === 'SMS' ? true : false,
        },
      })

      await tx.user.update({
        where: { id: user.id },
        data: { name: fullName.trim() },
      })

      return newAthlete
    })

    return NextResponse.json(
      { id: athlete.id, coachId: coach.id, teamId: resolvedTeamId },
      { status: 201 }
    )
  } catch (error) {
    console.error('onboarding/athlete POST failed', error)
    return NextResponse.json(
      { error: 'Error interno al guardar onboarding de atleta' },
      { status: 500 }
    )
  }
}
