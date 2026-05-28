import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, badRequest } from '@/lib/api/error-response'
import { notificationMarkReadSchema } from '@/lib/validators'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized('No autenticado')

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error

  const validated = notificationMarkReadSchema.safeParse(parsed.data)
  if (!validated.success) {
    return badRequest(validated.error.issues[0].message)
  }

  const { ids } = validated.data
  const idList = Array.isArray(ids) ? ids.map(String) : [String(ids)]
  if (idList.length === 0) return badRequest('Sin ids')

  const result = await prisma.notification.updateMany({
    where: { id: { in: idList }, userId: session.user.id },
    data: { read: true },
  })

  return NextResponse.json({ updated: result.count })
}
