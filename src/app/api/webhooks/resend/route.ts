import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationDeliveryStatus } from "@prisma/client";

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

  const body = await request.json().catch(() => ({}));
  const event = (body.event as string | null) ?? null;
  const messageId = body?.message?.id ?? body?.id ?? null;

  if (!messageId) {
    return NextResponse.json({ error: "message.id requerido" }, { status: 400 });
  }

  const status = mapResendEvent(event);

  await prisma.notificationDelivery.updateMany({
    where: { externalId: messageId },
    data: { status, lastRetryAt: new Date(), errorMessage: status === NotificationDeliveryStatus.FAILED ? `Resend event ${event}` : null },
  });

  return NextResponse.json({ ok: true });
}
