import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

// POST — Verificar código OTP
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { code, type = 'VERIFICATION', phone } = body

  if (!code || !type) {
    return NextResponse.json({ error: 'code y type son requeridos' }, { status: 400 })
  }

  // Buscar token activo
  const otp = await prisma.otpToken.findFirst({
    where: {
      userId: session.user.id,
      code,
      type: type as any,
      expiresAt: { gt: new Date() }, // No expirado
      usedAt: null, // No utilizado
    },
  })

  if (!otp) {
    return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 401 })
  }

  // Marcar como utilizado
  await prisma.otpToken.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  })

  // Si es VERIFICATION, actualizar coach profile
  if (type === 'VERIFICATION' && phone) {
    await prisma.coach
      .update({
        where: { userId: session.user.id },
        data: {
          phone,
          phoneVerified: true,
          phoneVerificationToken: null,
        },
      })
      .catch(() => {
        // Coach profile podría no existir, silenciar error
      })
  }

  return NextResponse.json({
    ok: true,
    message: 'Código verificado',
  })
}
