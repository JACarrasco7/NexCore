import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * Guard: Verifica que Coach esté verificado (email + teléfono).
 * Retorna error 403 si no está verificado.
 */
export async function requireCoachVerified() {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      error: true,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    }
  }

  const coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
    select: { id: true, phoneVerified: true },
  })

  if (!coach) {
    return {
      error: true,
      response: NextResponse.json({ error: 'Coach profile no encontrado' }, { status: 404 }),
    }
  }

  // Bloquear si teléfono no está verificado
  if (!coach.phoneVerified) {
    return {
      error: true,
      response: NextResponse.json(
        {
          error: 'Debes verificar tu teléfono primero',
          code: 'PHONE_NOT_VERIFIED',
          redirectTo: '/coach/settings/verify-phone',
        },
        { status: 403 }
      ),
    }
  }

  return { error: false, coach }
}

/**
 * Guard: Verifica que Athlete esté verificado (email o SMS según método).
 * Retorna error 403 si no está verificado.
 */
export async function requireAthleteVerified() {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      error: true,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    }
  }

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      verificationMethod: true,
      phoneVerified: true,
    },
  })

  if (!athlete) {
    return {
      error: true,
      response: NextResponse.json({ error: 'Athlete profile no encontrado' }, { status: 404 }),
    }
  }

  // Bloquear si SMS pero no verificado
  if (athlete.verificationMethod === 'SMS' && !athlete.phoneVerified) {
    return {
      error: true,
      response: NextResponse.json(
        {
          error: 'Debes verificar tu teléfono primero',
          code: 'PHONE_NOT_VERIFIED',
          redirectTo: '/athlete/verify-sms',
        },
        { status: 403 }
      ),
    }
  }

  // EMAIL se valida en auth.ts (emailVerified), pero agregamos check aquí también
  // por si acaso

  return { error: false, athlete }
}
