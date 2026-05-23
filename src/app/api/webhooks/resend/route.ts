import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationDeliveryStatus } from "@prisma/client";
import { parseJsonOrError } from "@/lib/api/json-parser";
import { badRequest } from "@/lib/api/error-response";
import type { ResendWebhookPayload } from "@/types/webhooks";

function mapResendEvent(event: string | null): NotificationDeliveryStatus {
  switch (event?.toLowerCase()) {
    case "queued":
    case "sending":
      return NotificationDeliveryStatus.PENDING;
    case "delivered":
      return NotificationDeliveryStatus.DELIVERED;
    case "failed":
    case "bounced":
      return NotificationDeliveryStatus.FAILED;
    default:
      return NotificationDeliveryStatus.PENDING;
  }
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.WEBHOOK_SECRET ?? process.env.CRON_SECRET;
  const secret = request.headers.get("x-webhook-secret");
  if (!secretKey || !secret || secret !== secretKey) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const body = parsed.data as ResendWebhookPayload
  const event = (body.event as string | null) ?? null;
  const messageId = body?.message?.id ?? body?.id ?? null;

  if (!messageId) {
    return badRequest("message.id requerido");
  }

  const status = mapResendEvent(event);

  await prisma.notificationDelivery.updateMany({
    where: { externalId: messageId },
    data: { status, lastRetryAt: new Date(), errorMessage: status === NotificationDeliveryStatus.FAILED ? `Resend event ${event}` : null },
  });

  return NextResponse.json({ ok: true });
}
