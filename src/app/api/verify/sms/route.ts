import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { auth } from '@/auth'
import { OtpType } from '@prisma/client'

const schema = z.object({
  otp: z.string().length(6),
  role: z.enum(['ATHLETE', 'COACH']).optional(),
})

/**
 * Verifica OTP para SMS (Atleta en registro o Coach en settings).
 * Automáticamente determina el role si no se especifica.
 * Marca phoneVerified en athlete/coach profile según corresponda.
 */
export async function POST(request: Request) {
  const parseResult = await parseJsonOrError(request)
  if (!parseResult.ok) return parseResult.error

  try {
    const body = parseResult.data
    const { otp, role: providedRole } = schema.parse(body)

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Validar OTP desde BD
    const otpRecord = await prisma.otpToken.findFirst({
      where: {
        userId: session.user.id,
        code: otp,
        type: OtpType.VERIFICATION,
        expiresAt: { gt: new Date() },
      },
    })

    if (!otpRecord) {
      return NextResponse.json({ error: 'OTP inválido o expirado' }, { status: 400 })
    }

    // Decrementar intentos
    if (otpRecord.attemptsLeft <= 1) {
      await prisma.otpToken.delete({ where: { id: otpRecord.id } })
      return NextResponse.json(
        { error: 'Demasiados intentos fallidos. Solicita uno nuevo.' },
        { status: 400 }
      )
    }

    if (otpRecord.attemptsLeft > 0) {
      await prisma.otpToken.update({
        where: { id: otpRecord.id },
        data: { attemptsLeft: otpRecord.attemptsLeft - 1 },
      })
    }

    // Determinar rol automáticamente si no se especifica
    let role = providedRole

    if (!role) {
      // Buscar si es athlete
      const athlete = await prisma.athlete.findUnique({
        where: { userId: session.user.id },
      })
      if (athlete) {
        role = 'ATHLETE'
      } else {
        // Buscar si es coach
        const coach = await prisma.coach.findUnique({
          where: { userId: session.user.id },
        })
        if (coach) {
          role = 'COACH'
        }
      }
    }

    if (role === 'ATHLETE') {
      // Marcar atleta como verificado
      const athlete = await prisma.athlete.findUnique({
        where: { userId: session.user.id },
      })

      if (!athlete) {
        return NextResponse.json({ error: 'Perfil de atleta no encontrado' }, { status: 404 })
      }

      await prisma.athlete.update({
        where: { id: athlete.id },
        data: { phoneVerified: true },
      })

      // Eliminar OTP usado
      await prisma.otpToken.delete({ where: { id: otpRecord.id } })

      console.log(`[verify-sms] ✅ Teléfono verificado para atleta ${session.user.id}`)

      return NextResponse.json({
        success: true,
        message: 'Teléfono verificado',
      })
    }

    if (role === 'COACH') {
      // Marcar coach como verificado
      const coach = await prisma.coach.findUnique({
        where: { userId: session.user.id },
      })

      if (!coach) {
        return NextResponse.json({ error: 'Perfil de coach no encontrado' }, { status: 404 })
      }

      await prisma.coach.update({
        where: { id: coach.id },
        data: {
          phoneVerified: true,
          phoneVerificationToken: null,
        },
      })

      // Eliminar OTP usado
      await prisma.otpToken.delete({ where: { id: otpRecord.id } })

      console.log(`[verify-sms] ✅ Teléfono verificado para coach ${session.user.id}`)

      return NextResponse.json({
        success: true,
        message: 'Teléfono verificado para facturación',
      })
    }

    return NextResponse.json({ error: 'No se pudo determinar el rol' }, { status: 400 })
  } catch (error) {
    console.error('[Verify SMS] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validación fallida', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Error verificando OTP' }, { status: 500 })
  }
}
