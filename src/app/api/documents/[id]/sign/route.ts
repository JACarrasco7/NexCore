import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { validateOtp } from '@/lib/otp'
import { signDocument } from '@/lib/signature'
import { prisma } from '@/lib/prisma'
import { OtpType } from '@prisma/client'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { badRequest, unauthorized, forbidden, serverError } from '@/lib/api/error-response'

const bodySchema = {
  otp: 'string',
  dni: 'string',
  checkboxAccepted: 'boolean',
}

function validateBody(body: any) {
  if (typeof body !== 'object' || body === null) return 'Cuerpo inválido'
  if (typeof body.otp !== 'string' || !/^\d{6}$/.test(body.otp)) return 'OTP inválido'
  if (typeof body.dni !== 'string' || body.dni.trim().length < 4) return 'DNI inválido'
  if (body.checkboxAccepted !== true) return 'Debes aceptar el acuerdo legal'
  return null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return unauthorized('No autorizado')
  }

  const { id } = await params
  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const body = parsed.data as any
  const errorMessage = validateBody(body)
  if (errorMessage) {
    return badRequest(errorMessage)
  }

  const { otp, dni } = body as { otp: string; dni: string; checkboxAccepted: boolean }
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
