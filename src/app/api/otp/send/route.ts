import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSms } from '@/lib/sms'
import { z } from 'zod'
import { auth } from '@/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { OtpType } from '@prisma/client'

const schema = z.object({
  phone: z.string().min(7).max(15),
  purpose: z.enum(['ATHLETE_VERIFICATION', 'COACH_PHONE_VERIFICATION']),
})

/**
 * Envía un OTP a un teléfono para verificación.
 * Usa Twilio para envío real, mock en dev.
 * Persiste OTP en BD para validación segura.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Rate limit: 5 OTP attempts per user per 5 minutes
    const limiter = await checkRateLimit('otp:' + session.user.id, 5, 300)
    if (!limiter.ok) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((limiter.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const body = await request.json()
    const { phone, purpose } = schema.parse(body)

    // Generar OTP (6 dígitos)
    const otp = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    console.log(`[OTP] Enviando a ${phone}: ${otp} (vence en 10 min)`)

    // Persistir OTP en BD
    await prisma.otpToken.create({
      data: {
        userId: session.user.id,
        code: otp,
        type: OtpType.VERIFICATION,
        expiresAt,
        attemptsLeft: 3,
      },
    })

    // Enviar vía Twilio
    try {
      await sendSms({
        to: phone,
        message: `Tu código de verificación NEXUM es: ${otp}. Válido por 10 minutos.`,
      })
    } catch (err) {
      console.error('[OTP] Error enviando SMS:', err)
      // En dev, continuar (mock funciona)
      if (process.env.NODE_ENV === 'production') {
        throw err
      }
    }

    // En dev: retornar OTP para testing
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        success: true,
        otp,
        expiresAt,
        message: 'OTP enviado (dev: mira la respuesta o logs)',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'OTP enviado al teléfono. Válido por 10 minutos.',
      expiresAt,
    })
  } catch (error) {
    console.error('[OTP] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validación fallida', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Error enviando OTP' }, { status: 500 })
  }
}
