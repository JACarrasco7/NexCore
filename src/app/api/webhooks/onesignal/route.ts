import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationDeliveryStatus } from "@prisma/client";
import { parseJsonOrError } from '@/lib/api/json-parser'
import { forbidden, badRequest } from '@/lib/api/error-response'

function mapOneSignalEvent(event: string | null): NotificationDeliveryStatus {
  switch (event?.toLowerCase()) {
    case "delivered":
    case "successful":
      return NotificationDeliveryStatus.DELIVERED;
    case "failed":
    case "error":
    case "timeout":
      return NotificationDeliveryStatus.FAILED;
    default:
      return NotificationDeliveryStatus.PENDING;
  }
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.WEBHOOK_SECRET ?? process.env.CRON_SECRET;
  const secret = request.headers.get("x-webhook-secret");
  if (!secretKey || !secret || secret !== secretKey) {
    return forbidden('Forbidden')
  }

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const body = parsed.data as any
  const event = body?.event ?? body?.type ?? null;
  const notificationId = body?.id ?? body?.notification_id ?? null;

  if (!notificationId) {
    return badRequest('notification id requerido')
  }

  const status = mapOneSignalEvent(event);

  await prisma.notificationDelivery.updateMany({
    where: { externalId: notificationId },
    data: { status, lastRetryAt: new Date(), errorMessage: status === NotificationDeliveryStatus.FAILED ? `OneSignal event ${event}` : null },
  });

  return NextResponse.json({ ok: true });
}
