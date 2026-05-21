/**
 * POST /api/auth/otp/validate
 * Validate OTP code and prepare for next step (login or signature).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateOtp } from '@/lib/otp'
import { checkRateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { OtpType } from '@prisma/client'
import { parseJsonOrError } from '@/lib/api/json-parser'

const validateSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Código debe ser 6 dígitos'),
  type: z.enum(['LOGIN', 'SIGNATURE', 'RESET']).default('LOGIN'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 validation attempts per IP per 5 minutes (to prevent brute force)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    const limiter = await checkRateLimit('otp-validate:' + ip, 10, 300)
    if (!limiter.ok) {
      return NextResponse.json(
        { error: 'Demasiados intentos fallidos. Intenta de nuevo más tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((limiter.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const parseResult = await parseJsonOrError(request)
    if (!parseResult.ok) return parseResult.error
    const body = parseResult.data as any // Already validated by parseJsonOrError
    const parsed = validateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { email, code, type } = parsed.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Validate OTP
    const result = await validateOtp(user.id, code, type as OtpType)

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          attemptsLeft: result.attemptsLeft,
          error: result.error,
        },
        { status: 400 }
      )
    }

    // OTP is valid! Prepare response based on type
    let nextStep = ''

    switch (type) {
      case 'LOGIN':
        // User can now proceed to create session
        nextStep = 'proceed-to-login'
        break
      case 'SIGNATURE':
        // User can now proceed to sign document
        nextStep = 'proceed-to-signature'
        break
      case 'RESET':
        // User can now reset password
        nextStep = 'proceed-to-reset'
        break
    }

    return NextResponse.json({
      valid: true,
      nextStep,
      userId: user.id,
      email: user.email,
      role: user.role,
      message: 'Código verificado correctamente',
    })
  } catch (err) {
    console.error('[auth/otp/validate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
