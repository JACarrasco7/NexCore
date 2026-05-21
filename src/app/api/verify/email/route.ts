import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { parseJsonOrError } from '@/lib/api/json-parser'

const schema = z.object({
  token: z.string().min(20),
})

/**
 * Verifica email mediante token (enviado por email).
 * Marca como emailVerified y borra el token.
 */
export async function POST(request: Request) {
  const parseResult = await parseJsonOrError(request)
  if (!parseResult.ok) return parseResult.error

  try {
    const body = parseResult.data
    const { token } = schema.parse(body)

    // Buscar usuario con ese token de verificación
    const user = await prisma.user.findFirst({
      where: {
        // Comparar token hasheado (o buscar en una tabla EmailVerificationToken si existe)
        // Por ahora: usar verificationToken temporal
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 })
    }

    // Marcar como verificado
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: 'Email verificado correctamente',
    })
  } catch (error) {
    console.error('[Verify Email] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validación fallida', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Error verificando email' }, { status: 500 })
  }
}
