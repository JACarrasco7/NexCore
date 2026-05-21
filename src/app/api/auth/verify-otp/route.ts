import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, badRequest } from '@/lib/api/error-response'

export const dynamic = 'force-dynamic'

// POST — Verificar código OTP
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized('No autorizado')
  }

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const body = parsed.data as any
  const { code, type = 'VERIFICATION', phone } = body

  if (!code || !type) {
    return badRequest('code y type son requeridos')
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
    return unauthorized('Código inválido o expirado')
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
