import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import twilio from 'twilio'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { badRequest, unauthorized, serverError, tooManyRequests } from '@/lib/api/error-response'
import { checkRateLimit, getClientIp, getRateLimitKey } from '@/lib/rate-limit'
import { z } from 'zod'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

const sendOtpSchema = z.object({
  phone: z.string().min(1, 'phone es requerido'),
  type: z.enum(['LOGIN', 'SIGNATURE', 'RESET', 'VERIFICATION']).optional().default('VERIFICATION'),
})

export const dynamic = 'force-dynamic'

function generateOtp(): string {
  return Math.random().toString().slice(2, 8) // 6 dígitos
}

// POST — Enviar código OTP
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized('No autorizado')
  }

  // Simple rate limit for OTP sending to avoid abuse
  const clientIp = getClientIp(request.headers)
  const rateLimitKey = getRateLimitKey(clientIp, session.user.id)
  const { ok } = await checkRateLimit(rateLimitKey, 3, 60) // 3 req/min per user
  if (!ok) return tooManyRequests()

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error

  const validated = sendOtpSchema.safeParse(parsed.data)
  if (!validated.success) {
    return badRequest(validated.error.issues[0].message)
  }

  const { phone, type } = validated.data

  // Generar OTP
  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  // Guardar en DB
  const otp = await prisma.otpToken.create({
    data: {
      userId: session.user.id,
      code,
      type,
      expiresAt,
      metadata: { phone }, // JSON para guardar el phone usado
    },
  })

  // Enviar vía Twilio
  try {
    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('TWILIO_PHONE_NUMBER no configurado')
    }

    await client.messages.create({
      body: `Tu código de verificación es: ${code}. Válido por 10 minutos.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    })

    return NextResponse.json({
      ok: true,
      tokenId: otp.id,
      message: 'Código enviado',
    })
  } catch (err) {
    // Si falla el envío de SMS, eliminar el token
    await prisma.otpToken.delete({ where: { id: otp.id } }).catch(() => {})

    console.error('SMS send failed:', err)
    return serverError('Error al enviar SMS')
  }
}
