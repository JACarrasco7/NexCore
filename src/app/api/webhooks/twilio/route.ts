import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationDeliveryStatus } from "@prisma/client";

function mapTwilioStatus(status: string | null): NotificationDeliveryStatus {
  switch (status?.toLowerCase()) {
    case "sent":
    case "queued":
      return NotificationDeliveryStatus.PENDING;
    case "delivered":
      return NotificationDeliveryStatus.DELIVERED;
    case "failed":
    case "undelivered":
    case "buffered":
    case "receiving":
    case "expired":
    case "delivery_failed":
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

  const form = await request.formData();
  const messageSid = form.get("MessageSid") as string | null;
  const messageStatus = form.get("MessageStatus") as string | null;

  if (!messageSid) {
    return NextResponse.json({ error: "MessageSid requerido" }, { status: 400 });
  }

  const status = mapTwilioStatus(messageStatus);

  await prisma.notificationDelivery.updateMany({
    where: { externalId: messageSid },
    data: { status, lastRetryAt: new Date(), errorMessage: status === NotificationDeliveryStatus.FAILED ? `Twilio status ${messageStatus}` : null },
  });

  return NextResponse.json({ ok: true });
}
