import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assertAthleteAccess, requireSession } from '@/lib/api/auth-helpers'
import { AuthError, ForbiddenError } from '@/lib/api/errors'
import { parseJsonOrError } from '@/lib/api/json-parser'

type Params = { params: Promise<{ id: string }> }

function errorResponse(e: unknown) {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
  if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
  console.error(e)
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}

// GET /api/athletes/[id]/consent — último consentimiento válido del atleta
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await assertAthleteAccess(id)

    const consent = await prisma.athleteConsent.findFirst({
      where: { athleteId: id, isValid: true },
      orderBy: { acceptedAt: 'desc' },
      select: {
        id: true,
        version: true,
        acceptedAt: true,
        signatureRef: true,
        isValid: true,
        revokedAt: true,
      },
    })

    return NextResponse.json({ consent })
  } catch (e) {
    return errorResponse(e)
  }
}

// POST /api/athletes/[id]/consent — atleta acepta el contrato
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    // Solo el propio atleta (o admin) puede firmar
    const session = await assertAthleteAccess(id, { write: false })

    // Bloquear que coach firme en nombre del atleta
    if (session.role === 'COACH') {
      return NextResponse.json(
        { error: 'El coach no puede firmar en nombre del atleta' },
        { status: 403 }
      )
    }

    const parseResult = await parseJsonOrError(req)
    if (!parseResult.ok) return parseResult.error
    const body = parseResult.data as {
      signatureRef?: string
      version?: string
    }

    // Obtener plantilla del contrato (preferir TeamSettings, fallback Team)
    const athlete = await prisma.athlete.findUnique({
      where: { id },
      select: {
        team: {
          select: {
            contractTemplate: true,
            settings: { select: { contractTemplate: true, contractVersion: true } },
          },
        },
      },
    })

    const content =
      athlete?.team?.settings?.contractTemplate ??
      athlete?.team?.contractTemplate ??
      'Contrato estándar de NEXUM v1.0'
    const finalVersion = body.version ?? athlete?.team?.settings?.contractVersion ?? '1.0'

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null
    const userAgent = req.headers.get('user-agent') ?? null

    const consent = await prisma.athleteConsent.create({
      data: {
        athleteId: id,
        version: finalVersion,
        content,
        signatureRef: body.signatureRef ?? null,
        ipAddress: ip,
        userAgent,
      },
      select: {
        id: true,
        version: true,
        acceptedAt: true,
        isValid: true,
      },
    })

    return NextResponse.json({ consent }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}

// DELETE /api/athletes/[id]/consent — revocar consentimiento (admin/coach)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await requireSession()

    if (!['COACH', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parseResult = await parseJsonOrError(req)
    if (!parseResult.ok) return parseResult.error
    const { consentId } = parseResult.data as {
      consentId?: string
    }
    if (!consentId) {
      return NextResponse.json({ error: 'consentId requerido' }, { status: 400 })
    }

    await prisma.athleteConsent.update({
      where: { id: consentId, athleteId: id },
      data: { isValid: false, revokedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
