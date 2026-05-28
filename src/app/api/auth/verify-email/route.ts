import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEmailSchema } from '@/lib/validators'

// GET /api/auth/verify-email?token=...&email=...
// POST /api/auth/verify-email { token, email }
async function verifyEmail(token: string, email: string, req: NextRequest) {
  if (!token || !email) {
    const redirectUrl = new URL('/verify-email', req.url)
    redirectUrl.searchParams.set('error', 'missing')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    const record = await prisma.verificationToken.findFirst({
      where: { token, identifier: email },
    })

    if (!record) {
      const redirectUrl = new URL('/verify-email', req.url)
      redirectUrl.searchParams.set('error', 'invalid')
      return NextResponse.redirect(redirectUrl)
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } })
      const redirectUrl = new URL('/verify-email', req.url)
      redirectUrl.searchParams.set('error', 'expired')
      return NextResponse.redirect(redirectUrl)
    }

    // Marcar email como verificado
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    })

    await prisma.verificationToken.delete({ where: { token } })

    // Redirigir a onboarding
    return NextResponse.redirect(new URL('/onboarding', req.url))
  } catch (err) {
    console.error('[verify-email] Error:', err)
    const redirectUrl = new URL('/verify-email', req.url)
    redirectUrl.searchParams.set('error', 'server')
    return NextResponse.redirect(redirectUrl)
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  return verifyEmail(token || '', email || '', req)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const parsed = verifyEmailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { token, email } = parsed.data

    const record = await prisma.verificationToken.findFirst({
      where: { token, identifier: email },
    })

    if (!record) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } })
      return NextResponse.json({ error: 'Token expirado' }, { status: 410 })
    }

    // Marcar email como verificado
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    })

    await prisma.verificationToken.delete({ where: { token } })

    console.log(`[verify-email] ✅ Email verified: ${email}`)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[verify-email] Error:', err)
    return NextResponse.json({ error: 'Error al verificar email' }, { status: 500 })
  }
}
