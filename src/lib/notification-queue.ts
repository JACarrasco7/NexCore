import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendPush } from "@/lib/push";
import { sendSms } from "@/lib/sms";
import { NotificationChannel, NotificationDeliveryStatus } from "@prisma/client";

const MAX_RETRIES = 3;
const RETRY_DELAY_SECONDS = 60;

async function updateDeliveryStatus(id: string, status: NotificationDeliveryStatus, externalId?: string | null, errorMessage?: string | null) {
  await prisma.notificationDelivery.update({
    where: { id },
    data: {
      status,
      externalId,
      errorMessage,
      lastRetryAt: new Date(),
      retriesAttempted: { increment: 1 },
    },
  });
}

export async function processPendingNotificationDeliveries() {
  const deliveries = await prisma.notificationDelivery.findMany({
    where: {
      status: { in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.FAILED] },
      retriesAttempted: { lt: MAX_RETRIES },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    include: {
      notification: {
        include: {
          user: {
            select: {
              email: true,
              coachProfile: { select: { phone: true } },
              athleteProfile: { select: { phone: true } },
            },
          },
        },
      },
    },
  });

  const processed: Array<{ id: string; status: NotificationDeliveryStatus }> = [];

  for (const delivery of deliveries) {
    const shouldRetry =
      delivery.status === NotificationDeliveryStatus.PENDING ||
      (delivery.status === NotificationDeliveryStatus.FAILED && delivery.lastRetryAt &&
        (Date.now() - delivery.lastRetryAt.getTime()) / 1000 >= RETRY_DELAY_SECONDS);

    if (!shouldRetry) continue;

    try {
      let externalId: string | null = null;

      const user = delivery.notification.user;
      const phone = user?.coachProfile?.phone ?? user?.athleteProfile?.phone ?? null;

      switch (delivery.channel) {
        case NotificationChannel.EMAIL:
          if (!user?.email) throw new Error("Email no disponible para el usuario");
          externalId = await sendEmail({
            to: user.email,
            subject: delivery.notification.title,
            html: delivery.notification.body ?? delivery.notification.title,
          });
          break;
        case NotificationChannel.PUSH:
          externalId = await sendPush({
            userId: delivery.notification.userId,
            title: delivery.notification.title,
            body: delivery.notification.body ?? undefined,
            link: delivery.notification.link ?? undefined,
          });
          break;
        case NotificationChannel.SMS:
          if (!phone) throw new Error("Teléfono no disponible para el usuario");
          externalId = await sendSms({
            to: phone,
            message: `${delivery.notification.title}: ${delivery.notification.body ?? ""}`.slice(0, 300),
          });
          break;
        default:
          throw new Error(`Unsupported channel ${delivery.channel}`);
      }

      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          externalId,
          lastRetryAt: new Date(),
          retriesAttempted: delivery.retriesAttempted + 1,
        },
      });
      processed.push({ id: delivery.id, status: NotificationDeliveryStatus.SENT });
    } catch (err) {
      console.error("[notification-queue] delivery error", delivery.id, err);
      const alreadyFailed = delivery.retriesAttempted + 1 >= MAX_RETRIES;
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: alreadyFailed ? NotificationDeliveryStatus.FAILED : NotificationDeliveryStatus.PENDING,
          errorMessage: (err as Error)?.message ?? "Unknown error",
          lastRetryAt: new Date(),
          retriesAttempted: delivery.retriesAttempted + 1,
        },
      });
      processed.push({ id: delivery.id, status: alreadyFailed ? NotificationDeliveryStatus.FAILED : NotificationDeliveryStatus.PENDING });
    }
  }

  return processed;
}
