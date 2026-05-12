import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import twilio from 'twilio'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export const dynamic = 'force-dynamic'

function generateOtp(): string {
  return Math.random().toString().slice(2, 8) // 6 dígitos
}

// POST — Enviar código OTP
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { phone, type = 'VERIFICATION' } = body

  if (!phone) {
    return NextResponse.json({ error: 'phone es requerido' }, { status: 400 })
  }

  const validTypes = ['LOGIN', 'SIGNATURE', 'RESET', 'VERIFICATION']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'type inválido' }, { status: 400 })
  }

  // Generar OTP
  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  // Guardar en DB
  const otp = await prisma.otpToken.create({
    data: {
      userId: session.user.id,
      code,
      type: type as any,
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
    return NextResponse.json({ error: 'Error al enviar SMS' }, { status: 500 })
  }
}
