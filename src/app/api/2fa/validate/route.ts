import { NextRequest, NextResponse } from 'next/server'
import { auth, unstable_update } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyToken, verifyBackupCode } from '@/lib/totp'
import { getBackupCodesForUser, removeBackupCodeAtIndex } from '@/lib/backup-codes'
import { checkRateLimit, getClientIp, getRateLimitKey, LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // rate limit
    const clientIp = getClientIp(request.headers)
    const key = getRateLimitKey(clientIp, session.user.id)
    const rl = await checkRateLimit(key, LIMITS.OTP.maxRequests, LIMITS.OTP.windowSeconds)
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => ({}))
    const { token, backupCode } = body

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
      const hashed = await getBackupCodesForUser(session.user.id)
      const res = await verifyBackupCode(hashed as string[] | null | undefined, String(backupCode))
      ok = res.ok
      usedBackupIndex = res.index
    }

    if (!ok) return NextResponse.json({ error: 'Código inválido' }, { status: 400 })

    // If a backup code was used, remove it so it can't be reused
    if (usedBackupIndex >= 0) {
      await removeBackupCodeAtIndex(session.user.id, usedBackupIndex)
    }

    // mark session/token as totpVerified
    try {
      // Cast to any because NextAuth types may not include custom fields
      await unstable_update({ user: { id: session.user.id, totpVerified: true } } as any)
    } catch (e) {
      console.warn('unstable_update failed', e)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/2fa/validate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
