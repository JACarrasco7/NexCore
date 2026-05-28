import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NotificationDeliveryStatus } from '@prisma/client'
import { parseJsonOrError } from '@/lib/api/json-parser'
import { forbidden, badRequest } from '@/lib/api/error-response'
import { onesignalWebhookSchema } from '@/lib/validators'

function mapOneSignalEvent(event: string | null): NotificationDeliveryStatus {
  switch (event?.toLowerCase()) {
    case 'delivered':
    case 'successful':
      return NotificationDeliveryStatus.DELIVERED
    case 'failed':
    case 'error':
    case 'timeout':
      return NotificationDeliveryStatus.FAILED
    default:
      return NotificationDeliveryStatus.PENDING
  }
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.WEBHOOK_SECRET ?? process.env.CRON_SECRET
  const secret = request.headers.get('x-webhook-secret')
  if (!secretKey || !secret || secret !== secretKey) {
    return forbidden('Forbidden')
  }

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error

  const validated = onesignalWebhookSchema.safeParse(parsed.data)
  if (!validated.success) {
    return badRequest(validated.error.issues[0].message)
  }

  const { event, data } = validated.data
  const notificationId = data?.id ?? data?.notification_id ?? null

  if (!notificationId) {
    return badRequest('notification id requerido')
  }

  const status = mapOneSignalEvent(event)

  await prisma.notificationDelivery.updateMany({
    where: { externalId: notificationId },
    data: {
      status,
      lastRetryAt: new Date(),
      errorMessage:
        status === NotificationDeliveryStatus.FAILED ? `OneSignal event ${event}` : null,
    },
  })

  return NextResponse.json({ ok: true })
}
