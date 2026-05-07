import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationDeliveryStatus } from "@prisma/client";

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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const event = body?.event ?? body?.type ?? null;
  const notificationId = body?.id ?? body?.notification_id ?? null;

  if (!notificationId) {
    return NextResponse.json({ error: "notification id requerido" }, { status: 400 });
  }

  const status = mapOneSignalEvent(event);

  await prisma.notificationDelivery.updateMany({
    where: { externalId: notificationId },
    data: { status, lastRetryAt: new Date(), errorMessage: status === NotificationDeliveryStatus.FAILED ? `OneSignal event ${event}` : null },
  });

  return NextResponse.json({ ok: true });
}
