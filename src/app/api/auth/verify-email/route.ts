import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const { token, email } = await req.json()

    if (!token || !email) {
      return NextResponse.json({ error: 'Token o email faltante' }, { status: 400 })
    }

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
