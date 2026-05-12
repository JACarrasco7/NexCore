import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { generateSecret } from '@/lib/totp'
import qrcode from 'qrcode'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const email = session.user.email ?? session.user.id
    const { secret, otpauth } = generateSecret(String(email), 'NEXUM')

    // store pending secret server-side with short TTL (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { pendingTotpSecret: secret, pendingTotpExpiresAt: expiresAt },
    })

    const qr = await qrcode.toDataURL(otpauth)

    // Return otpauth + qr only; secret stored server-side
    return NextResponse.json({ otpauth, qr })
  } catch (err) {
    console.error('[api/2fa/setup]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
