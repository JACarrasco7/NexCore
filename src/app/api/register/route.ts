import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { sendSms } from '@/lib/sms'
import { checkRateLimit } from '@/lib/rate-limit'
import { Role, OtpType } from '@prisma/client'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { registerSchema } from '@/lib/validators'

const TOKEN_TTL_HOURS = 24

export async function POST(request: NextRequest) {
  // Rate limit: 5 register attempts per IP per 15 minutes
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  const limiter = await checkRateLimit('register:' + ip, 5, 900)
  if (!limiter.ok) {
    return NextResponse.json(
      { error: 'Demasiados intentos de registro. Intenta de nuevo en unos minutos.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((limiter.resetAt - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  const result = await parseJsonOrError(request)
  if (!result.ok) return result.error

  const parsed = registerSchema.safeParse(result.data)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    )
  }
  const { email, password, name, phone, role, verificationMethod } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const userRole: Role = role === 'COACH' ? Role.COACH : Role.ATHLETE

  const user = await prisma.user.create({
    data: { email, name: name ?? email, passwordHash, role: userRole },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  // Si es coach, crear perfil Coach automáticamente
  if (userRole === Role.COACH) {
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 30) // 30 días desde hoy

    const coach = await prisma.coach.create({
      data: {
        userId: user.id,
        displayName: name ?? email,
        phone: phone?.trim() || null,
        trialEndsAt,
        // Email se verificará por enlace; teléfono se verificará después en onboarding
        phoneVerified: false,
      },
    })

    // Si Coach tiene teléfono, enviar OTP para verificación
    if (phone?.trim()) {
      try {
        const otp = Math.floor(Math.random() * 1000000)
          .toString()
          .padStart(6, '0')
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

        // Guardar OTP en BD
        await prisma.otpToken.create({
          data: {
            userId: user.id,
            code: otp,
            type: OtpType.VERIFICATION,
            expiresAt,
            attemptsLeft: 3,
          },
        })

        // Enviar SMS
        await sendSms({
          to: phone.trim(),
          message: `Tu código de verificación NEXUM es: ${otp}. Válido por 10 minutos.`,
        })

        console.log(`[register] OTP sent to Coach ${email} at ${phone}`)
      } catch (err) {
        console.error(`[register] Error sending Coach OTP:`, err)
        // No fallar el registro si hay error en SMS
      }
    }

    // Crear o encontrar Team para este Coach
    try {
      // Buscar si ya existe un Team para este Coach en TeamUserMembership
      let team = await prisma.team.findFirst({
        where: {
          userMemberships: {
            some: { userId: user.id, isActive: true },
          },
        },
      })

      // Si no existe, crear un nuevo Team
      if (!team) {
        const teamName = `${name ?? email} Team`
        team = await prisma.team.create({
          data: {
            name: teamName,
            slug: teamName.toLowerCase().replace(/\s+/g, '-'),
            settings: {
              create: {
                displayName: teamName,
                locale: 'es-ES',
                timezone: 'Europe/Madrid',
                currency: 'EUR',
              },
            },
          },
        })
        console.log(`[register] Nuevo Team creado: ${team.name}`)
      }

      // Agregar Coach a TeamUserMembership
      await prisma.teamUserMembership.upsert({
        where: { teamId_userId: { teamId: team.id, userId: user.id } },
        create: {
          teamId: team.id,
          userId: user.id,
          role: 'ADMIN', // El Coach que registra es admin de su propio equipo
          isActive: true,
        },
        update: { isActive: true },
      })

      console.log(`[register] Coach ${email} agregado a Team: ${team.name}`)
    } catch (teamErr) {
      console.error(`[register] Error agregando Coach a Team:`, teamErr)
      // No fallar el registro si hay error en Team
    }
  }

  // Para ATHLETE: guardar método de verificación (se usará en onboarding)
  if (userRole === Role.ATHLETE && verificationMethod === 'SMS') {
    // Enviar OTP para verificación de teléfono en SMS mode
    if (phone?.trim()) {
      try {
        const otp = Math.floor(Math.random() * 1000000)
          .toString()
          .padStart(6, '0')
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

        // Guardar OTP en BD
        await prisma.otpToken.create({
          data: {
            userId: user.id,
            code: otp,
            type: OtpType.VERIFICATION,
            expiresAt,
            attemptsLeft: 3,
          },
        })

        // Enviar SMS
        await sendSms({
          to: phone.trim(),
          message: `Tu código de verificación NEXUM es: ${otp}. Válido por 10 minutos.`,
        })

        console.log(`[register] OTP sent to Athlete ${email} at ${phone}`)
      } catch (err) {
        console.error(`[register] Error sending Athlete OTP:`, err)
        // No fallar el registro si hay error en SMS
      }
    }
  }

  console.log(`[register] Athlete registered with ${verificationMethod} verification method`)

  // Auto-send verification email
  try {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)

    await prisma.verificationToken.create({
      data: { identifier: user.email, token, expires },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`

    console.log(`[register] Email verification URL: ${verifyUrl}`)

    await sendEmail({
      to: user.email,
      subject: 'Verifica tu email — NEXUM',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1a1a1a">Bienvenido a NEXUM</h2>
          <p style="color:#555">Tu cuenta está lista. Haz clic en el enlace para verificar tu email. El enlace expira en ${TOKEN_TTL_HOURS} horas.</p>
          <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:9999px;text-decoration:none;font-weight:600">
            Verificar email
          </a>
          <p style="color:#aaa;font-size:12px">Si no solicitaste esto, ignora este mensaje.</p>
        </div>
      `,
    })
    console.log(`[register] ✅ Verification email sent to ${user.email}`)
  } catch (err) {
    console.error(
      `[register] ❌ Failed to send verification email:`,
      err instanceof Error ? err.message : String(err)
    )
    // Don't fail registration, just log the error
  }

  return NextResponse.json(user, { status: 201 })
}
