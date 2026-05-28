import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyToken, verifyBackupCode } from '@/lib/totp'
import { checkRateLimit, getClientIp, getRateLimitKey, LIMITS } from '@/lib/rate-limit'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { z } from 'zod'

const totpDisableSchema = z
  .object({
    token: z.string().length(6, 'Token debe tener 6 dígitos').optional(),
    backupCode: z.string().min(1, 'Backup code requerido').optional(),
  })
  .refine((data) => data.token || data.backupCode, { message: 'Token o backupCode requerido' })

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // rate limit
    const clientIp = getClientIp(request.headers)
    const key = getRateLimitKey(clientIp, session.user.id)
    const rl = await checkRateLimit(key, LIMITS.OTP.maxRequests, LIMITS.OTP.windowSeconds)
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const parseResult = await parseJsonOrError(request)
    if (!parseResult.ok) return parseResult.error

    const validated = totpDisableSchema.safeParse(parseResult.data)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 })
    }

    const { token, backupCode } = validated.data

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { totpSecret: true, backupCodes: true },
    })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    let ok = false
    let usedBackupIndex = -1

    if (token && user.totpSecret) {
      ok = await verifyToken(user.totpSecret, String(token))
    }

    if (!ok && backupCode) {
      const res = await verifyBackupCode(
        user.backupCodes as string[] | null | undefined,
        String(backupCode)
      )
      ok = res.ok
      usedBackupIndex = res.index
    }

    if (!ok) return NextResponse.json({ error: 'Código inválido' }, { status: 400 })

    // Disable TOTP and remove secret; if backup code used, remove it
    const nextBackupCodes = Array.isArray(user.backupCodes) ? [...user.backupCodes] : null
    if (usedBackupIndex >= 0 && nextBackupCodes) {
      // remove used code
      nextBackupCodes.splice(usedBackupIndex, 1)
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { totpEnabled: false, totpSecret: null, backupCodes: nextBackupCodes as any },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/2fa/disable]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
