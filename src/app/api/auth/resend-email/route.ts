import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

const TOKEN_TTL_HOURS = 24

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)

    // Limpiar tokens anteriores
    await prisma.verificationToken.deleteMany({
      where: { identifier: session.user.email },
    })

    // Crear nuevo token
    await prisma.verificationToken.create({
      data: { identifier: session.user.email, token, expires },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(session.user.email)}`

    console.log('[resend-email] Enviando a:', session.user.email)
    console.log('[resend-email] URL:', verifyUrl)

    try {
      await sendEmail({
        to: session.user.email,
        subject: 'Verifica tu email — NEXUM',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#1a1a1a">Verificación de email</h2>
            <p style="color:#555">Haz clic en el enlace para verificar tu email. El enlace expira en ${TOKEN_TTL_HOURS} horas.</p>
            <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:9999px;text-decoration:none;font-weight:600">
              Verificar email
            </a>
            <p style="color:#aaa;font-size:12px">Si no solicitaste esto, ignora este mensaje.</p>
          </div>
        `,
      })
      console.log('[resend-email] ✅ Email enviado exitosamente')
    } catch (emailErr) {
      console.error('[resend-email] ❌ Error enviando email:', emailErr)
      throw emailErr
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Correo reenviado',
        verifyUrl: process.env.NODE_ENV === 'development' ? verifyUrl : undefined,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[resend-email] Error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Error al reenviar correo',
        details: process.env.NODE_ENV === 'development' ? String(err) : undefined,
      },
      { status: 500 }
    )
  }
}
