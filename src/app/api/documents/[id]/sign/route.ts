import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { validateOtp } from '@/lib/otp'
import { signDocument } from '@/lib/signature'
import { prisma } from '@/lib/prisma'
import { OtpType } from '@prisma/client'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { badRequest, unauthorized, forbidden, serverError } from '@/lib/api/error-response'
import { z } from 'zod'

const signDocumentSchema = z
  .object({
    otp: z.string().regex(/^\d{6}$/, 'OTP inválido'),
    dni: z.string().min(4, 'DNI inválido'),
    checkboxAccepted: z.boolean(),
  })
  .refine((data) => data.checkboxAccepted === true, {
    message: 'Debes aceptar el acuerdo legal',
    path: ['checkboxAccepted'],
  })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return unauthorized('No autorizado')
  }

  const { id } = await params
  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error

  const validated = signDocumentSchema.safeParse(parsed.data)
  if (!validated.success) {
    return badRequest(validated.error.issues[0].message)
  }

  const { otp, dni } = validated.data
  const untrustedUser = session.user
  const userId = untrustedUser.id as string

  const athlete = await prisma.athlete.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!athlete) {
    return forbidden('Solo atletas pueden firmar este documento')
  }

  const validation = await validateOtp(userId, otp, OtpType.SIGNATURE)
  if (!validation.valid) {
    return NextResponse.json(
      { valid: false, error: validation.error, attemptsLeft: validation.attemptsLeft },
      { status: 400 }
    )
  }

  try {
    const signed = await signDocument({
      documentId: id,
      athleteId: athlete.id,
      userId,
      signerName: session.user.name ?? session.user.email ?? 'Atleta',
      dni,
      ipAddress:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        null,
      userAgent: request.headers.get('user-agent') ?? null,
    })

    return NextResponse.json({ ok: true, signedUrl: signed.signedUrl, signature: signed.signature })
  } catch (error) {
    console.error('[documents/[id]/sign]', error)
    return serverError((error as Error).message ?? 'Error interno')
  }
}
