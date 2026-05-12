/**
 * POST /api/auth/otp/generate
 * Generate and send OTP to user for login or signature.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateOtp } from '@/lib/otp'
import { checkRateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { OtpType } from '@prisma/client'

const generateSchema = z.object({
  email: z.string().email(),
  type: z.enum(['LOGIN', 'SIGNATURE', 'RESET']).default('LOGIN'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 OTP generation attempts per IP per 10 minutes (to prevent login spam)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    const limiter = await checkRateLimit('otp-gen:' + ip, 10, 600)
    if (!limiter.ok) {
      return NextResponse.json(
        {
          ok: false,
          hint: 'Demasiados intentos. Intenta de nuevo en unos minutos.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((limiter.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const body = await request.json()
    const parsed = generateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { email, type } = parsed.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })

    if (!user) {
      // Don't reveal if email exists (security)
      return NextResponse.json({
        ok: true,
        hint: 'Si la cuenta existe, recibirás un código por email',
      })
    }

    // Generate OTP
    const result = await generateOtp(user.id, type as OtpType, {
      type: 'email',
      value: user.email,
    })

    // Extract client IP for rate limiting / audit purposes
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'

    return NextResponse.json({
      ok: true,
      code: result.code,
      expiresAt: result.expiresAt,
      attemptsLeft: result.attemptsLeft,
      hint: result.hint,
    })
  } catch (err) {
    console.error('[auth/otp/generate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
